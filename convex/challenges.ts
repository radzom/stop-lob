import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuthUserId, requireAdmin } from "./lib/auth";

const CHALLENGE_EXPIRY_DAYS = 15;
const RESULT_CONFIRMATION_DAYS = 3;
const MAX_ROW_SIZE = 5;
const ACTIVE_STATUSES = ["pending", "result_reported", "disputed"] as const;

/**
 * Builds pyramid rows from a flat playerIds array.
 * Row 1 has 1 slot, row 2 has 2, ..., capped at MAX_ROW_SIZE.
 */
function buildPyramidRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  let index = 0;
  let rowSize = 1;
  while (index < items.length) {
    const size = Math.min(rowSize, MAX_ROW_SIZE);
    rows.push(items.slice(index, index + size));
    index += size;
    if (rowSize < MAX_ROW_SIZE) rowSize++;
  }
  return rows;
}

/**
 * Returns the set of indices (0-based ranks) that a player at the given
 * flat index can challenge.
 */
function getChallengeableIndices(
  rows: number[][],
  playerIndex: number,
): Set<number> {
  const targets = new Set<number>();

  for (let r = 0; r < rows.length; r++) {
    const col = rows[r].indexOf(playerIndex);
    if (col === -1) continue;

    // All players to the left on same row
    for (let c = 0; c < col; c++) {
      targets.add(rows[r][c]);
    }
    // All players from same column index onward in row above
    if (r > 0) {
      for (let c = col; c < rows[r - 1].length; c++) {
        targets.add(rows[r - 1][c]);
      }
    }
    break;
  }
  return targets;
}

export const create = mutation({
  args: {
    rankingId: v.id("rankings"),
    challengedId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    // 1. Load challenger's player profile
    const challenger = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (challenger === null) {
      throw new Error("Kein Spielerprofil gefunden. Bitte zuerst Profil anlegen.");
    }

    // 2. Cannot challenge yourself
    if (challenger._id === args.challengedId) {
      throw new Error("Du kannst dich nicht selbst herausfordern.");
    }

    // 3. Load current positions
    const positions = await ctx.db
      .query("rankingPositions")
      .withIndex("by_rankingId", (q) => q.eq("rankingId", args.rankingId))
      .unique();
    if (positions === null) {
      throw new Error("Ranglistenpositionen nicht gefunden.");
    }

    // 4. Verify both players are in the ranking
    const challengerIndex = positions.playerIds.indexOf(challenger._id);
    if (challengerIndex === -1) {
      throw new Error("Du bist nicht in dieser Rangliste.");
    }
    const challengedIndex = positions.playerIds.indexOf(args.challengedId);
    if (challengedIndex === -1) {
      throw new Error("Der herausgeforderte Spieler ist nicht in dieser Rangliste.");
    }

    // 5. Validate pyramid challenge rules
    const indices = positions.playerIds.map((_, i) => i);
    const rows = buildPyramidRows(indices);
    const challengeable = getChallengeableIndices(rows, challengerIndex);
    if (!challengeable.has(challengedIndex)) {
      throw new Error(
        "Dieser Spieler kann nicht herausgefordert werden. Du kannst nur Nachbarn in der Pyramide herausfordern.",
      );
    }

    // 6. Check neither player has an active challenge in THIS ranking
    for (const status of ACTIVE_STATUSES) {
      const challengerActive = await ctx.db
        .query("challenges")
        .withIndex("by_rankingId_and_status", (q) =>
          q.eq("rankingId", args.rankingId).eq("status", status),
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("challengerId"), challenger._id),
            q.eq(q.field("challengedId"), challenger._id),
          ),
        )
        .first();
      if (challengerActive !== null) {
        throw new Error("Du hast bereits eine aktive Herausforderung in dieser Rangliste.");
      }

      const challengedActive = await ctx.db
        .query("challenges")
        .withIndex("by_rankingId_and_status", (q) =>
          q.eq("rankingId", args.rankingId).eq("status", status),
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("challengerId"), args.challengedId),
            q.eq(q.field("challengedId"), args.challengedId),
          ),
        )
        .first();
      if (challengedActive !== null) {
        throw new Error("Der herausgeforderte Spieler hat bereits eine aktive Herausforderung in dieser Rangliste.");
      }
    }

    // 7. Create the challenge
    const now = Date.now();
    const expiresAt = now + CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    const challengeId = await ctx.db.insert("challenges", {
      rankingId: args.rankingId,
      challengerId: challenger._id,
      challengedId: args.challengedId,
      status: "pending",
      challengerRank: challengerIndex + 1,
      challengedRank: challengedIndex + 1,
      createdAt: now,
      expiresAt,
    });

    return challengeId;
  },
});

