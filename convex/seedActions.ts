"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createAccount } from "@convex-dev/auth/server";

export const seedAdminUser = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; email?: string; password?: string; userId?: string; reason?: string }> => {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return { success: false, reason: "ADMIN_EMAIL und ADMIN_PASSWORD müssen als Convex-Umgebungsvariablen gesetzt sein." };
    }

    // 1. Create the auth user + account with hashed password
    let userId;
    try {
      const { user } = await createAccount(ctx, {
        provider: "password",
        account: {
          id: ADMIN_EMAIL,
          secret: ADMIN_PASSWORD,
        },
        profile: {
          email: ADMIN_EMAIL,
        },
      });
      userId = user._id;
    } catch {
      // Account likely already exists — find the user
      const existingUser: { _id: string } | null = await ctx.runQuery(
        internal.seed.findUserByEmail,
        { email: ADMIN_EMAIL },
      );
      if (existingUser === null) {
        return { success: false, reason: "Konto existiert bereits, Benutzer konnte aber nicht gefunden werden." };
      }
      userId = existingUser._id;
    }

    // 2. Assign admin role + create player profile
    await ctx.runMutation(internal.seed.assignAdminAndProfile, {
      userId,
      email: ADMIN_EMAIL,
    });

    return {
      success: true,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      userId,
    };
  },
});

export const seedAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ players: unknown; admin: unknown; ranking: unknown; participation: unknown }> => {
    const admin = await ctx.runAction(internal.seedActions.seedAdminUser, {});
    const ranking = await ctx.runMutation(internal.seed.seedRanking, {});
    const players = await ctx.runMutation(internal.seed.seedPlayerProfiles, {});
    const participation = await ctx.runMutation(internal.seed.seedRankingParticipation, {});
    return { players, admin, ranking, participation };
  },
});
