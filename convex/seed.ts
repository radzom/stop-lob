import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const seedPlayers = [
  {
    firstName: "Timo",
    lastName: "Frank",
    email: "timo.frank@sce.de",
    yearOfBirth: 1978,
    gender: "male" as const,
  },
  {
    firstName: "Max",
    lastName: "Immig",
    email: "max.immig@sce.de",
    yearOfBirth: 1984,
    gender: "male" as const,
  },
  {
    firstName: "Andreas",
    lastName: "Gottschlich",
    email: "andreas.gottschlich@sce.de",
    yearOfBirth: 1978,
    gender: "male" as const,
  },
  {
    firstName: "Matthias",
    lastName: "Junghanß",
    email: "matthias.junghans@sce.de",
    yearOfBirth: 1972,
    gender: "male" as const,
  },
  {
    firstName: "Gunnar",
    lastName: "Radzom",
    email: "gunnar.radzom@sce.de",
    yearOfBirth: 1973,
    gender: "male" as const,
  },
  {
    firstName: "Julius",
    lastName: "Emmerich",
    email: "julius.emmerich@sce.de",
    yearOfBirth: 1977,
    gender: "male" as const,
  },
  {
    firstName: "Alexander",
    lastName: "Helbig",
    email: "alexander.helbig@sce.de",
    yearOfBirth: 1975,
    gender: "male" as const,
  },
  {
    firstName: "Bernd",
    lastName: "Meier",
    email: "bernd.meier@sce.de",
    yearOfBirth: 1978,
    gender: "male" as const,
  },
  {
    firstName: "Hareesh",
    lastName: "Rengarajan",
    email: "hareesh.rengarajan@sce.de",
    yearOfBirth: 1981,
    gender: "male" as const,
  },
  {
    firstName: "Norman",
    lastName: "Thomas",
    email: "norman.thomas@sce.de",
    yearOfBirth: 1983,
    gender: "male" as const,
  },
  {
    firstName: "Andreas",
    lastName: "Ruppert",
    email: "andreas.ruppert@sce.de",
    yearOfBirth: 1984,
    gender: "male" as const,
  },
  {
    firstName: "Gregor",
    lastName: "Schmitt",
    email: "gregor.schmitt@sce.de",
    yearOfBirth: 1975,
    gender: "male" as const,
  },
  {
    firstName: "Nikolas",
    lastName: "Kotulla",
    email: "nikolas.kotulla@sce.de",
    yearOfBirth: 1983,
    gender: "male" as const,
  },
  {
    firstName: "Matthias",
    lastName: "Claus",
    email: "matthias.claus@sce.de",
    yearOfBirth: 1968,
    gender: "male" as const,
  },
  {
    firstName: "Marek",
    lastName: "Nitsche",
    email: "marek.nitsche@sce.de",
    yearOfBirth: 1977,
    gender: "male" as const,
  },
  {
    firstName: "Marcus",
    lastName: "Walz",
    email: "marcus.walz@sce.de",
    yearOfBirth: 1974,
    gender: "male" as const,
  },
  {
    firstName: "Thomas",
    lastName: "Zilgens",
    email: "thomas.zilgens@sce.de",
    yearOfBirth: 1974,
    gender: "male" as const,
  },
  {
    firstName: "Ingo",
    lastName: "Petzet",
    email: "ingo.petzet@sce.de",
    yearOfBirth: 1975,
    gender: "male" as const,
  },
  {
    firstName: "Didier",
    lastName: "Soulat",
    email: "didier.soulat@sce.de",
    yearOfBirth: 1978,
    gender: "male" as const,
  },
  {
    firstName: "Philipp",
    lastName: "Preischl",
    email: "philipp.preischl@sce.de",
    yearOfBirth: 1980,
    gender: "male" as const,
  },
  {
    firstName: "Andreas",
    lastName: "Urban",
    email: "andreas.urban@sce.de",
    yearOfBirth: 1978,
    gender: "male" as const,
  },
  {
    firstName: "Stefan",
    lastName: "Täubig",
    email: "stefan.taeubig@sce.de",
    yearOfBirth: 1983,
    gender: "male" as const,
  },
  {
    firstName: "Alexander",
    lastName: "Weise",
    email: "alexander.weise@sce.de",
    yearOfBirth: 1984,
    gender: "male" as const,
  },
  {
    firstName: "Volker",
    lastName: "Schuster",
    email: "volker.schuster@sce.de",
    yearOfBirth: 1967,
    gender: "male" as const,
  },
];

export const seedPlayerProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const player of seedPlayers) {
      // Skip if a player with this email already exists
      const existing = await ctx.db
        .query("players")
        .withIndex("by_email", (q) => q.eq("email", player.email))
        .first();

      if (existing !== null) {
        skipped++;
        continue;
      }

      await ctx.db.insert("players", {
        ...player,
        isActive: true,
      });
      created++;
    }

    return { created, skipped };
  },
});

export const seedRanking = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rankingName = "Alle zusammen";

    // Skip if ranking with this name already exists
    const existing = await ctx.db
      .query("rankings")
      .filter((q) => q.eq(q.field("name"), rankingName))
      .first();
    if (existing !== null) {
      return { created: false, rankingId: existing._id };
    }

    const rankingId = await ctx.db.insert("rankings", {
      name: rankingName,
      description: "Offene Rangliste ohne Einschraenkungen",
      isActive: true,
    });

    // Create empty positions doc
    await ctx.db.insert("rankingPositions", {
      rankingId,
      playerIds: [],
    });

    return { created: true, rankingId };
  },
});

export const seedRankingParticipation = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find the "Alle zusammen" ranking
    const ranking = await ctx.db
      .query("rankings")
      .filter((q) => q.eq(q.field("name"), "Alle zusammen"))
      .first();
    if (ranking === null) {
      return { joined: 0, reason: "Ranking 'Alle zusammen' nicht gefunden." };
    }

    const positions = await ctx.db
      .query("rankingPositions")
      .withIndex("by_rankingId", (q) => q.eq("rankingId", ranking._id))
      .unique();
    if (positions === null) {
      return { joined: 0, reason: "Keine Positionsliste gefunden." };
    }

    // Get all active players not yet in the ranking
    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(100);

    const existingSet = new Set(positions.playerIds.map((id) => id.toString()));
    const newPlayers = players.filter((p) => !existingSet.has(p._id.toString()));

    if (newPlayers.length === 0) {
      return { joined: 0, reason: "Alle Spieler sind bereits in der Rangliste." };
    }

    const newPlayerIds = newPlayers.map((p) => p._id);
    await ctx.db.patch(positions._id, {
      playerIds: [...positions.playerIds, ...newPlayerIds],
    });

    // Write join events
    const now = Date.now();
    for (const playerId of newPlayerIds) {
      await ctx.db.insert("rankingEvents", {
        type: "player_joined",
        rankingId: ranking._id,
        playerId,
        timestamp: now,
      });
    }

    return { joined: newPlayers.length };
  },
});

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const assignAdminAndProfile = internalMutation({
  args: { userId: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const userId = args.userId as any;

    // Assign admin role if not already assigned
    const existingRole = await ctx.db
      .query("roles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existingRole === null || existingRole.role !== "admin") {
      await ctx.db.insert("roles", { role: "admin", userId });
    }
  },
});