export const getActiveForPlayer = query({
  args: { rankingId: v.id("rankings") },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      return null;
    }

    // Active statuses: pending, result_reported, disputed
    const activeStatuses = ["pending", "result_reported", "disputed"] as const;

    // Search within this ranking and filter by player involvement
    for (const status of activeStatuses) {
      const challenge = await ctx.db
        .query("challenges")
        .withIndex("by_rankingId_and_status", (q) =>
          q.eq("rankingId", args.rankingId).eq("status", status),
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("challengerId"), player._id),
            q.eq(q.field("challengedId"), player._id),
          ),
        )
        .first();
      if (challenge !== null) {
        const isChallenger = challenge.challengerId === player._id;
        const opponentId = isChallenger
          ? challenge.challengedId
          : challenge.challengerId;
        const opponent = await ctx.db.get(opponentId);
        return {
          ...challenge,
          role: (isChallenger ? "challenger" : "challenged") as
            | "challenger"
            | "challenged",
          opponentName: opponent
            ? `${opponent.firstName} ${opponent.lastName}`
            : "Unbekannt",
        };
      }
    }

    return null;
  },
});

export const getForRanking = query({
  args: { rankingId: v.id("rankings") },
  handler: async (ctx, args) => {
    const activeStatuses = ["pending", "result_reported", "disputed"] as const;
    const allChallenges = [];
    for (const status of activeStatuses) {
      const batch = await ctx.db
        .query("challenges")
        .withIndex("by_rankingId_and_status", (q) =>
          q.eq("rankingId", args.rankingId).eq("status", status),
        )
        .take(50);
      allChallenges.push(...batch);
    }

    return Promise.all(
      allChallenges.map(async (challenge) => {
        const challenger = await ctx.db.get(challenge.challengerId);
        const challenged = await ctx.db.get(challenge.challengedId);
        return {
          ...challenge,
          challengerName: challenger
            ? `${challenger.firstName} ${challenger.lastName}`
            : "Unbekannt",
          challengedName: challenged
            ? `${challenged.firstName} ${challenged.lastName}`
            : "Unbekannt",
        };
      }),
    );
  },
});

// ── Rank swap helper ─────────────────────────────────────────────────

/**
 * Applies rank changes after a match result.
 * - If the lower-ranked player (higher index) wins: they take the loser's
 *   position, and the loser + everyone between shift down by 1.
 * - If the higher-ranked player wins: no position change.
 */
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
    throw new Error("Ranglistenpositionen nicht gefunden.");
  }

  const winnerIndex = positions.playerIds.indexOf(winnerId);
  const loserIndex = positions.playerIds.indexOf(loserId);

  if (winnerIndex === -1 || loserIndex === -1) {
    throw new Error("Spieler nicht in der Rangliste gefunden.");
  }

  // Only swap if winner was lower-ranked (higher index)
  if (winnerIndex > loserIndex) {
    const updated = [...positions.playerIds];
    updated.splice(winnerIndex, 1);
    updated.splice(loserIndex, 0, winnerId);
    await ctx.db.patch(positions._id, { playerIds: updated });
  }
}

// ── Forfeit mutation ─────────────────────────────────────────────────

