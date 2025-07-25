-- Chat Sessions Table (like ChatGPT conversations)
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update Chat History Table to include session_id
alter table if exists public.chat_history 
add column if not exists session_id uuid references public.chat_sessions(id) on delete cascade;

-- Enable Row Level Security (RLS)
alter table public.chat_sessions enable row level security;

-- RLS Policies: Only allow users to access their own chat sessions
create policy "Users can view and manage their own chat sessions" on public.chat_sessions
  for all using (auth.uid() = user_id);

-- Update chat history policy to include session_id
drop policy if exists "Users can view and manage their own chat history" on public.chat_history;
create policy "Users can view and manage their own chat history" on public.chat_history
  for all using (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_history.session_id
      and cs.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
create index if not exists idx_chat_sessions_user_updated 
  on public.chat_sessions(user_id, updated_at desc);
create index if not exists idx_chat_history_session_timestamp 
  on public.chat_history(session_id, timestamp asc); 