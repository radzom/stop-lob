import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, { userId, existingUserId }) => {
      if (existingUserId !== null) {
        // Existing user signing in again — skip
        return;
      }
      // Check if any admin role exists
      const existingAdmin = await ctx.db
        .query("roles")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .first();
      if (existingAdmin === null) {
        await ctx.db.insert("roles", { role: "admin", userId });
      }
    },
  },
});