export const forfeit = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    // 1. Load the player profile
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden.");
    }

    // 2. Load the challenge
    const challenge = await ctx.db.get(args.challengeId);
    if (challenge === null) {
      throw new Error("Herausforderung nicht gefunden.");
    }

    // 3. Verify the player is involved
    const isChallenger = challenge.challengerId === player._id;
    const isChallenged = challenge.challengedId === player._id;
    if (!isChallenger && !isChallenged) {
      throw new Error("Du bist nicht an dieser Herausforderung beteiligt.");
    }

    // 4. Verify status is pending
    if (challenge.status !== "pending") {
      throw new Error("Diese Herausforderung kann nicht mehr aufgegeben werden.");
    }

    // 5. Determine winner/loser — forfeiting player loses
    const winnerId = isChallenger ? challenge.challengedId : challenge.challengerId;
    const loserId = player._id;

    // 6. Apply rank changes
    await applyRankSwap(ctx, challenge.rankingId, winnerId, loserId);

    // 7. Update challenge status
    const now = Date.now();
    await ctx.db.patch(challenge._id, {
      status: "forfeited",
      forfeitedBy: player._id,
      resolvedAt: now,
    });

    // 8. Write match_result event (walkover)
    await ctx.db.insert("rankingEvents", {
      type: "match_result",
      rankingId: challenge.rankingId,
      challengeId: challenge._id,
      winnerId,
      loserId,
      sets: [],
      datePlayed: new Date(now).toISOString().split("T")[0],
      isWalkover: true,
      timestamp: now,
    });

    return null;
  },
});

// ── Score validation helpers ─────────────────────────────────────────

// Validates a normal set score. Scores are passed as (higher, lower) after
// normalisation so the function does not need to know which player is which.
function isValidNormalSet(high: number, low: number, mayBeUnfinished: boolean): boolean {
  // 6-0 through 6-4
  if (high === 6 && low >= 0 && low <= 4) return true;
  // 7-5
  if (high === 7 && low === 5) return true;
  // 7-6 (tiebreak)
  if (high === 7 && low === 6) return true;
  // Unfinished set (only allowed if it's the last set and a walkover)
  if (mayBeUnfinished && high >= 0 && high <= 6 && low >= 0 && low <= 6) return true;
  return false;
}

function isValidTiebreakSet(high: number, low: number, mayBeUnfinished: boolean): boolean {
  // Match tiebreak to 10, win by 2
  if (high === 10 && low >= 0 && low <= 8) return true;
  if (high > 10 && high === low + 2) return true;
  if (mayBeUnfinished && high >= 0 && low >= 0 && (high < 10 || Math.abs(high - low) < 2)) return true;
  return false;
}

function validateMatchResult(
  sets: { winnerScore: number; loserScore: number; isTiebreak: boolean }[],
  winnerId: string,
  challengerId: string,
  challengedId: string,
  isWalkover: boolean,
): void {
  if (winnerId !== challengerId && winnerId !== challengedId) {
    throw new Error("Ungueltiger Gewinner.");
  }

  // Match must have at most 3 sets
  if (sets.length > 3) {
    throw new Error("Ein normales Match kann maximal 3 Saetze haben.");
  }

  // Normal match: must have 2 or more sets
  if (sets.length < 2 && !isWalkover) {
    throw new Error("Ein normales Match muss mindestens 2 Saetze haben.");
  }

  // Validate individual sets
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const isLastSet = i === sets.length - 1;
    // Normalise to (high, low) — winnerScore/loserScore are from match
    // winner's perspective so the winner can lose a set.
    const high = Math.max(set.winnerScore, set.loserScore);
    const low = Math.min(set.winnerScore, set.loserScore);
    if (i === 2 && set.isTiebreak) {
      if (!isValidTiebreakSet(high, low, isWalkover)) {
        throw new Error(
          `Ungueltiges Match-Tiebreak-Ergebnis: ${set.winnerScore}-${set.loserScore}.`,
        );
      }
    } else {
      if (!isValidNormalSet(high, low, isWalkover && isLastSet)) {
        throw new Error(
          `Ungueltiges Satzergebnis in Satz ${i + 1}: ${set.winnerScore}-${set.loserScore}.`,
        );
      }
    }
  }
}

