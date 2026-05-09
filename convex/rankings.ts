import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const genderFilter = v.union(v.literal("male"), v.literal("female"));

function validateAge(value: number | undefined, label: string) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
    throw new Error(`${label} muss eine positive ganze Zahl sein.`);
  }
}

// ── Queries ──────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("rankings")
      .order("desc")
      .take(50);
  },
});

export const getById = query({
  args: { rankingId: v.id("rankings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.rankingId);
  },
});

// ── Mutations (admin-only) ───────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    genderFilter: v.optional(genderFilter),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validateAge(args.minAge, "Mindestalter");
    validateAge(args.maxAge, "Höchstalter");

    const rankingId = await ctx.db.insert("rankings", {
      name: args.name.trim(),
      description: args.description?.trim(),
      genderFilter: args.genderFilter,
      minAge: args.minAge,
      maxAge: args.maxAge,
      isActive: true,
    });

    // Create the empty materialized positions doc for this ranking
    await ctx.db.insert("rankingPositions", {
      rankingId,
      playerIds: [],
    });

    return rankingId;
  },
});

export const update = mutation({
  args: {
    rankingId: v.id("rankings"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    genderFilter: v.optional(genderFilter),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validateAge(args.minAge, "Mindestalter");
    validateAge(args.maxAge, "Höchstalter");

    const existing = await ctx.db.get(args.rankingId);
    if (existing === null) {
      throw new Error("Rangliste nicht gefunden.");
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.genderFilter !== undefined) patch.genderFilter = args.genderFilter;
    if (args.minAge !== undefined) patch.minAge = args.minAge;
    if (args.maxAge !== undefined) patch.maxAge = args.maxAge;

    await ctx.db.patch(args.rankingId, patch);
    return args.rankingId;
  },
});
