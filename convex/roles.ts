import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMyRoles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    return await ctx.db
      .query("roles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);
  },
});