// ── Report result mutation ───────────────────────────────────────────

const setValidator = v.object({
  winnerScore: v.number(),
  loserScore: v.number(),
  isTiebreak: v.boolean(),
});

export const reportResult = mutation({
  args: {
    challengeId: v.id("challenges"),
    winnerId: v.id("players"),
    sets: v.array(setValidator),
    datePlayed: v.string(),
    isWalkover: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    // 1. Load the player profile
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden.");
    }

    // 2. Load the challenge
    const challenge = await ctx.db.get(args.challengeId);
    if (challenge === null) {
      throw new Error("Herausforderung nicht gefunden.");
    }

    // 3. Verify the player is involved
    const isChallenger = challenge.challengerId === player._id;
    const isChallenged = challenge.challengedId === player._id;
    if (!isChallenger && !isChallenged) {
      throw new Error("Du bist nicht an dieser Herausforderung beteiligt.");
    }

    // 4. Verify status is pending
    if (challenge.status !== "pending") {
      throw new Error("Fuer diese Herausforderung kann kein Ergebnis mehr gemeldet werden.");
    }

    // 5. Determine winner and loser
    const loserId =
      args.winnerId === challenge.challengerId
        ? challenge.challengedId
        : challenge.challengerId;

    // 6. Validate scores
    validateMatchResult(
      args.sets,
      args.winnerId,
      challenge.challengerId,
      challenge.challengedId,
      args.isWalkover,
    );

    // 7. Update challenge with reported result and reset expiry for confirmation window
    const now = Date.now();
    await ctx.db.patch(challenge._id, {
      status: "result_reported",
      reportedBy: player._id,
      reportedResult: {
        winnerId: args.winnerId,
        loserId,
        sets: args.sets,
        datePlayed: args.datePlayed,
        isWalkover: args.isWalkover,
      },
      expiresAt: now + RESULT_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000,
    });

    return null;
  },
});

// ── Confirm result mutation ──────────────────────────────────────────

export const confirmResult = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden.");
    }

    const challenge = await ctx.db.get(args.challengeId);
    if (challenge === null) {
      throw new Error("Herausforderung nicht gefunden.");
    }

    if (challenge.status !== "result_reported") {
      throw new Error("Diese Herausforderung hat kein gemeldetes Ergebnis.");
    }

    // Determine who needs to confirm:
    // - If counterResult exists: the original reporter confirms the counter-result
    // - Otherwise: the non-reporter confirms the reported result
    const hasCounter = challenge.counterResult != null;
    const expectedConfirmer = hasCounter
      ? challenge.reportedBy
      : (challenge.reportedBy === challenge.challengerId
          ? challenge.challengedId
          : challenge.challengerId);

    if (player._id !== expectedConfirmer) {
      throw new Error("Du bist nicht berechtigt, dieses Ergebnis zu bestaetigen.");
    }

    // Use counterResult if present, otherwise reportedResult
    const result = hasCounter ? challenge.counterResult! : challenge.reportedResult!;

    // Apply rank changes
    await applyRankSwap(ctx, challenge.rankingId, result.winnerId, result.loserId);

    const now = Date.now();
    await ctx.db.patch(challenge._id, {
      status: "completed",
      resolvedAt: now,
    });

    // Write match_result event
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

    return null;
  },
});

// ── Dispute result mutation ──────────────────────────────────────────

