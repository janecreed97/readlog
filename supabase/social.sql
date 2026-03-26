-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  username text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  avatar_url text,
  created_at timestamptz default now() not null
);
create unique index if not exists profiles_username_idx on public.profiles (lower(username));
alter table public.profiles enable row level security;
create policy "Authenticated users can read profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz default now() not null,
  accepted_at timestamptz,
  constraint no_self_friend check (requester_id != addressee_id),
  constraint unique_friendship unique (requester_id, addressee_id)
);
alter table public.friendships enable row level security;
create policy "Users see own friendships" on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can send requests" on public.friendships for insert with check (auth.uid() = requester_id);
create policy "Addressee can accept/decline" on public.friendships for update using (auth.uid() = addressee_id);
create policy "Either party can unfriend" on public.friendships for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Shares
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  note text check (char_length(note) <= 280),
  status text not null default 'unread' check (status in ('unread', 'read', 'saved', 'dismissed')),
  payload jsonb not null default '{}',
  sent_at timestamptz default now() not null,
  read_at timestamptz,
  saved_at timestamptz
);
alter table public.shares enable row level security;
create policy "Senders can read own shares" on public.shares for select using (auth.uid() = sender_id);
create policy "Recipients can read shares" on public.shares for select using (auth.uid() = recipient_id);
create policy "Senders can insert" on public.shares for insert with check (auth.uid() = sender_id);
create policy "Recipients can update status" on public.shares for update using (auth.uid() = recipient_id);

-- Add shared_by to articles
alter table public.articles add column if not exists shared_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists shared_by_name text;
