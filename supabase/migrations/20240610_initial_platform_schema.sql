-- User Profiles Table (linked to auth.users)
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Data Sources Table
create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- e.g., 'csv', 'powerbi', 'tableau', 'snowflake'
  config_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Uploaded CSV Data Table
create table if not exists public.uploaded_csv_data (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  original_filename text not null,
  data_json jsonb not null,
  uploaded_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.user_profiles enable row level security;
alter table public.data_sources enable row level security;
alter table public.uploaded_csv_data enable row level security;

-- RLS Policies: Only allow users to access their own data
create policy "Users can view and manage their own profile" on public.user_profiles
  for all using (auth.uid() = user_id);

create policy "Users can view and manage their own data sources" on public.data_sources
  for all using (auth.uid() = user_id);

create policy "Users can view and manage their own uploaded CSV data" on public.uploaded_csv_data
  for all using (
    exists (
      select 1 from public.data_sources ds
      where ds.id = uploaded_csv_data.data_source_id
      and ds.user_id = auth.uid()
    )
  ); 