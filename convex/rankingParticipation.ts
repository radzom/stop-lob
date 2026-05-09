import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./lib/auth";

export const join = mutation({
  args: {
    rankingId: v.id("rankings"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    // 1. Load the ranking — must exist and be active
    const ranking = await ctx.db.get(args.rankingId);
    if (ranking === null || !ranking.isActive) {
      throw new Error("Rangliste nicht gefunden oder nicht aktiv.");
    }

    // 2. Load the player profile linked to this user
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden. Bitte zuerst Profil anlegen.");
    }

    // 3. Check gender filter
    if (ranking.genderFilter !== undefined && ranking.genderFilter !== player.gender) {
      const label = ranking.genderFilter === "male" ? "Herren" : "Damen";
      throw new Error(`Diese Rangliste ist nur fuer ${label}.`);
    }

    // 4. Check age filter
    const currentYear = new Date().getFullYear();
    const playerAge = currentYear - player.yearOfBirth;
    if (ranking.minAge !== undefined && playerAge < ranking.minAge) {
      throw new Error(`Mindestalter ${ranking.minAge} Jahre nicht erreicht.`);
    }
    if (ranking.maxAge !== undefined && playerAge > ranking.maxAge) {
      throw new Error(`Hoechstalter ${ranking.maxAge} Jahre ueberschritten.`);
    }

    // 5. Load positions doc — must exist (created when ranking was created)
    const positions = await ctx.db
      .query("rankingPositions")
      .withIndex("by_rankingId", (q) => q.eq("rankingId", args.rankingId))
      .unique();
    if (positions === null) {
      throw new Error("Ranglistenpositionen nicht gefunden.");
    }

    // 6. Check player is not already in the ranking
    if (positions.playerIds.includes(player._id)) {
      throw new Error("Du bist bereits in dieser Rangliste.");
    }

    // 7. Append player to the bottom of the pyramid
    await ctx.db.patch(positions._id, {
      playerIds: [...positions.playerIds, player._id],
    });

    // 8. Write event log entry
    await ctx.db.insert("rankingEvents", {
      type: "player_joined",
      rankingId: args.rankingId,
      playerId: player._id,
      timestamp: Date.now(),
    });

    return { rank: positions.playerIds.length + 1 };
  },
});

export const leave = mutation({
  args: {
    rankingId: v.id("rankings"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    // 1. Load the player profile linked to this user
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (player === null) {
      throw new Error("Kein Spielerprofil gefunden.");
    }

    // 2. Load positions doc
    const positions = await ctx.db
      .query("rankingPositions")
      .withIndex("by_rankingId", (q) => q.eq("rankingId", args.rankingId))
      .unique();
    if (positions === null) {
      throw new Error("Ranglistenpositionen nicht gefunden.");
    }

    // 3. Check player is actually in the ranking
    const index = positions.playerIds.indexOf(player._id);
    if (index === -1) {
      throw new Error("Du bist nicht in dieser Rangliste.");
    }

    // 4. Check for active challenges (pending/result_reported/disputed)
    const activeStatuses = ["pending", "result_reported", "disputed"] as const;
    for (const status of activeStatuses) {
      const asChallenger = await ctx.db
        .query("challenges")
        .withIndex("by_challengerId_and_status", (q) =>
          q.eq("challengerId", player._id).eq("status", status),
        )
        .first();
      const asChallenged = await ctx.db
        .query("challenges")
        .withIndex("by_challengedId_and_status", (q) =>
          q.eq("challengedId", player._id).eq("status", status),
        )
        .first();
      if (asChallenger !== null || asChallenged !== null) {
        throw new Error(
          "Du kannst die Rangliste nicht verlassen, solange du eine offene Herausforderung hast.",
        );
      }
    }

    // 5. Remove player — everyone below shifts up automatically
    const updatedPlayerIds = [
      ...positions.playerIds.slice(0, index),
      ...positions.playerIds.slice(index + 1),
    ];
    await ctx.db.patch(positions._id, { playerIds: updatedPlayerIds });

    // 6. Write event log entry
    await ctx.db.insert("rankingEvents", {
      type: "player_left",
      rankingId: args.rankingId,
      playerId: player._id,
      timestamp: Date.now(),
    });

    return null;
  },
});

export const getPositions = query({
  args: { rankingId: v.id("rankings") },
  handler: async (ctx, args) => {
    const positions = await ctx.db
      .query("rankingPositions")
      .withIndex("by_rankingId", (q) => q.eq("rankingId", args.rankingId))
      .unique();

    if (positions === null) {
      return { players: [] };
    }

    // Join with player data for display
    const players = await Promise.all(
      positions.playerIds.map(async (playerId, index) => {
        const player = await ctx.db.get(playerId);
        if (player === null) {
          return null;
        }
        return {
          playerId: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          rank: index + 1,
        };
      }),
    );

    return {
      players: players.filter((p) => p !== null),
    };
  },
});

export const getRankingsForPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const allPositions = await ctx.db.query("rankingPositions").collect();

    const results = await Promise.all(
      allPositions.map(async (pos) => {
        const index = pos.playerIds.indexOf(args.playerId);
        if (index === -1) return null;

        const ranking = await ctx.db.get(pos.rankingId);
        if (ranking === null) return null;

        return {
          rankingId: ranking._id,
          rankingName: ranking.name,
          rank: index + 1,
          isActive: ranking.isActive,
        };
      }),
    );

    return results.filter((r) => r !== null);
  },
});
