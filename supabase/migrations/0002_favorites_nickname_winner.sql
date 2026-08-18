-- Adds: favorite groups, nickname-based quick login, persisted tie-break winner.
-- Run this in the Supabase SQL editor after 0001_init.sql.

alter table sessions add column if not exists winner_restaurant text;

alter table group_members add column if not exists is_favorite boolean not null default false;

alter table users add column if not exists nickname text unique;
