# Ranking Board — Vision

## Overview

A web application for a tennis club to manage player rankings using a **pyramid challenge system**. Players are arranged in a pyramid and compete by challenging nearby players to climb the ranks.

## Pyramid Structure

The ranking uses a pyramid layout where each row has as many players as its row number:

```
Row 1:       [1]
Row 2:      [2, 3]
Row 3:     [4, 5, 6]
Row 4:    [7, 8, 9, 10]
```

- **Rank** is a single integer (1 = top). Row and column are derived at runtime.
- New players are added to the bottom of the pyramid (new row created if the current bottom row is full).
- When a player leaves, they are removed and everyone below shifts up to close the gap.

## Multiple Rankings

The app supports **multiple ranking categories** (e.g. "Men's Open", "Women's 40+"). Each ranking is defined by an admin with optional filters:

- **Gender filter** (male / female)
- **Year of birth range** (min / max)

A player can participate in **multiple rankings** simultaneously.

## Challenge Rules

Players climb the pyramid by challenging and beating higher-ranked players.

### Who Can Challenge Whom

A player can challenge:
- The player directly to their **left on the same row**
- The player at the **same column index in the row above** (i.e. above-right)

Example:
```
Row 1:       [A]
Row 2:      [B, C]
Row 3:     [D, E, F]
```

- **E** (row 3, col 2) can challenge **D** (same row, left) and **C** (row above, same column index)
- **E** cannot challenge **A** or **B**

### Challenge Lifecycle

1. A player **creates a challenge** against a valid opponent.
2. The challenged player does **not need to accept** — both players are expected to play within the deadline.
3. Either player **reports the result**. The opponent or an admin/moderator **confirms** it.
4. If the match is not played within **15 days**, the challenge **expires** and the higher-ranked player is **penalized** (drops one rank). The challenger stays in place.

### Restrictions

- A player can only have **one active challenge** at a time (either as challenger or as the challenged).

## Match Format

- **Singles only** (no doubles).
- **Best of 3 sets**.
- The **third set**, if needed, is played as a **match tiebreak to 10** (must win by 2 points).
- **Walkovers/forfeits** are supported — counts as a loss for the forfeiting player.

## Rank Changes After a Match

- If the **lower-ranked player wins**: they take the loser's position. The loser and all players between the two shift down by one rank.
- If the **higher-ranked player wins**: nothing changes.

## Players

### Profile Data

- **First name** (required)
- **Last name** (required)
- **Email** (required)
- **Phone** (required)
- **Year of birth** (required)
- **Gender** — male or female (required)
- **Profile picture** (optional)

### Account Linking

- An admin can **pre-create player profiles** without an account.
- Players can **sign up** (email/password) and **claim** their pre-created profile.
- Both admin-created and self-registered players are supported.

## Roles & Permissions

| Role | Scope | Permissions |
|------|-------|-------------|
| **Admin** | Global | Full access — manage players, rankings, settings, confirm results, override ranks |
| **Moderator** | Per ranking | Confirm match results for the specific ranking they moderate |
| **Player** | Own profile | Create challenges, report results, update own profile |

## Event Sourcing

Rankings are driven by an **immutable event log**. Every state change is recorded as an event:

| Event | Trigger |
|-------|---------|
| `player_joined` | Player added to a ranking |
| `player_left` | Player removed from a ranking |
| `match_result` | Match completed (includes set scores, walkover flag) |
| `challenge_expired` | Challenge not played within deadline |
| `admin_override` | Admin manually changes a player's rank |

A **materialized view** (current pyramid state) is maintained alongside the event log for fast reads. The event log preserves full history and enables replay/audit.

## Club Settings

Configurable values stored per club:

| Setting | Description |
|---------|-------------|
| `clubName` | Name of the club |
| `logoUrl` | Club logo (optional) |
| `challengeExpiryDays` | Days before an unplayed challenge expires (default: 15) |
| `penaltyOnExpiry` | Whether the higher-ranked player drops a rank on expiry |
| `thirdSetIsTiebreak` | Whether the 3rd set is a match tiebreak to 10 |

## Tech Stack

- **Backend:** [Convex](https://convex.dev) (real-time database, serverless functions, auth)
- **Auth:** Email/password via Convex Auth
- **Frontend:** React + TypeScript + Vite
- **Single club** — no multi-tenancy
