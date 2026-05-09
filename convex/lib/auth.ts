import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Returns the authenticated userId or throws.
 * Use in any query/mutation that requires a logged-in user.
 */
export async function requireAuthUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Nicht angemeldet.");
  }
  return userId;
}

/**
 * Returns the authenticated userId after verifying admin role, or throws.
 * Use in mutations/queries restricted to admins.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuthUserId(ctx);
  const adminRole = await ctx.db
    .query("roles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (adminRole === null || adminRole.role !== "admin") {
    throw new Error("Keine Berechtigung. Administratorrechte erforderlich.");
  }
  return userId;
}
