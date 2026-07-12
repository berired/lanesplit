-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('PRO_PLAYER', 'CHAMPION');

-- CreateEnum
CREATE TYPE "LeagueRole" AS ENUM ('COMMISSIONER', 'MEMBER');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchupStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "maxTeams" INTEGER NOT NULL DEFAULT 10,
    "rosterSize" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMembership" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LeagueRole" NOT NULL DEFAULT 'MEMBER',
    "teamName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "externalRefId" TEXT,

    CONSTRAINT "ProPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Champion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riotKey" TEXT NOT NULL,
    "primaryRole" TEXT NOT NULL,

    CONSTRAINT "Champion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draftable" (
    "id" TEXT NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "proPlayerId" TEXT,
    "championId" TEXT,

    CONSTRAINT "Draftable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentPickIndex" INTEGER NOT NULL DEFAULT 0,
    "turnStartedAt" TIMESTAMP(3),
    "turnDurationSec" INTEGER NOT NULL DEFAULT 60,
    "version" INTEGER NOT NULL DEFAULT 0,
    "draftOrder" JSONB NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "membershipId" TEXT NOT NULL,
    "draftableId" TEXT NOT NULL,
    "madeByUserId" TEXT NOT NULL,
    "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "draftableId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonWeek" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matchup" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "homeMembershipId" TEXT NOT NULL,
    "awayMembershipId" TEXT NOT NULL,
    "homeScore" DOUBLE PRECISION,
    "awayScore" DOUBLE PRECISION,
    "status" "MatchupStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "Matchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatsImportJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "rowsImported" INTEGER,

    CONSTRAINT "StatsImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawStatEntry" (
    "id" TEXT NOT NULL,
    "draftableId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalGameId" TEXT NOT NULL,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "cs" INTEGER NOT NULL DEFAULT 0,
    "visionScore" INTEGER NOT NULL DEFAULT 0,
    "win" BOOLEAN NOT NULL,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "RawStatEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringRule" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "statKey" TEXT NOT NULL,
    "pointsPerUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyScore" (
    "id" TEXT NOT NULL,
    "rosterEntryId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WeeklyScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

-- CreateIndex
CREATE INDEX "League_commissionerId_idx" ON "League"("commissionerId");

-- CreateIndex
CREATE INDEX "LeagueMembership_userId_idx" ON "LeagueMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMembership_leagueId_userId_key" ON "LeagueMembership"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProPlayer_externalRefId_key" ON "ProPlayer"("externalRefId");

-- CreateIndex
CREATE UNIQUE INDEX "Champion_name_key" ON "Champion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Champion_riotKey_key" ON "Champion"("riotKey");

-- CreateIndex
CREATE UNIQUE INDEX "Draftable_proPlayerId_key" ON "Draftable"("proPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "Draftable_championId_key" ON "Draftable"("championId");

-- CreateIndex
CREATE INDEX "Draftable_gameMode_idx" ON "Draftable"("gameMode");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_leagueId_key" ON "Draft"("leagueId");

-- CreateIndex
CREATE INDEX "DraftPick_membershipId_idx" ON "DraftPick"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftId_pickNumber_key" ON "DraftPick"("draftId", "pickNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftId_draftableId_key" ON "DraftPick"("draftId", "draftableId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_membershipId_draftableId_key" ON "RosterEntry"("membershipId", "draftableId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonWeek_leagueId_weekNumber_key" ON "SeasonWeek"("leagueId", "weekNumber");

-- CreateIndex
CREATE INDEX "Matchup_weekId_idx" ON "Matchup"("weekId");

-- CreateIndex
CREATE INDEX "RawStatEntry_draftableId_gameDate_idx" ON "RawStatEntry"("draftableId", "gameDate");

-- CreateIndex
CREATE UNIQUE INDEX "RawStatEntry_source_externalGameId_draftableId_key" ON "RawStatEntry"("source", "externalGameId", "draftableId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRule_leagueId_statKey_key" ON "ScoringRule"("leagueId", "statKey");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScore_rosterEntryId_weekId_key" ON "WeeklyScore"("rosterEntryId", "weekId");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draftable" ADD CONSTRAINT "Draftable_proPlayerId_fkey" FOREIGN KEY ("proPlayerId") REFERENCES "ProPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draftable" ADD CONSTRAINT "Draftable_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Champion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "LeagueMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_draftableId_fkey" FOREIGN KEY ("draftableId") REFERENCES "Draftable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_madeByUserId_fkey" FOREIGN KEY ("madeByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "LeagueMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_draftableId_fkey" FOREIGN KEY ("draftableId") REFERENCES "Draftable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonWeek" ADD CONSTRAINT "SeasonWeek_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "SeasonWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_homeMembershipId_fkey" FOREIGN KEY ("homeMembershipId") REFERENCES "LeagueMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_awayMembershipId_fkey" FOREIGN KEY ("awayMembershipId") REFERENCES "LeagueMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawStatEntry" ADD CONSTRAINT "RawStatEntry_draftableId_fkey" FOREIGN KEY ("draftableId") REFERENCES "Draftable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringRule" ADD CONSTRAINT "ScoringRule_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_rosterEntryId_fkey" FOREIGN KEY ("rosterEntryId") REFERENCES "RosterEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "SeasonWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
