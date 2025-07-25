-- Chat History Table
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_text text not null,
  is_user_message boolean not null,
  timestamp timestamptz not null default now(),
  insights jsonb,
  recommendations jsonb,
  reformulated_query text,
  metrics jsonb
);

-- Enable Row Level Security (RLS)
alter table public.chat_history enable row level security;

-- RLS Policies: Only allow users to access their own chat history
create policy "Users can view and manage their own chat history" on public.chat_history
  for all using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists idx_chat_history_user_timestamp 
  on public.chat_history(user_id, timestamp desc); 