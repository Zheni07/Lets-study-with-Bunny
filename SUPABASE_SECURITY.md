## Supabase security lints fix (RLS)

Your Supabase lints report:
- RLS disabled on public tables
- Sensitive column exposed (`public.users.password`)

This repo's backend connects directly to Postgres via `DATABASE_URL` (it does **not** use Supabase Data API / PostgREST),
so the safest fix is to **enable RLS** and **deny** access for API roles on sensitive tables.

### Apply the fix

1. Supabase Dashboard → **SQL Editor**
2. Paste and run the script in `supabase/rls.sql`

### What it does

- Enables RLS on: `users`, `articles`, `password_reset_tokens`, `games`, `schema_migrations`
- Revokes all privileges for `anon`/`authenticated` on sensitive tables (`users`, `password_reset_tokens`, `schema_migrations`)
- Allows **public read** (`select`) on `articles` and `games` via explicit RLS policies

If you want `articles`/`games` to be private too, remove the `grant select ...` lines and the two `create policy ...` blocks.

