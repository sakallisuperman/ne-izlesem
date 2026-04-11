-- 08_comment_likes.sql
-- Yorum beğeni tablosu

CREATE TABLE IF NOT EXISTS comment_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_id  uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, review_id)
);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes beğenileri okur"
  ON comment_likes FOR SELECT USING (true);

CREATE POLICY "Kullanıcı kendi beğenisini ekler"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcı kendi beğenisini siler"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);
