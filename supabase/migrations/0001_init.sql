-- Yumvote initial schema (see CLAUDE.md section 7)
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  birthdate    date not null,
  phone        text not null,
  email        text,
  created_at   timestamptz not null default now(),
  unique (name, birthdate, phone)
);

create table if not exists groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'friends',
  owner_id      uuid not null references users(id) on delete cascade,
  invite_token  text not null unique,
  created_at    timestamptz not null default now()
);

create table if not exists group_members (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  center_lat  double precision not null,
  center_lng  double precision not null,
  radius_m    int not null default 3000,
  status      text not null default 'collecting' check (status in ('collecting', 'voting', 'closed')),
  candidates  jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists preferences (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  raw_text    text not null default '',
  parsed      jsonb,
  passed      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists votes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  restaurant  text not null,
  created_at  timestamptz not null default now(),
  unique (session_id, user_id)
);

-- MVP-level RLS: allow the anon key full read/write. Tighten before any
-- real-world/public rollout (e.g. scope writes to the authenticated user).
alter table users enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table sessions enable row level security;
alter table preferences enable row level security;
alter table votes enable row level security;

create policy "anon full access" on users for all using (true) with check (true);
create policy "anon full access" on groups for all using (true) with check (true);
create policy "anon full access" on group_members for all using (true) with check (true);
create policy "anon full access" on sessions for all using (true) with check (true);
create policy "anon full access" on preferences for all using (true) with check (true);
create policy "anon full access" on votes for all using (true) with check (true);
