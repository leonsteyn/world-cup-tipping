-- ============================================================
-- FIFA World Cup 2026 Tipping — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────────────────────
-- One row per registered user, linked to Supabase Auth.
create table if not exists profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select_all"  on profiles for select using (true);
create policy "profiles_insert_own"  on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on profiles for update using (auth.uid() = id);


-- ── Matches ──────────────────────────────────────────────────────────────────
-- Populated and kept up-to-date by the sync-matches Netlify function.
create table if not exists matches (
  id                  serial primary key,
  tournament_code     text        not null default 'WC2026',
  external_id         integer     unique,          -- football-data.org match ID
  match_date          timestamptz not null,
  team1               text        not null,        -- home team full name
  team2               text        not null,        -- away team full name
  team1_code          text,                        -- TLA e.g. 'ARG'
  team2_code          text,
  team1_country_code  text,                        -- ISO alpha-2 e.g. 'AR'
  team2_country_code  text,
  stage               text,                        -- GROUP_STAGE, LAST_16, etc.
  group_name          text,                        -- 'Group A', null for knockouts
  status              text not null default 'SCHEDULED', -- SCHEDULED | LIVE | FINISHED
  result              text check (result in ('TEAM1','DRAW','TEAM2') or result is null),
  team1_score         integer,
  team2_score         integer,
  last_synced         timestamptz default now()
);

alter table matches enable row level security;

-- Everyone can read matches; only the service role (Netlify function) can write.
create policy "matches_select_all" on matches for select using (true);


-- ── Picks ────────────────────────────────────────────────────────────────────
-- One row per player per match. Enforces lock: can only insert/update
-- while the match is still scheduled (match_date in the future).
create table if not exists picks (
  id         serial primary key,
  player_id  uuid references profiles(id) on delete cascade,
  match_id   integer references matches(id) on delete cascade,
  pick       text not null check (pick in ('TEAM1','DRAW','TEAM2')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (player_id, match_id)
);

alter table picks enable row level security;

create policy "picks_select_all" on picks for select using (true);

create policy "picks_insert_own" on picks for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.match_date > now()
        and m.status = 'SCHEDULED'
    )
  );

create policy "picks_update_own" on picks for update
  using (
    auth.uid() = player_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.match_date > now()
        and m.status = 'SCHEDULED'
    )
  );


-- ── Leaderboard view ─────────────────────────────────────────────────────────
create or replace view leaderboard as
select
  p.id,
  p.display_name,
  coalesce(count(case when pk.pick = m.result then 1 end), 0)::int                      as points,
  coalesce(count(pk.id), 0)::int                                                          as total_picks,
  coalesce(count(case when m.status = 'FINISHED' then pk.id end), 0)::int                as settled_picks
from profiles p
left join picks   pk on pk.player_id = p.id
left join matches m  on m.id = pk.match_id
group by p.id, p.display_name
order by points desc, total_picks desc;


-- ── Helper: auto-create profile on signup ───────────────────────────────────
-- Optional: fires when a new auth.users row is created.
-- Remove if you prefer to create the profile explicitly from the client.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
