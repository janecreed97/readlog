-- Run this in the Supabase SQL Editor

create table if not exists public.tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade not null,
  payload     jsonb       not null,
  created_at  timestamptz default now() not null,
  expires_at  timestamptz not null,
  used        boolean     default false not null
);

alter table public.tokens enable row level security;

create policy "Users can manage their own tokens"
  on public.tokens for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
