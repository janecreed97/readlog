-- Add email_notifications preference to profiles
alter table public.profiles
  add column if not exists email_notifications boolean not null default false;

-- Comment for clarity
comment on column public.profiles.email_notifications is
  'User has opted in to receive email when someone shares an article with them';
