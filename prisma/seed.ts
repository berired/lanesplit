/**
 * Seeds a small but genuinely useful reference dataset: champions, pro players, and
 * the Draftable rows that wrap each of them. Idempotent — safe to re-run, since every
 * row is upserted on its unique key.
 *
 * Run via `npx prisma db seed` (wired up in prisma.config.ts).
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../lib/generated/prisma/client";
import { GameMode } from "../lib/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

type ChampionSeed = {
  name: string;
  riotKey: string;
  primaryRole: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";
};

const CHAMPIONS: ChampionSeed[] = [
  { name: "Darius", riotKey: "Darius", primaryRole: "TOP" },
  { name: "Garen", riotKey: "Garen", primaryRole: "TOP" },
  { name: "Fiora", riotKey: "Fiora", primaryRole: "TOP" },
  { name: "Camille", riotKey: "Camille", primaryRole: "TOP" },
  { name: "Ornn", riotKey: "Ornn", primaryRole: "TOP" },
  { name: "Aatrox", riotKey: "Aatrox", primaryRole: "TOP" },
  { name: "Lee Sin", riotKey: "LeeSin", primaryRole: "JUNGLE" },
  { name: "Vi", riotKey: "Vi", primaryRole: "JUNGLE" },
  { name: "Kha'Zix", riotKey: "Khazix", primaryRole: "JUNGLE" },
  { name: "Elise", riotKey: "Elise", primaryRole: "JUNGLE" },
  { name: "Sejuani", riotKey: "Sejuani", primaryRole: "JUNGLE" },
  { name: "Viego", riotKey: "Viego", primaryRole: "JUNGLE" },
  { name: "Ahri", riotKey: "Ahri", primaryRole: "MID" },
  { name: "Zed", riotKey: "Zed", primaryRole: "MID" },
  { name: "Orianna", riotKey: "Orianna", primaryRole: "MID" },
  { name: "Syndra", riotKey: "Syndra", primaryRole: "MID" },
  { name: "Azir", riotKey: "Azir", primaryRole: "MID" },
  { name: "LeBlanc", riotKey: "Leblanc", primaryRole: "MID" },
  { name: "Jinx", riotKey: "Jinx", primaryRole: "ADC" },
  { name: "Caitlyn", riotKey: "Caitlyn", primaryRole: "ADC" },
  { name: "Kai'Sa", riotKey: "Kaisa", primaryRole: "ADC" },
  { name: "Ezreal", riotKey: "Ezreal", primaryRole: "ADC" },
  { name: "Jhin", riotKey: "Jhin", primaryRole: "ADC" },
  { name: "Aphelios", riotKey: "Aphelios", primaryRole: "ADC" },
  { name: "Thresh", riotKey: "Thresh", primaryRole: "SUPPORT" },
  { name: "Lulu", riotKey: "Lulu", primaryRole: "SUPPORT" },
  { name: "Nautilus", riotKey: "Nautilus", primaryRole: "SUPPORT" },
  { name: "Leona", riotKey: "Leona", primaryRole: "SUPPORT" },
  { name: "Yuumi", riotKey: "Yuumi", primaryRole: "SUPPORT" },
  { name: "Rakan", riotKey: "Rakan", primaryRole: "SUPPORT" },
];

type ProPlayerSeed = {
  name: string;
  team: string;
  role: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";
  league: "LCS" | "LEC" | "LCK";
  externalRefId: string;
};

// A mix of well-known pro names alongside clearly-labeled placeholders. Real roster
// data changes constantly, so placeholders are expected and intentional here.
const PRO_PLAYERS: ProPlayerSeed[] = [
  { name: "Faker", team: "T1", role: "MID", league: "LCK", externalRefId: "lck-t1-faker" },
  { name: "Zeus", team: "T1", role: "TOP", league: "LCK", externalRefId: "lck-t1-zeus" },
  { name: "Oner", team: "T1", role: "JUNGLE", league: "LCK", externalRefId: "lck-t1-oner" },
  { name: "Gumayusi", team: "T1", role: "ADC", league: "LCK", externalRefId: "lck-t1-gumayusi" },
  { name: "Keria", team: "T1", role: "SUPPORT", league: "LCK", externalRefId: "lck-t1-keria" },
  { name: "Chovy", team: "Gen.G", role: "MID", league: "LCK", externalRefId: "lck-geng-chovy" },
  { name: "Kiin", team: "Gen.G", role: "TOP", league: "LCK", externalRefId: "lck-geng-kiin" },
  {
    name: "Canyon",
    team: "Gen.G",
    role: "JUNGLE",
    league: "LCK",
    externalRefId: "lck-geng-canyon",
  },
  { name: "Caps", team: "G2 Esports", role: "MID", league: "LEC", externalRefId: "lec-g2-caps" },
  {
    name: "BrokenBlade",
    team: "G2 Esports",
    role: "TOP",
    league: "LEC",
    externalRefId: "lec-g2-brokenblade",
  },
  {
    name: "Yike",
    team: "G2 Esports",
    role: "JUNGLE",
    league: "LEC",
    externalRefId: "lec-g2-yike",
  },
  {
    name: "Hans Sama",
    team: "G2 Esports",
    role: "ADC",
    league: "LEC",
    externalRefId: "lec-g2-hanssama",
  },
  {
    name: "Rekkles",
    team: "Fnatic",
    role: "ADC",
    league: "LEC",
    externalRefId: "lec-fnc-rekkles",
  },
  { name: "Humanoid", team: "Fnatic", role: "MID", league: "LEC", externalRefId: "lec-fnc-humanoid" },
  {
    name: "Player 1",
    team: "Cloud9",
    role: "TOP",
    league: "LCS",
    externalRefId: "lcs-c9-player1",
  },
  {
    name: "Player 2",
    team: "Cloud9",
    role: "JUNGLE",
    league: "LCS",
    externalRefId: "lcs-c9-player2",
  },
  {
    name: "Player 3",
    team: "Cloud9",
    role: "MID",
    league: "LCS",
    externalRefId: "lcs-c9-player3",
  },
  {
    name: "Player 4",
    team: "Cloud9",
    role: "ADC",
    league: "LCS",
    externalRefId: "lcs-c9-player4",
  },
  {
    name: "Player 5",
    team: "Cloud9",
    role: "SUPPORT",
    league: "LCS",
    externalRefId: "lcs-c9-player5",
  },
  {
    name: "Player 6",
    team: "Team Liquid",
    role: "TOP",
    league: "LCS",
    externalRefId: "lcs-tl-player6",
  },
  {
    name: "Player 7",
    team: "Team Liquid",
    role: "JUNGLE",
    league: "LCS",
    externalRefId: "lcs-tl-player7",
  },
  {
    name: "Player 8",
    team: "Team Liquid",
    role: "MID",
    league: "LCS",
    externalRefId: "lcs-tl-player8",
  },
  {
    name: "Player 9",
    team: "Team Liquid",
    role: "ADC",
    league: "LCS",
    externalRefId: "lcs-tl-player9",
  },
  {
    name: "Player 10",
    team: "Team Liquid",
    role: "SUPPORT",
    league: "LCS",
    externalRefId: "lcs-tl-player10",
  },
  {
    name: "Player 11",
    team: "MAD Lions KOI",
    role: "TOP",
    league: "LEC",
    externalRefId: "lec-mdk-player11",
  },
  {
    name: "Player 12",
    team: "MAD Lions KOI",
    role: "SUPPORT",
    league: "LEC",
    externalRefId: "lec-mdk-player12",
  },
  {
    name: "Player 13",
    team: "Dplus KIA",
    role: "TOP",
    league: "LCK",
    externalRefId: "lck-dk-player13",
  },
  {
    name: "Player 14",
    team: "Dplus KIA",
    role: "SUPPORT",
    league: "LCK",
    externalRefId: "lck-dk-player14",
  },
];

async function main() {
  console.log(`Seeding ${CHAMPIONS.length} champions…`);
  for (const champion of CHAMPIONS) {
    const row = await prisma.champion.upsert({
      where: { riotKey: champion.riotKey },
      create: champion,
      update: champion,
    });
    await prisma.draftable.upsert({
      where: { championId: row.id },
      create: { gameMode: GameMode.CHAMPION, championId: row.id },
      update: {},
    });
  }

  console.log(`Seeding ${PRO_PLAYERS.length} pro players…`);
  for (const pro of PRO_PLAYERS) {
    const row = await prisma.proPlayer.upsert({
      where: { externalRefId: pro.externalRefId },
      create: pro,
      update: pro,
    });
    await prisma.draftable.upsert({
      where: { proPlayerId: row.id },
      create: { gameMode: GameMode.PRO_PLAYER, proPlayerId: row.id },
      update: {},
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