export const disputeResult = mutation({
  args: {
    challengeId: v.id("challenges"),
    winnerId: v.id("players"),
    sets: v.array(setValidator),
    datePlayed: v.string(),
    isWalkover: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden.");
    }

    const challenge = await ctx.db.get(args.challengeId);
    if (challenge === null) {
      throw new Error("Herausforderung nicht gefunden.");
    }

    if (challenge.status !== "result_reported") {
      throw new Error("Diese Herausforderung hat kein gemeldetes Ergebnis.");
    }

    // Only the non-reporter can dispute, and only if no counterResult yet
    if (challenge.counterResult != null) {
      throw new Error("Es wurde bereits ein Gegenergebnis gemeldet.");
    }

    const nonReporter =
      challenge.reportedBy === challenge.challengerId
        ? challenge.challengedId
        : challenge.challengerId;

    if (player._id !== nonReporter) {
      throw new Error("Du bist nicht berechtigt, dieses Ergebnis abzulehnen.");
    }

    // Validate winner
    if (args.winnerId !== challenge.challengerId && args.winnerId !== challenge.challengedId) {
      throw new Error("Ungueltiger Gewinner.");
    }

    const loserId =
      args.winnerId === challenge.challengerId
        ? challenge.challengedId
        : challenge.challengerId;

    // Validate scores
    validateMatchResult(
      args.sets,
      args.winnerId,
      challenge.challengerId,
      challenge.challengedId,
      args.isWalkover,
    );

    // Store counter-result
    await ctx.db.patch(challenge._id, {
      counterReportedBy: player._id,
      counterResult: {
        winnerId: args.winnerId,
        loserId,
        sets: args.sets,
        datePlayed: args.datePlayed,
        isWalkover: args.isWalkover,
      },
      expiresAt: Date.now() + RESULT_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000,
    });

    return null;
  },
});

// ── Escalate to admin mutation ───────────────────────────────────────

export const escalateToAdmin = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden.");
    }

    const challenge = await ctx.db.get(args.challengeId);
    if (challenge === null) {
      throw new Error("Herausforderung nicht gefunden.");
    }

    if (challenge.status !== "result_reported") {
      throw new Error("Diese Herausforderung kann nicht eskaliert werden.");
    }

    if (challenge.counterResult == null) {
      throw new Error("Es gibt noch kein Gegenergebnis zum Eskalieren.");
    }

    // Only the original reporter can escalate (they're the one seeing the counter-result)
    if (player._id !== challenge.reportedBy) {
      throw new Error("Du bist nicht berechtigt, diese Herausforderung zu eskalieren.");
    }

    await ctx.db.patch(challenge._id, {
      status: "disputed",
    });

    return null;
  },
});

// ── Admin: list disputed challenges ──────────────────────────────────

export const getDisputedChallenges = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const disputed = await ctx.db
      .query("challenges")
      .withIndex("by_status_and_expiresAt", (q) => q.eq("status", "disputed"))
      .collect();

    const results = [];
    for (const challenge of disputed) {
      const [challenger, challenged, ranking] = await Promise.all([
        ctx.db.get(challenge.challengerId),
        ctx.db.get(challenge.challengedId),
        ctx.db.get(challenge.rankingId),
      ]);
      results.push({
        ...challenge,
        challengerName: challenger
          ? `${challenger.firstName} ${challenger.lastName}`
          : "Unbekannt",
        challengedName: challenged
          ? `${challenged.firstName} ${challenged.lastName}`
          : "Unbekannt",
        rankingName: ranking?.name ?? "Unbekannt",
        reporterName:
          challenge.reportedBy === challenge.challengerId
            ? (challenger ? `${challenger.firstName} ${challenger.lastName}` : "Unbekannt")
            : (challenged ? `${challenged.firstName} ${challenged.lastName}` : "Unbekannt"),
        counterReporterName:
          challenge.counterReportedBy === challenge.challengerId
            ? (challenger ? `${challenger.firstName} ${challenger.lastName}` : "Unbekannt")
            : (challenged ? `${challenged.firstName} ${challenged.lastName}` : "Unbekannt"),
      });
    }

    return results;
  },
});

// ── Admin: resolve disputed challenge ────────────────────────────────

