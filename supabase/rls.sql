-- Supabase Security Fix: enable RLS + safe public policies
-- Run this in Supabase Dashboard -> SQL Editor.
--
-- Goal:
-- - Close security lints: RLS disabled in public schema, sensitive columns exposed.
-- - Keep your Node backend working (it connects as a privileged DB role via DATABASE_URL).
-- - Allow public read access to articles/games (if desired).

begin;

-- 1) Enable RLS on exposed public tables
alter table if exists public.users enable row level security;
alter table if exists public.articles enable row level security;
alter table if exists public.password_reset_tokens enable row level security;
alter table if exists public.games enable row level security;
alter table if exists public.schema_migrations enable row level security;

-- (Optional) Force RLS even for table owner (usually not needed; keep commented)
-- alter table public.users force row level security;
-- alter table public.password_reset_tokens force row level security;

-- 2) Lock down sensitive tables from Supabase API roles
-- These roles are used by PostgREST (Supabase Data API).
revoke all on table public.users from anon, authenticated;
revoke all on table public.password_reset_tokens from anon, authenticated;
revoke all on table public.schema_migrations from anon, authenticated;

-- 3) Public read-only access for content tables (articles, games)
-- If you do NOT want them public, delete these GRANT + policies.
grant select on table public.articles to anon, authenticated;
grant select on table public.games to anon, authenticated;

-- Drop old policies if they exist (safe to re-run)
drop policy if exists "public read articles" on public.articles;
drop policy if exists "public read games" on public.games;

create policy "public read articles"
on public.articles
for select
to anon, authenticated
using (true);

create policy "public read games"
on public.games
for select
to anon, authenticated
using (true);

commit;

