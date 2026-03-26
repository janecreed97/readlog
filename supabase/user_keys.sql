-- Personal bookmarklet key per user (stable, embeds in bookmarklet JS)
create table if not exists public.user_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bookmarklet_key uuid not null default gen_random_uuid(),
  created_at timestamptz default now() not null
);

alter table public.user_keys enable row level security;

create policy "Users can manage own keys"
  on public.user_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
