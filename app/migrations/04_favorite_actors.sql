-- 04_favorite_actors.sql
-- Favori oyuncular tablosu

CREATE TABLE IF NOT EXISTS favorite_actors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id    integer NOT NULL,
  actor_name  text NOT NULL,
  profile_path text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, actor_id)
);

-- RLS: kullanıcı yalnızca kendi favorilerini okur/yazar
ALTER TABLE favorite_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcı kendi favorilerini okur"
  ON favorite_actors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi favorilerini ekler"
  ON favorite_actors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi favorilerini siler"
  ON favorite_actors FOR DELETE
  USING (auth.uid() = user_id);
