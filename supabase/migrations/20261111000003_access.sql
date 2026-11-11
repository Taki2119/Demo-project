-- ─────────────────────────────────────────────────────────────────────────────
-- READ ACCESS — a READ-ONLY role for Vercel (board-data + the AI's query tool).
--
-- The guardrail is POSTGRES PERMISSIONS, not a regex in code:
--   · `analytics_reader` has only SELECT on schema `mart`, and cannot touch `raw`;
--   · every transaction is READ ONLY by default + a run-time limit ⇒ SQL written by the AI, even
--     if wrong, can write nothing and cannot hang the DB.
--
-- ⚠ The password is NOT in the repo. After running the migration, set it by hand in Supabase's
--   SQL editor (see docs/SCHEMA.md §6):
--     alter role analytics_reader with login password '<strong password>';
--   then store the connection string only in Vercel's environment variables.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'analytics_reader') then
    create role analytics_reader nologin;
  end if;
end
$$;

alter role analytics_reader set default_transaction_read_only = on;
alter role analytics_reader set statement_timeout = '15s';
alter role analytics_reader set idle_in_transaction_session_timeout = '30s';
alter role analytics_reader set search_path = mart;

revoke all on schema raw from analytics_reader;
grant usage on schema mart to analytics_reader;
grant select on all tables in schema mart to analytics_reader;   -- includes views + materialized views
grant execute on function mart.as_of() to analytics_reader;
alter default privileges in schema mart grant select on tables to analytics_reader;
revoke execute on function mart.refresh() from public;

-- Supabase's API roles (anon / authenticated) must not see these 2 schemas. They are not
-- exposed via REST anyway; this is a second layer. Wrapped in an existence check so the migration
-- also runs on plain Postgres (the local test suite).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema raw, mart from %I', r);
      execute format('revoke all on all tables in schema raw, mart from %I', r);
    end if;
  end loop;
end
$$;

-- Enable RLS on every raw table (no policies ⇒ API roles cannot read even if privileges are granted by mistake).
-- The owner role (postgres) and service_role can still write to load data.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'raw' loop
    execute format('alter table raw.%I enable row level security', t);
  end loop;
end
$$;
