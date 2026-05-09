import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const BATCH_LIMIT = 50;

// ── Helpers ──────────────────────────────────────────────────────────

async function applyExpiryPenalty(
  ctx: MutationCtx,
  rankingId: Id<"rankings">,
  penalizedPlayerId: Id<"players">,
) {
  const positions = await ctx.db
    .query("rankingPositions")
    .withIndex("by_rankingId", (q) => q.eq("rankingId", rankingId))
    .unique();
  if (positions === null) {
    console.warn(`rankingPositions not found for ranking ${rankingId}`);
    return;
  }

  const idx = positions.playerIds.indexOf(penalizedPlayerId);
  if (idx === -1) {
    console.warn(`Player ${penalizedPlayerId} not found in ranking ${rankingId}`);
    return;
  }

  // Drop one rank: swap with player directly below (if not already last)
  if (idx < positions.playerIds.length - 1) {
    const updated = [...positions.playerIds];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    await ctx.db.patch(positions._id, { playerIds: updated });
  }
}

async function applyRankSwap(
  ctx: MutationCtx,
  rankingId: Id<"rankings">,
  winnerId: Id<"players">,
  loserId: Id<"players">,
) {
  const positions = await ctx.db
    .query("rankingPositions")
    .withIndex("by_rankingId", (q) => q.eq("rankingId", rankingId))
    .unique();
  if (positions === null) {
    console.warn(`rankingPositions not found for ranking ${rankingId}`);
    return;
  }

  const winnerIndex = positions.playerIds.indexOf(winnerId);
  const loserIndex = positions.playerIds.indexOf(loserId);

  if (winnerIndex === -1 || loserIndex === -1) {
    console.warn(`Players not found in ranking ${rankingId}`);
    return;
  }

  // Only swap if winner was lower-ranked (higher index)
  if (winnerIndex > loserIndex) {
    const updated = [...positions.playerIds];
    updated.splice(winnerIndex, 1);
    updated.splice(loserIndex, 0, winnerId);
    await ctx.db.patch(positions._id, { playerIds: updated });
  }
}

// ── Expire unplayed challenges ───────────────────────────────────────

export const expireChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Expire pending challenges (15-day deadline exceeded)
    const expiredPending = await ctx.db
      .query("challenges")
      .withIndex("by_status_and_expiresAt", (q) =>
        q.eq("status", "pending").lt("expiresAt", now),
      )
      .take(BATCH_LIMIT);

    for (const challenge of expiredPending) {
      // Penalize the challenged player (always the higher-ranked one)
      await applyExpiryPenalty(ctx, challenge.rankingId, challenge.challengedId);

      await ctx.db.patch(challenge._id, {
        status: "expired",
        resolvedAt: now,
      });

      await ctx.db.insert("rankingEvents", {
        type: "challenge_expired",
        rankingId: challenge.rankingId,
        challengeId: challenge._id,
        penalizedPlayerId: challenge.challengedId,
        challengerId: challenge.challengerId,
        timestamp: now,
      });
    }

    // 2. Auto-confirm result_reported challenges (3-day confirmation window exceeded)
    const expiredReported = await ctx.db
      .query("challenges")
      .withIndex("by_status_and_expiresAt", (q) =>
        q.eq("status", "result_reported").lt("expiresAt", now),
      )
      .take(BATCH_LIMIT);

    for (const challenge of expiredReported) {
      const result = challenge.counterResult ?? challenge.reportedResult;
      if (result == null) {
        console.warn(`No reportedResult on result_reported challenge ${challenge._id}`);
        continue;
      }

      await applyRankSwap(ctx, challenge.rankingId, result.winnerId, result.loserId);

      await ctx.db.patch(challenge._id, {
        status: "completed",
        resolvedAt: now,
      });

      await ctx.db.insert("rankingEvents", {
        type: "match_result",
        rankingId: challenge.rankingId,
        challengeId: challenge._id,
        winnerId: result.winnerId,
        loserId: result.loserId,
        sets: result.sets,
        datePlayed: result.datePlayed,
        isWalkover: result.isWalkover,
        timestamp: now,
      });
    }

    return null;
  },
});

// ── Cron schedule ────────────────────────────────────────────────────

const crons = cronJobs();

crons.interval(
  "expire unplayed challenges",
  { hours: 8 },
  internal.crons.expireChallenges,
  {},
);

export default crons;
