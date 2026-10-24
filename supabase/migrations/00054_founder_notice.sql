-- 00054_founder_notice.sql
--
-- A founder post can go to every player, not only the players who follow the
-- founder. It shows as a notice at the top of the dashboard, which a player
-- can dismiss, and it stops showing after 14 days. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
--   1. One new column, everyone, false by default, so every existing post
--      stays a follower post.
--   2. Nothing about access changes. Every signed-in player could already read
--      founder posts (00050); the dashboard simply asks for the newest one
--      marked everyone. Posts are still written only by the server for the
--      owner account (api/founder/posts), so a player cannot make one.
--   3. The notice is plain text of at most 500 characters, like every founder
--      post, and nobody can reply to it.

ALTER TABLE public.founder_posts ADD COLUMN IF NOT EXISTS everyone boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_founder_posts_everyone_created
  ON public.founder_posts(created_at DESC) WHERE everyone;
