-- ─────────────────────────────────────────────────────────────────────────────
-- Child Accounts: Schema, Migration & RLS
-- Run this in your Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add account_type to profiles
alter table profiles
  add column if not exists account_type text not null default 'child'
  check (account_type in ('parent', 'child'));

-- 2. Mark leonsteyn@gmail.com as parent
update profiles
set account_type = 'parent'
where id = (
  select id from auth.users where email = 'leonsteyn@gmail.com'
);

-- 3. Child accounts table
create table if not exists child_accounts (
  id            uuid primary key references auth.users(id) on delete cascade,
  parent_id     uuid not null references profiles(id) on delete cascade,
  username      text not null unique,
  display_name  text not null,
  login_email   text not null unique,   -- actual email stored in auth.users
  created_at    timestamptz not null default now()
);

-- 4. Enrol existing non-parent users as children of leonsteyn@gmail.com
--    (runs safely even if already inserted due to ON CONFLICT DO NOTHING)
insert into child_accounts (id, parent_id, username, display_name, login_email)
select
  p.id,
  (select id from profiles where account_type = 'parent' limit 1) as parent_id,
  lower(replace(p.display_name, ' ', '_')) as username,
  p.display_name,
  u.email as login_email
from profiles p
join auth.users u on u.id = p.id
where p.account_type = 'child'
on conflict (id) do nothing;

-- Also update those profiles to explicitly mark them as child
update profiles
set account_type = 'child'
where account_type != 'parent';

-- 5. RLS on child_accounts
alter table child_accounts enable row level security;

-- Parents can manage their own children
create policy "parent_select_own_children" on child_accounts
  for select using (
    parent_id = auth.uid()
    or id = auth.uid()   -- child can see their own record
  );

create policy "parent_insert_children" on child_accounts
  for insert with check (parent_id = auth.uid());

create policy "parent_update_children" on child_accounts
  for update using (parent_id = auth.uid());

create policy "parent_delete_children" on child_accounts
  for delete using (parent_id = auth.uid());

-- 6. Index for fast username lookup (used by child-login function)
create index if not exists child_accounts_username_idx on child_accounts (username);
create index if not exists child_accounts_parent_idx   on child_accounts (parent_id);

-- 7. Recreate leaderboard view to include account_type
drop view if exists leaderboard;
create or replace view leaderboard as
select
  p.id,
  p.display_name,
  p.account_type,
  coalesce(count(case when pk.pick = m.result then 1 end), 0)::int                     as points,
  coalesce(count(pk.id), 0)::int                                                         as total_picks,
  coalesce(count(case when m.status = 'FINISHED' then pk.id end), 0)::int               as settled_picks
from profiles p
left join picks    pk on pk.player_id = p.id
left join matches  m  on m.id = pk.match_id
group by p.id, p.display_name, p.account_type
order by points desc, total_picks desc;
