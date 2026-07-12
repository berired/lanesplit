-- DropForeignKey
ALTER TABLE "DraftPick" DROP CONSTRAINT "DraftPick_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "Matchup" DROP CONSTRAINT "Matchup_awayMembershipId_fkey";

-- DropForeignKey
ALTER TABLE "Matchup" DROP CONSTRAINT "Matchup_homeMembershipId_fkey";

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "LeagueMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_homeMembershipId_fkey" FOREIGN KEY ("homeMembershipId") REFERENCES "LeagueMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_awayMembershipId_fkey" FOREIGN KEY ("awayMembershipId") REFERENCES "LeagueMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
