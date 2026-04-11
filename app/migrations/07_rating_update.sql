-- 07_rating_update.sql
-- reviews tablosundaki rating constraint'ini 1-10 aralığına güncelle

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 10);
