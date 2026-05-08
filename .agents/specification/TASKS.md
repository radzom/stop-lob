# Task: Seed Data / Club Setup

## Goal
Create the initial mutations to bootstrap the app — initialize club settings and assign the first admin role.

## Subtasks

### 1. Initialize Club Settings
- [ ] Create an `initClubSettings` mutation
- **Input:** `clubName`, `challengeExpiryDays`, `penaltyOnExpiry`, `thirdSetIsTiebreak`, `logoUrl` (optional)
- **Behavior:** Inserts a `clubSettings` document
- **Guard:** Should fail if a `clubSettings` document already exists (only one allowed)

### 2. Create First Admin
- [ ] Create a `setAdmin` mutation
- **Input:** `userId`
- **Behavior:** Inserts a role document with `role: "admin"` for the given user
- **Guard:** Should fail if the user already has an admin role

## Open Questions

- [ ] Should `initClubSettings` be an internal mutation (only callable from the backend), or a public mutation protected by an auth check?
- [ ] Should the first admin be auto-created when club settings are initialized (same mutation), or kept separate?
- [ ] Should there be a `getClubSettings` query from the start?
- [ ] Do we need an `updateClubSettings` mutation now, or later?
