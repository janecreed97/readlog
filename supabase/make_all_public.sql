-- Set all existing articles to public.
-- Safe to run multiple times (only updates rows where is_private is true or null).
UPDATE public.articles
SET is_private = false
WHERE is_private IS DISTINCT FROM false;
