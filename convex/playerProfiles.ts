import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin, requireAuthUserId } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";

const genderValidator = v.union(v.literal("male"), v.literal("female"));

function toProfilePrefill(profile: Doc<"players">) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone ?? "",
    yearOfBirth: profile.yearOfBirth,
    gender: profile.gender,
    profilePictureUrl: profile.profilePictureUrl ?? "",
  };
}

function toEmailOnlyPrefill(identityEmail: string) {
  return {
    firstName: "",
    lastName: "",
    email: identityEmail,
    phone: "",
    yearOfBirth: null,
    gender: null,
    profilePictureUrl: "",
  };
}

export const getById = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx);
    const player = await ctx.db.get(args.playerId);
    if (player === null || !player.isActive) {
      return null;
    }
    return player;
  },
});

export const updateMyContactInfo = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
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

    const patch: Record<string, string> = {};
    if (args.email !== undefined) {
      patch.email = args.email.trim().toLowerCase();
    }
    if (args.phone !== undefined) {
      patch.phone = args.phone.trim();
    }
    if (args.profilePictureUrl !== undefined) {
      patch.profilePictureUrl = args.profilePictureUrl.trim();
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(player._id, patch);
    }

    return { playerId: player._id };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const players = await ctx.db.query("players").collect();
    return players
      .filter((p) => p.isActive)
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .map((p) => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        yearOfBirth: p.yearOfBirth,
      }));
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const profiles = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2);

    if (profiles.length === 0) {
      return null;
    }

    if (profiles.length > 1) {
      throw new Error("Mehrere Profile sind mit demselben Konto verknuepft.");
    }

    return profiles[0];
  },
});

export const getProfileCompletionPrefill = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const user = await ctx.db.get("users", userId);
    const userEmail = user?.email?.trim().toLowerCase() ?? null;

    const byUserId = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2);

    if (byUserId.length > 1) {
      throw new Error("Mehrere Profile sind mit diesem Konto verknuepft.");
    }

    if (byUserId.length === 1) {
      return toProfilePrefill(byUserId[0]);
    }

    if (userEmail === null) {
      return null;
    }

    const byEmail = await ctx.db
      .query("players")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .take(2);

    if (byEmail.length > 1) {
      throw new Error("Mehrere Spielerprofile mit derselben E-Mail gefunden.");
    }

    if (byEmail.length === 0) {
      return toEmailOnlyPrefill(userEmail);
    }

    const candidate = byEmail[0];
    if (candidate.userId !== undefined && candidate.userId !== userId) {
      return toEmailOnlyPrefill(userEmail);
    }

    return toProfilePrefill(candidate);
  },
});

export const upsertMyProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    yearOfBirth: v.number(),
    gender: genderValidator,
    profilePictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const normalizedEmail = args.email.trim().toLowerCase();

    const byUserId = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2);

    if (byUserId.length > 1) {
      throw new Error("Mehrere Profile sind mit diesem Konto verknuepft.");
    }

    const profilePatch = {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: normalizedEmail,
      phone: args.phone.trim(),
      yearOfBirth: args.yearOfBirth,
      gender: args.gender,
      isActive: true,
      ...(args.profilePictureUrl !== undefined && args.profilePictureUrl.trim().length > 0
        ? { profilePictureUrl: args.profilePictureUrl.trim() }
        : {}),
    };

    if (byUserId.length === 1) {
      const current = byUserId[0];
      await ctx.db.patch("players", current._id, profilePatch);
      return { playerId: current._id, mode: "updated" as const };
    }

    const byEmail = await ctx.db
      .query("players")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .take(2);

    if (byEmail.length > 1) {
      throw new Error("Mehrere Spielerprofile mit derselben E-Mail gefunden.");
    }

    if (byEmail.length === 1) {
      const candidate = byEmail[0];
      if (candidate.userId !== undefined && candidate.userId !== userId) {
        throw new Error("Diese E-Mail ist bereits einem anderen Konto zugeordnet.");
      }

      await ctx.db.patch("players", candidate._id, {
        ...profilePatch,
        userId,
      });
      return { playerId: candidate._id, mode: "claimed" as const };
    }

    const insertedId = await ctx.db.insert("players", {
      ...profilePatch,
      userId,
    });

    return { playerId: insertedId, mode: "created" as const };
  },
});

export const adminUpdateProfile = mutation({
  args: {
    playerId: v.id("players"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    yearOfBirth: v.number(),
    gender: genderValidator,
    profilePictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const player = await ctx.db.get(args.playerId);
    if (player === null) {
      throw new Error("Spieler nicht gefunden.");
    }

    await ctx.db.patch(args.playerId, {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone.trim(),
      yearOfBirth: args.yearOfBirth,
      gender: args.gender,
      ...(args.profilePictureUrl !== undefined && args.profilePictureUrl.trim().length > 0
        ? { profilePictureUrl: args.profilePictureUrl.trim() }
        : {}),
    });

    return { playerId: args.playerId };
  },
});
