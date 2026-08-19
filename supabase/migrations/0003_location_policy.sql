-- Lets a group choose who is allowed to (re)set a session's location.
alter table groups
  add column if not exists location_policy text not null default 'anyone'
  check (location_policy in ('anyone', 'leader_only'));
