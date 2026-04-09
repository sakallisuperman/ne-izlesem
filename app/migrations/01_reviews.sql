-- Reviews tablosu: kullanıcıların film/dizi yorumları ve puanları
-- Ne İzlesem? - Migration 01

CREATE TABLE IF NOT EXISTS reviews (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name   text NOT NULL DEFAULT '',
  movie_title text NOT NULL,
  movie_type  text NOT NULL DEFAULT 'film',
  rating      int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- İndeksler
CREATE INDEX IF NOT EXISTS reviews_movie_title_idx ON reviews (movie_title);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews (user_id);

-- Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT
  USING (true);

-- Sadece giriş yapmış kullanıcı kendi yorumunu ekleyebilir
CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sadece kendi yorumunu silebilir
CREATE POLICY "reviews_delete_own"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);
