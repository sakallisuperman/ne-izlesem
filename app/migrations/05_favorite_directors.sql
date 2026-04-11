-- 05_favorite_directors.sql
-- Favori yönetmenler tablosu

CREATE TABLE IF NOT EXISTS favorite_directors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  director_id    integer NOT NULL,
  director_name  text NOT NULL,
  profile_path   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, director_id)
);

ALTER TABLE favorite_directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcı kendi favori yönetmenlerini okur"
  ON favorite_directors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi favori yönetmenlerini ekler"
  ON favorite_directors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi favori yönetmenlerini siler"
  ON favorite_directors FOR DELETE
  USING (auth.uid() = user_id);
