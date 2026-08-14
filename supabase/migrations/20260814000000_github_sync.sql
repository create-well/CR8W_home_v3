-- Migration: github_sync — bidirectional GitHub content sync ledger
-- Adds metadata tables only. Does not alter existing app tables.

create table if not exists public.github_sync_sources (
  id uuid primary key default gen_random_uuid(),
  repo_owner text not null,
  repo_name text not null,
  branch text not null default 'main',
  base_path text not null default 'content',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (repo_owner, repo_name, branch, base_path)
);

create table if not exists public.github_sync_mappings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.github_sync_sources(id) on delete cascade,
  table_name text not null,
  row_id text not null,
  file_path text not null,
  file_format text not null check (file_format in ('json', 'md', 'mdx', 'yaml')),
  github_sha text,
  github_blob_url text,
  github_html_url text,
  last_db_hash text,
  last_file_hash text,
  sync_direction text not null default 'bidirectional'
    check (sync_direction in ('db_to_github', 'github_to_db', 'bidirectional')),
  conflict_policy text not null default 'manual'
    check (conflict_policy in ('db_wins', 'github_wins', 'manual')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_id, table_name, row_id),
  unique (source_id, file_path)
);

create table if not exists public.github_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.github_sync_sources(id) on delete set null,
  direction text not null check (direction in ('push', 'pull', 'bidirectional')),
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  deleted_count integer not null default 0,
  conflicted_count integer not null default 0,
  skipped_count integer not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.github_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid references public.github_sync_mappings(id) on delete cascade,
  run_id uuid references public.github_sync_runs(id) on delete set null,
  table_name text not null,
  row_id text not null,
  file_path text not null,
  db_snapshot jsonb,
  file_snapshot jsonb,
  db_hash text,
  file_hash text,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  resolution text check (resolution in ('db_wins', 'github_wins', 'merged')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.github_sync_sources enable row level security;
alter table public.github_sync_mappings enable row level security;
alter table public.github_sync_runs enable row level security;
alter table public.github_sync_conflicts enable row level security;

create policy "github_sync_sources_dashboard_read" on public.github_sync_sources for select to anon, authenticated using (true);
create policy "github_sync_mappings_dashboard_read" on public.github_sync_mappings for select to anon, authenticated using (true);
create policy "github_sync_runs_dashboard_read" on public.github_sync_runs for select to anon, authenticated using (true);
create policy "github_sync_conflicts_dashboard_read" on public.github_sync_conflicts for select to anon, authenticated using (true);

insert into public.github_sync_sources (repo_owner, repo_name, branch, base_path)
values ('create-well', 'CR8W_home_v3', 'main', 'content')
on conflict (repo_owner, repo_name, branch, base_path) do nothing;
