-- 06_nickname.sql
-- profiles tablosuna nickname sütunu ekle

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text UNIQUE;
