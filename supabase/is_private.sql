-- Add is_private column to articles (default: public)
alter table public.articles
  add column if not exists is_private boolean not null default false;

-- Allow authenticated users to read any public article (needed for profile pages).
-- The existing "Users can select own articles" policy already covers your own private articles.
-- These two policies are OR'd together by Postgres RLS.
drop policy if exists "Public articles readable by authenticated users" on public.articles;
create policy "Public articles readable by authenticated users"
  on public.articles
  for select
  using (auth.role() = 'authenticated' and is_private = false);
