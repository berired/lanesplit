/**
 * Riot's match-v5 API has no "give me all recent champion stats" firehose — you
 * must already know which match IDs to query. There's no live feed of pro-team
 * matches from the official Riot API (that's exactly why Oracle's Elixir exists
 * for pro-player stats). For champion-mode leagues, a commissioner is expected to
 * populate this list with the match IDs (region-prefixed, e.g. "NA1_4567890123")
 * whose stats should be pulled in on the next periodic Riot sync.
 *
 * This is intentionally a static, manually-maintained list for v1 — not a
 * database table or admin UI. Populate it, redeploy, and the next cron/manual
 * run of the Riot provider will pick up these matches.
 */
export const RIOT_TRACKED_MATCH_IDS: string[] = [];