export const adminResolveChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    chosenResult: v.union(v.literal("reported"), v.literal("counter")),
  },
  handler: async (ctx, args) => {
    const adminUserId = await requireAdmin(ctx);

    const challenge = await ctx.db.get(args.challengeId);
    if (challenge === null) {
      throw new Error("Herausforderung nicht gefunden.");
    }

    if (challenge.status !== "disputed") {
      throw new Error("Diese Herausforderung ist nicht im Status 'disputed'.");
    }

    const result =
      args.chosenResult === "reported"
        ? challenge.reportedResult!
        : challenge.counterResult!;

    // Apply rank changes
    await applyRankSwap(ctx, challenge.rankingId, result.winnerId, result.loserId);

    const now = Date.now();
    await ctx.db.patch(challenge._id, {
      status: "completed",
      resolvedAt: now,
      resolvedBy: adminUserId,
      resolvedResult: args.chosenResult,
    });

    // Write match_result event with adminResolved flag
    await ctx.db.insert("rankingEvents", {
      type: "match_result",
      rankingId: challenge.rankingId,
      challengeId: challenge._id,
      winnerId: result.winnerId,
      loserId: result.loserId,
      sets: result.sets,
      datePlayed: result.datePlayed,
      isWalkover: result.isWalkover,
      adminResolved: true,
      timestamp: now,
    });

    return null;
  },
});

// ── Challenge history queries ────────────────────────────────────────

export const getHistoryForRanking = query({
  args: {
    rankingId: v.id("rankings"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("challenges")
      .withIndex("by_rankingId_and_status", (q) =>
        q.eq("rankingId", args.rankingId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const playerCache = new Map<string, { firstName: string; lastName: string } | null>();
    async function getPlayer(id: Id<"players">) {
      if (!playerCache.has(id)) {
        playerCache.set(id, await ctx.db.get(id));
      }
      return playerCache.get(id)!;
    }

    const enrichedPage = await Promise.all(
      result.page.map(async (challenge) => {
        const challenger = await getPlayer(challenge.challengerId);
        const challenged = await getPlayer(challenge.challengedId);
        return {
          ...challenge,
          challengerName: challenger
            ? `${challenger.firstName} ${challenger.lastName}`
            : "Unbekannt",
          challengedName: challenged
            ? `${challenged.firstName} ${challenged.lastName}`
            : "Unbekannt",
        };
      }),
    );

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

export const getHistoryForPlayer = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Query from both indexes (as challenger and as challenged)
    const asChallenger = await ctx.db
      .query("challenges")
      .withIndex("by_challengerId_and_status", (q) =>
        q.eq("challengerId", args.playerId),
      )
      .order("desc")
      .take(50);

    const asChallenged = await ctx.db
      .query("challenges")
      .withIndex("by_challengedId_and_status", (q) =>
        q.eq("challengedId", args.playerId),
      )
      .order("desc")
      .take(50);

    // Merge and sort by createdAt desc (no dupes possible — can't challenge yourself)
    const merged = [...asChallenger, ...asChallenged];
    merged.sort((a, b) => b.createdAt - a.createdAt);

    // Enrich with player names and ranking name (cache lookups)
    const playerCache = new Map<string, { firstName: string; lastName: string } | null>();
    const rankingCache = new Map<string, { name: string } | null>();

    async function getPlayer(id: Id<"players">) {
      if (!playerCache.has(id)) {
        playerCache.set(id, await ctx.db.get(id));
      }
      return playerCache.get(id)!;
    }
    async function getRanking(id: Id<"rankings">) {
      if (!rankingCache.has(id)) {
        rankingCache.set(id, await ctx.db.get(id));
      }
      return rankingCache.get(id)!;
    }

    return Promise.all(
      merged.map(async (challenge) => {
        const challenger = await getPlayer(challenge.challengerId);
        const challenged = await getPlayer(challenge.challengedId);
        const ranking = await getRanking(challenge.rankingId);
        return {
          ...challenge,
          challengerName: challenger
            ? `${challenger.firstName} ${challenger.lastName}`
            : "Unbekannt",
          challengedName: challenged
            ? `${challenged.firstName} ${challenged.lastName}`
            : "Unbekannt",
          rankingName: ranking?.name ?? "Unbekannt",
        };
      }),
    );
  },
});
