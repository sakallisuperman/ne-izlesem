-- 11_comment_replies.sql
-- Yorum cevaplama (thread) desteği

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES reviews(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS reviews_parent_id_idx ON reviews (parent_id) WHERE parent_id IS NOT NULL;
