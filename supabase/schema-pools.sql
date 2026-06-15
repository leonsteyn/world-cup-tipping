-- ─────────────────────────────────────────────────────────────────────────────
-- Pools: Schema, RLS and initial data
-- Run in Supabase SQL Editor AFTER schema-child-accounts.sql has been applied.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Pools table
create table if not exists pools (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references profiles(id) on delete cascade,
  tournament_code  text not null default 'WC2026',
  name             text not null,
  is_open          boolean not null default false,
  created_at       timestamptz not null default now()
);

-- 2. Pool members
create table if not exists pool_members (
  pool_id    uuid not null references pools(id) on delete cascade,
  player_id  uuid not null references profiles(id) on delete cascade,
  added_by   uuid not null references profiles(id),
  joined_at  timestamptz not null default now(),
  primary key (pool_id, player_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists pools_owner_idx      on pools (owner_id);
create index if not exists pool_members_pool_idx on pool_members (pool_id);
create index if not exists pool_members_player_idx on pool_members (player_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table pools        enable row level security;
alter table pool_members enable row level security;

-- Helper to avoid recursive RLS on pool_members
create or replace function is_pool_member(p_pool_id uuid, p_user_id uuid)
returns boolean language sql security definer as $$
  select exists (select 1 from pool_members where pool_id = p_pool_id and player_id = p_user_id);
$$;

-- pools: SELECT
--   - pool owner always sees their own pools
--   - parents see all open pools
--   - members see pools they belong to
create policy "pools_select" on pools for select using (
  owner_id = auth.uid()
  or is_open = true
  or is_pool_member(id, auth.uid())
);

-- pools: INSERT — only parents (account_type = 'parent') may create pools
create policy "pools_insert" on pools for insert with check (
  owner_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and account_type = 'parent')
);

-- pools: UPDATE / DELETE — owner only
create policy "pools_update" on pools for update using (owner_id = auth.uid());
create policy "pools_delete" on pools for delete using (owner_id = auth.uid());

-- pool_members: SELECT — fellow members, pool owner, or your own row
create policy "pool_members_select" on pool_members for select using (
  player_id = auth.uid()
  or exists (select 1 from pools where id = pool_id and owner_id = auth.uid())
  or is_pool_member(pool_id, auth.uid())
);

-- pool_members: INSERT
--   Pool owner can add anyone.
--   Any parent can add their own children to an OPEN pool (or themselves).
create policy "pool_members_insert" on pool_members for insert with check (
  added_by = auth.uid()
  and (
    exists (select 1 from pools where id = pool_id and owner_id = auth.uid())
    or (
      exists (select 1 from pools where id = pool_id and is_open = true)
      and (
        player_id = auth.uid()
        or exists (select 1 from child_accounts where id = player_id and parent_id = auth.uid())
      )
    )
  )
);

-- pool_members: DELETE — pool owner or the person who added the member
create policy "pool_members_delete" on pool_members for delete using (
  added_by = auth.uid()
  or exists (select 1 from pools where id = pool_id and owner_id = auth.uid())
);

-- ─── Initial data: Steyn Family pool ────────────────────────────────────────

-- Create the pool owned by leonsteyn@gmail.com
with parent as (
  select p.id from profiles p
  join auth.users u on u.id = p.id
  where u.email = 'leonsteyn@gmail.com'
)
insert into pools (owner_id, tournament_code, name, is_open)
select id, 'WC2026', 'Steyn Family', false from parent
on conflict do nothing;

-- Add ALL existing profiles to the Steyn Family pool
with parent as (
  select p.id from profiles p
  join auth.users u on u.id = p.id
  where u.email = 'leonsteyn@gmail.com'
),
steyn_pool as (
  select id from pools where name = 'Steyn Family' and owner_id = (select id from parent)
)
insert into pool_members (pool_id, player_id, added_by)
select sp.id, p.id, par.id
from profiles p
cross join steyn_pool sp
cross join parent par
on conflict do nothing;
