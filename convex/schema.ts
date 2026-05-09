import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Player profiles — linked to auth via userId (optional until claimed)
  players: defineTable({
    userId: v.optional(v.id("users")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    yearOfBirth: v.number(),
    gender: v.union(v.literal("male"), v.literal("female")),
    profilePictureUrl: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_gender", ["gender"]),

  // Admin / moderator roles
  // "admin" can do everything globally
  // "moderator" is scoped to a specific ranking (can confirm match results for that ranking)
  roles: defineTable(
    v.union(
      v.object({
        role: v.literal("admin"),
        userId: v.id("users"),
      }),
      v.object({
        role: v.literal("moderator"),
        userId: v.id("users"),
        rankingId: v.id("rankings"),
      })
    )
  )
    .index("by_userId", ["userId"])
    .index("by_userId_and_rankingId", ["userId", "rankingId"]),

  // Ranking category definitions (e.g. "Men's Open", "Women's 40+")
  rankings: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    genderFilter: v.optional(v.union(v.literal("male"), v.literal("female"))),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    isActive: v.boolean(),
  }),

  // Immutable event log for ranking state changes
  rankingEvents: defineTable(
    v.union(
      v.object({
        type: v.literal("player_joined"),
        rankingId: v.id("rankings"),
        playerId: v.id("players"),
        timestamp: v.number(),
      }),
      v.object({
        type: v.literal("player_left"),
        rankingId: v.id("rankings"),
        playerId: v.id("players"),
        timestamp: v.number(),
      }),
      v.object({
        type: v.literal("match_result"),
        rankingId: v.id("rankings"),
        challengeId: v.id("challenges"),
        winnerId: v.id("players"),
        loserId: v.id("players"),
        // Array of set scores, up to 3 sets
        // Third set can be a match tiebreak (up to 10, win by 2)
        sets: v.array(
          v.object({
            winnerScore: v.number(),
            loserScore: v.number(),
            isTiebreak: v.boolean(),
          })
        ),
        datePlayed: v.string(),
        isWalkover: v.boolean(),
        adminResolved: v.optional(v.boolean()),
        timestamp: v.number(),
      }),
      v.object({
        type: v.literal("challenge_expired"),
        rankingId: v.id("rankings"),
        challengeId: v.id("challenges"),
        // The higher-ranked player who is penalized
        penalizedPlayerId: v.id("players"),
        challengerId: v.id("players"),
        timestamp: v.number(),
      }),
      v.object({
        type: v.literal("admin_override"),
        rankingId: v.id("rankings"),
        playerId: v.id("players"),
        newRank: v.number(),
        reason: v.string(),
        performedBy: v.id("users"),
        timestamp: v.number(),
      })
    )
  )
    .index("by_rankingId_and_timestamp", ["rankingId", "timestamp"])
    .index("by_playerId", ["playerId"])
    .index("by_challengeId", ["challengeId"]),

  // Materialized current pyramid state (one doc per ranking)
  // Array index = rank - 1 (i.e. position 0 is rank 1)
  rankingPositions: defineTable({
    rankingId: v.id("rankings"),
    playerIds: v.array(v.id("players")),
  })
    .index("by_rankingId", ["rankingId"]),

  // Challenge workflow (mutable state machine)
  challenges: defineTable({
    rankingId: v.id("rankings"),
    challengerId: v.id("players"),
    challengedId: v.id("players"),
    status: v.union(
      v.literal("pending"),
      v.literal("result_reported"),
      v.literal("disputed"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("forfeited"),
      v.literal("cancelled")
    ),
    // Rank positions at the time of challenge (for validation)
    challengerRank: v.number(),
    challengedRank: v.number(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    // Deadline: 15 days from creation
    expiresAt: v.number(),
    // Who forfeited (if status is "forfeited")
    forfeitedBy: v.optional(v.id("players")),
    // Result reporting (set when status moves to "result_reported")
    reportedBy: v.optional(v.id("players")),
    reportedResult: v.optional(
      v.object({
        winnerId: v.id("players"),
        loserId: v.id("players"),
        sets: v.array(
          v.object({
            winnerScore: v.number(),
            loserScore: v.number(),
            isTiebreak: v.boolean(),
          })
        ),
        datePlayed: v.string(),
        isWalkover: v.boolean(),
      })
    ),
    // Counter-result (set when the non-reporter disputes)
    counterReportedBy: v.optional(v.id("players")),
    counterResult: v.optional(
      v.object({
        winnerId: v.id("players"),
        loserId: v.id("players"),
        sets: v.array(
          v.object({
            winnerScore: v.number(),
            loserScore: v.number(),
            isTiebreak: v.boolean(),
          })
        ),
        datePlayed: v.string(),
        isWalkover: v.boolean(),
      })
    ),
    // Admin who resolved a dispute (if status changed via admin)
    resolvedBy: v.optional(v.id("users")),
    // Which result the admin chose ("reported" or "counter")
    resolvedResult: v.optional(v.union(v.literal("reported"), v.literal("counter"))),
  })
    .index("by_rankingId_and_status", ["rankingId", "status"])
    .index("by_challengerId_and_status", ["challengerId", "status"])
    .index("by_challengedId_and_status", ["challengedId", "status"])
    .index("by_status_and_expiresAt", ["status", "expiresAt"]),

  // Club-wide settings
  clubSettings: defineTable({
    clubName: v.string(),
    logoUrl: v.optional(v.string()),
    challengeExpiryDays: v.number(),
    penaltyOnExpiry: v.boolean(),
    thirdSetIsTiebreak: v.boolean(),
  }),
});
