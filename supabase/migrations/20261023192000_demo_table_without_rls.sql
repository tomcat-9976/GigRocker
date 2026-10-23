-- DEMO ONLY, to be reverted in this pull request. Never apply this anywhere.
--
-- Creates a table without Row Level Security, the same mistake that left
-- three tables open before 2026-10-22. The CI database tests should fail and
-- name this table.

create table public.demo_unprotected_notes (
  id   uuid primary key default gen_random_uuid(),
  note text
);
