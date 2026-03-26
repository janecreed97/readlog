-- ReadLog schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Articles table
create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  url           text not null,
  title         text not null default '',
  source        text not null default '',
  published_date date,
  category      text not null default '',
  subcategory   text not null default '',
  is_paywalled  boolean not null default false,
  article_type  text not null default 'article' check (article_type in ('article', 'video')),
  created_at    timestamptz not null default now()
);

-- Bullets table
create table public.bullets (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  content     text not null default '',
  position    int not null default 0
);

-- Indexes
create index articles_user_id_idx on public.articles(user_id);
create index articles_created_at_idx on public.articles(user_id, created_at desc);
create index bullets_article_id_idx on public.bullets(article_id);

-- Row Level Security
alter table public.articles enable row level security;
alter table public.bullets enable row level security;

-- Articles policies
create policy "Users can view their own articles"
  on public.articles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own articles"
  on public.articles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own articles"
  on public.articles for update
  using (auth.uid() = user_id);

create policy "Users can delete their own articles"
  on public.articles for delete
  using (auth.uid() = user_id);

-- Bullets policies (scoped through article ownership)
create policy "Users can view bullets for their articles"
  on public.bullets for select
  using (
    exists (
      select 1 from public.articles
      where articles.id = bullets.article_id
        and articles.user_id = auth.uid()
    )
  );

create policy "Users can insert bullets for their articles"
  on public.bullets for insert
  with check (
    exists (
      select 1 from public.articles
      where articles.id = bullets.article_id
        and articles.user_id = auth.uid()
    )
  );

create policy "Users can update bullets for their articles"
  on public.bullets for update
  using (
    exists (
      select 1 from public.articles
      where articles.id = bullets.article_id
        and articles.user_id = auth.uid()
    )
  );

create policy "Users can delete bullets for their articles"
  on public.bullets for delete
  using (
    exists (
      select 1 from public.articles
      where articles.id = bullets.article_id
        and articles.user_id = auth.uid()
    )
  );
