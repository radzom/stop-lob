# Ranking Board — Implementation Steps

## 1. Seed Data / Club Setup
- [ ] Mutation to initialize `clubSettings`
- [ ] Create first admin role

## 2. Player Management
- [ ] Create player (admin)
- [ ] Update player profile
- [ ] Deactivate player
- [ ] Claim profile (player links their auth account)

## 3. Ranking Management
- [ ] Create ranking category (admin)
- [ ] Update ranking category
- [ ] List active rankings (query)

## 4. Join / Leave Ranking
- [ ] Add player to ranking (append to `rankingPositions`, write `player_joined` event)
- [ ] Remove player from ranking (remove from `rankingPositions`, shift others up, write `player_left` event)

## 5. Pyramid Display
- [ ] Query to fetch `rankingPositions` and return pyramid structure (rows/columns from array index)
- [ ] Build pyramid UI component

## 6. Challenge System
- [ ] Create challenge (validate pyramid rules: same row left, or row above right)
- [ ] Cancel challenge
- [ ] Report match result (write `match_result` event, update `rankingPositions`)
- [ ] Confirm result (opponent or admin/moderator)
- [ ] Handle walkover / forfeit

## 7. Expiry Cron
- [ ] Scheduled job to check expired challenges (`status=pending`, past `expiresAt`)
- [ ] Penalize higher-ranked player (drop one rank, write `challenge_expired` event)

## 8. Match History
- [ ] Query ranking events by player
- [ ] Query ranking events by ranking
- [ ] Match history UI

## 9. Auth & Roles
- [ ] Wire up email/password auth
- [ ] Profile claiming flow
- [ ] Role-based access checks on mutations (admin, moderator per ranking)

## 10. UI
- [ ] Pyramid visualization
- [ ] Challenge flow screens
- [ ] Player profile pages
- [ ] Admin panel (manage players, rankings, settings)
