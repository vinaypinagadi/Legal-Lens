-- LegalLens Supabase schema
-- Supabase Auth owns auth.users. This script only creates application tables.

create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text,
  source_text text not null,
  status text not null default 'draft'
    check (status in ('draft', 'analyzing', 'ready')),
  summary text,
  risks jsonb not null default '[]'::jsonb,
  risk_count integer not null default 0,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_created_at_idx
  on public.documents(user_id, created_at desc);
create index if not exists chat_history_document_id_created_at_idx
  on public.chat_history(document_id, created_at);

alter table public.documents enable row level security;
alter table public.chat_history enable row level security;

create policy "Users can manage their own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own chat history"
  on public.chat_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);