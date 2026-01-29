# Implementation Plan: Social & Favorability System (SFS)

This plan outlines the steps to implement the Social & Favorability System for AmiaBot, ensuring persistent, group-isolated, and bilateral social interactions.

## Phase 1: Persistence Layer (Database)

- [ ] **SQL Migration**: Append `user_relationships` and `user_daily_interactions` tables to `db/init.sql`.
- [ ] **DB Service Update**: Extend `src/service/db.ts` to support transaction-based favorability updates and cross-table checks (A < B logic).

## Phase 2: Domain Logic (Social Service)

- [ ] **Social Engine**: Create `src/service/social.ts` to encapsulate core SFS logic.
  - [ ] Implementation of the **Bilateral Matching Algorithm** for `/娶群友`.
  - [ ] Implementation of the **Hourly Rate Limiter** for `/送礼物`.
  - [ ] Implementation of the **Penalty Logic** for `/闹离婚`.
- [ ] **Rank Aggregator**: Logic to fetch Top 10 social connections within a specific `group_id`.

## Phase 3: UI/UX (React Components)

- [ ] **SocialCard Design**: Create `src/components/social/SocialCard.tsx` using M3 Design.
  - [ ] Dynamic color tokens based on favorability levels.
  - [ ] Support for "Broken Heart" overlay for divorce events.
  - [ ] Progress bars for relationship milestones.
- [ ] **Leaderboard Component**: Create `src/components/social/SocialLeaderboard.tsx` for ranking display.

## Phase 4: Feature Integration (OneBot Commands)

- [ ] **Feature Module**: Create `src/features/social/` directory.
- [ ] **Command Registration**: Implement handlers for:
  - `/娶群友`: Random matching + DB persistence.
  - `/送礼物 [@user] [text]`: Text extraction + Random favorability + Hourly limit check.
  - `/闹离婚`: Relationship dissolution + 20% penalty.
  - `/好感度列表`: Top 10 SSR card rendering.
- [ ] **Plugin Entry**: Register the new feature in `src/features/index.ts`.

## Phase 5: Verification & CI

- [ ] **Unit Tests**: Mock database calls to verify the $A < B$ sorting logic and hourly reset logic.
- [ ] **SSR Validation**: Verify that the new cards render correctly in the Chromium-based SSR engine.
- [ ] **Type Check**: Run `tsc` to ensure ESM compatibility and strict typing.

---

### Critical Path & Constraints

- **Concurrency**: Use PostgreSQL `UPSERT` (ON CONFLICT) to prevent race conditions during simultaneous gift-giving.
- **SSR Performance**: Ensure avatar fetching for the leaderboard does not timeout the OneBot response window.
- **Privacy**: Implement a basic check for the "opt-out" flag in future expansions.
