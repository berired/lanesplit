import { ValidationError } from "@/lib/errors/app-error";
import type { NormalizedStatRow, StatsProvider } from "./stats-provider";

/**
 * Oracle's Elixir (https://oracleselixir.com) is a community-maintained esports
 * stats dataset distributed as per-split CSV downloads — there is no official,
 * live API. Because of that, this "provider" is NOT polled like a normal
 * StatsProvider: the real entry point is `parseOraclesElixirCsv`, invoked
 * synchronously by the commissioner-triggered CSV upload endpoint
 * (`app/api/admin/stats-ingest/route.ts`). The `StatsProvider` object below
 * exists only so this module conforms to the shared interface for anything that
 * wants to treat providers uniformly; its `fetchRawStats` always throws since
 * there is nothing to "fetch" — data only arrives via file upload.
 */

/** Minimal, dependency-free CSV parser. Handles quoted fields, escaped quotes ("") and commas within quotes. */
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalize line endings so \r\n and \r don't produce stray blank rows.
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  // Flush the last field/row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** Known column-name aliases per field, lowercased. Oracle's Elixir has renamed columns across splits. */
const COLUMN_ALIASES: Record<string, string[]> = {
  key: ["playername", "playerid", "player"],
  gameId: ["gameid", "game id"],
  date: ["date", "gamedate", "game date"],
  kills: ["kills", "k"],
  deaths: ["deaths", "d"],
  assists: ["assists", "a"],
  cs: ["total cs", "totalcs", "total_cs", "cs"],
  visionScore: ["visionscore", "vision score", "vision_score"],
  win: ["result", "win"],
  // Optional: present in every real Oracle's Elixir export, but not required —
  // older/partial files without it just don't get champion-mode rows emitted.
  champion: ["champion", "championname", "champ"],
};

/**
 * Riot's internal champion keys don't follow a single clean rule from the display
 * name (Kha'Zix -> Khazix, Kai'Sa -> KaiSa, Vel'Koz -> Velkoz — case is inconsistent).
 * Rather than guess the exact casing, strip punctuation/whitespace and compare
 * case-insensitively against both Champion.riotKey and Champion.name in ingest.ts.
 */
export function normalizeChampionKey(value: string): string {
  return value.replace(/['".]/g, "").replace(/\s+/g, "").toLowerCase();
}

function findColumn(header: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = header.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses an Oracle's Elixir CSV export into normalized stat rows.
 * Throws ValidationError if the required columns can't be found at all
 * (rather than silently producing garbage rows from a misidentified file).
 */
export function parseOraclesElixirCsv(csvText: string): NormalizedStatRow[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new ValidationError(
      "This CSV doesn't look like an Oracle's Elixir export — missing expected columns."
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());

  const columnIndex = {
    key: findColumn(header, COLUMN_ALIASES.key),
    gameId: findColumn(header, COLUMN_ALIASES.gameId),
    date: findColumn(header, COLUMN_ALIASES.date),
    kills: findColumn(header, COLUMN_ALIASES.kills),
    deaths: findColumn(header, COLUMN_ALIASES.deaths),
    assists: findColumn(header, COLUMN_ALIASES.assists),
    cs: findColumn(header, COLUMN_ALIASES.cs),
    visionScore: findColumn(header, COLUMN_ALIASES.visionScore),
    win: findColumn(header, COLUMN_ALIASES.win),
  };
  // Optional — absence doesn't fail the whole import, it just means no
  // champion-mode rows get emitted alongside the player-mode ones.
  const championColumnIndex = findColumn(header, COLUMN_ALIASES.champion);

  const missing = Object.entries(columnIndex)
    .filter(([, idx]) => idx === -1)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new ValidationError(
      "This CSV doesn't look like an Oracle's Elixir export — missing expected columns."
    );
  }

  const dataRows = rows.slice(1);
  const result: NormalizedStatRow[] = [];

  for (const raw of dataRows) {
    // Skip fully blank trailing rows.
    if (raw.every((cell) => cell.trim() === "")) continue;

    const key = raw[columnIndex.key]?.trim();
    const gameId = raw[columnIndex.gameId]?.trim();
    const dateStr = raw[columnIndex.date]?.trim();

    if (!key || !gameId || !dateStr) continue;

    const gameDate = new Date(dateStr);
    if (Number.isNaN(gameDate.getTime())) continue;

    const winRaw = raw[columnIndex.win]?.trim().toLowerCase();
    const win = winRaw === "1" || winRaw === "true" || winRaw === "win";

    const stats = {
      gameDate,
      kills: Number(raw[columnIndex.kills]) || 0,
      deaths: Number(raw[columnIndex.deaths]) || 0,
      assists: Number(raw[columnIndex.assists]) || 0,
      cs: Number(raw[columnIndex.cs]) || 0,
      visionScore: Number(raw[columnIndex.visionScore]) || 0,
      win,
      raw: Object.fromEntries(header.map((h, i) => [h, raw[i]])),
    };

    // Player-mode row (pro-player leagues).
    result.push({ externalGameId: gameId, externalKey: key, ...stats });

    // Champion-mode row, keyed by the champion this player picked in this game —
    // same underlying game stats, attributed to the champion instead of the player.
    // Emitted alongside the player row (not instead of it) so a single CSV upload
    // scores both game modes; this is purely additive and doesn't touch the Riot
    // provider, which remains available as a supplementary champion-stats source.
    if (championColumnIndex !== -1) {
      const championRaw = raw[championColumnIndex]?.trim();
      if (championRaw) {
        result.push({
          externalGameId: gameId,
          externalKey: normalizeChampionKey(championRaw),
          ...stats,
        });
      }
    }
  }

  return result;
}

export const oraclesElixirProvider: StatsProvider = {
  source: "ORACLES_ELIXIR",
  async fetchRawStats(): Promise<NormalizedStatRow[]> {
    throw new ValidationError(
      "Oracle's Elixir has no live API — upload a CSV export via the stats import endpoint instead."
    );
  },
};
