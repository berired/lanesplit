import { prisma } from "@/lib/db/prisma";
import type { NormalizedStatRow } from "@/lib/stats/providers/stats-provider";
import { normalizeChampionKey } from "@/lib/stats/providers/oracles-elixir-provider";

export interface IngestResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const MAX_EXAMPLE_KEYS = 5;

/**
 * Resolves a batch of externalKeys to Draftable ids. Pro-player keys are our own
 * synthetic externalRefId, matched exactly. Champion keys come from free-text CSV
 * columns or the Riot API and don't follow one consistent casing (Kha'Zix ->
 * Khazix, Kai'Sa -> KaiSa, ...), so champions are matched case-insensitively
 * against both riotKey and name after stripping punctuation/whitespace. The
 * Champion table is small (~100s of rows), so fetching it whole and matching in
 * memory is cheaper and more robust than trying to build an exact `in` filter.
 */
async function resolveDraftableIds(externalKeys: string[]): Promise<Map<string, string>> {
  const keys = [...new Set(externalKeys)];

  const [proPlayers, champions] = await Promise.all([
    prisma.proPlayer.findMany({
      where: { externalRefId: { in: keys } },
      select: { externalRefId: true, draftable: { select: { id: true } } },
    }),
    prisma.champion.findMany({
      select: { riotKey: true, name: true, draftable: { select: { id: true } } },
    }),
  ]);

  const resolved = new Map<string, string>();
  for (const p of proPlayers) {
    if (p.externalRefId && p.draftable) resolved.set(p.externalRefId, p.draftable.id);
  }

  const championByNormalizedKey = new Map<string, string>();
  for (const c of champions) {
    if (!c.draftable) continue;
    championByNormalizedKey.set(normalizeChampionKey(c.riotKey), c.draftable.id);
    championByNormalizedKey.set(normalizeChampionKey(c.name), c.draftable.id);
  }

  for (const key of keys) {
    if (resolved.has(key)) continue;
    const championDraftableId = championByNormalizedKey.get(normalizeChampionKey(key));
    if (championDraftableId) resolved.set(key, championDraftableId);
  }

  return resolved;
}

/**
 * Ingests normalized stat rows into RawStatEntry, idempotently (safe to re-run
 * the same batch — e.g. the same CSV re-uploaded, or the same cron tick twice —
 * without double-counting), tracked via a StatsImportJob row.
 */
export async function ingestNormalizedRows(
  rows: NormalizedStatRow[],
  source: "RIOT" | "ORACLES_ELIXIR"
): Promise<IngestResult> {
  const job = await prisma.statsImportJob.create({
    data: { source, status: "RUNNING" },
  });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const unresolvedKeys = new Set<string>();

  try {
    const draftableIdByKey = await resolveDraftableIds(rows.map((r) => r.externalKey));

    for (const row of rows) {
      const draftableId = draftableIdByKey.get(row.externalKey) ?? null;

      if (!draftableId) {
        skipped++;
        unresolvedKeys.add(row.externalKey);
        continue;
      }

      await prisma.rawStatEntry.upsert({
        where: {
          source_externalGameId_draftableId: {
            source,
            externalGameId: row.externalGameId,
            draftableId,
          },
        },
        create: {
          draftableId,
          source,
          externalGameId: row.externalGameId,
          gameDate: row.gameDate,
          kills: row.kills,
          deaths: row.deaths,
          assists: row.assists,
          cs: row.cs,
          visionScore: row.visionScore,
          win: row.win,
          rawJson: row.raw as never,
        },
        update: {
          gameDate: row.gameDate,
          kills: row.kills,
          deaths: row.deaths,
          assists: row.assists,
          cs: row.cs,
          visionScore: row.visionScore,
          win: row.win,
          rawJson: row.raw as never,
        },
      });

      imported++;
    }

    if (unresolvedKeys.size > 0) {
      const examples = Array.from(unresolvedKeys).slice(0, MAX_EXAMPLE_KEYS);
      errors.push(
        `${skipped} row(s) skipped — no matching Draftable found. Example keys: ${examples.join(", ")}`
      );
    }

    await prisma.statsImportJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        rowsImported: imported,
      },
    });

    return { imported, skipped, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during ingestion.";
    await prisma.statsImportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        rowsImported: imported,
        errorMessage: message,
      },
    });
    throw error;
  }
}
