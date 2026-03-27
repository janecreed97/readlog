-- Emoji reactions on individual shares
create table if not exists public.share_reactions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid references public.shares(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz default now() not null,
  unique (share_id, user_id)   -- one reaction per user per share (clicking again changes it)
);
alter table public.share_reactions enable row level security;
create policy "Participants can read reactions"
  on public.share_reactions for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.shares
      where id = share_id
        and (sender_id = auth.uid() or recipient_id = auth.uid())
    )
  );
create policy "Users can insert own reactions"
  on public.share_reactions for insert
  with check (auth.uid() = user_id);
create policy "Users can update own reactions"
  on public.share_reactions for update
  using (auth.uid() = user_id);
create policy "Users can delete own reactions"
  on public.share_reactions for delete
  using (auth.uid() = user_id);

-- Comments on individual shares
create table if not exists public.share_comments (
  id uuid primary key default gen_random_uuid(),
  share_id uuid references public.shares(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz default now() not null
);
alter table public.share_comments enable row level security;
create policy "Participants can read comments"
  on public.share_comments for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.shares
      where id = share_id
        and (sender_id = auth.uid() or recipient_id = auth.uid())
    )
  );
create policy "Users can insert own comments"
  on public.share_comments for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own comments"
  on public.share_comments for delete
  using (auth.uid() = user_id);
