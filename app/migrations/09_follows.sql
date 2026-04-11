-- 09_follows.sql
-- Takip sistemi

CREATE TABLE IF NOT EXISTS follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes takip ilişkilerini okur"
  ON follows FOR SELECT USING (true);

CREATE POLICY "Kullanıcı kendi takibini ekler"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Kullanıcı kendi takibini siler"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);
