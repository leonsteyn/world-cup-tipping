-- ============================================================
-- Schema updates — run in Supabase SQL Editor
-- ============================================================

-- ── Fix 1: Restrict picks visibility ────────────────────────────────────────
-- Old policy let everyone see all picks at any time.
-- New policy: you can always see your own picks; you can only see other
-- players' picks AFTER the match has kicked off (match_date <= now()).
-- This prevents copying tips before kick-off.

drop policy if exists "picks_select_all" on picks;

create policy "picks_select_restricted" on picks for select
  using (
    -- Always see your own picks
    auth.uid() = player_id
    or
    -- See others' picks only after the match has started
    exists (
      select 1 from matches m
      where m.id = match_id
        and m.match_date <= now()
    )
  );


-- ── Fix 2: Restrict leaderboard view to use same pick visibility ─────────────
-- The leaderboard only shows aggregated points (not individual picks),
-- so no change needed there — it's already safe.


-- ── Fix 3: Add index for performance ────────────────────────────────────────
-- Speeds up leaderboard calculation and pick lookups.
create index if not exists picks_player_id_idx on picks(player_id);
create index if not exists picks_match_id_idx  on picks(match_id);
create index if not exists matches_tournament_code_idx on matches(tournament_code);
create index if not exists matches_status_idx on matches(status);
