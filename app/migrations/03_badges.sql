-- Rozet & Puan sistemi + Platform tercihleri
-- Ne İzlesem? - Migration 03

-- ─── 1. profiles tablosu (platform tercihleri) ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_platforms  text[] DEFAULT '{}',
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Yeni kullanıcı kayıt olunca otomatik profil oluştur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 2. user_points tablosu ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_points (
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_points int  DEFAULT 0    NOT NULL,
  badge        text DEFAULT 'Yeni Üye' NOT NULL
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Rozetler herkese görünür (reviews listesinde badge göstermek için)
CREATE POLICY "user_points_select_all" ON user_points FOR SELECT USING (true);
CREATE POLICY "user_points_insert_own" ON user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_points_update_own" ON user_points FOR UPDATE USING (auth.uid() = user_id);

-- ─── 3. Yardımcı fonksiyonlar ─────────────────────────────────────────────────
-- Puana göre rozet hesapla
CREATE OR REPLACE FUNCTION calculate_badge(p int)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p >= 500 THEN 'Efsane Eleştirmen'
    WHEN p >= 300 THEN 'Film Gurmesi'
    WHEN p >= 150 THEN 'Sinefil'
    WHEN p >= 50  THEN 'Film Sever'
    ELSE               'Yeni Üye'
  END;
$$;

-- Kullanıcıya puan ekle (upsert)
CREATE OR REPLACE FUNCTION add_user_points(p_user_id uuid, p_points int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_points (user_id, total_points, badge)
  VALUES (p_user_id, GREATEST(0, p_points), calculate_badge(GREATEST(0, p_points)))
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_points = GREATEST(0, user_points.total_points + p_points),
    badge        = calculate_badge(GREATEST(0, user_points.total_points + p_points));
END;
$$;

-- Client'ın paylaşım için çağırabileceği fonksiyon (15 puan)
CREATE OR REPLACE FUNCTION award_share_points()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM add_user_points(auth.uid(), 15);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION award_share_points() TO authenticated;

-- ─── 4. Trigger: Review eklenince puan ver ────────────────────────────────────
CREATE OR REPLACE FUNCTION award_review_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE pts int;
BEGIN
  -- Yorum varsa 10, sadece puan verildiyse 5
  pts := CASE WHEN NEW.comment IS NOT NULL AND trim(NEW.comment) != '' THEN 10 ELSE 5 END;
  PERFORM add_user_points(NEW.user_id, pts);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_insert ON reviews;
CREATE TRIGGER on_review_insert
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION award_review_points();

-- ─── 5. Trigger: Review silinince puan geri al ────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_review_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE pts int;
BEGIN
  pts := CASE WHEN OLD.comment IS NOT NULL AND trim(OLD.comment) != '' THEN 10 ELSE 5 END;
  PERFORM add_user_points(OLD.user_id, -pts);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_review_delete ON reviews;
CREATE TRIGGER on_review_delete
  AFTER DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION deduct_review_points();

-- ─── 6. Trigger: Watchlist izlendi işaretlenince 3 puan ───────────────────────
CREATE OR REPLACE FUNCTION award_watched_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'watched' AND (OLD.status IS DISTINCT FROM 'watched') THEN
    PERFORM add_user_points(NEW.user_id, 3);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_watchlist_watched ON watchlist;
CREATE TRIGGER on_watchlist_watched
  AFTER UPDATE ON watchlist
  FOR EACH ROW EXECUTE FUNCTION award_watched_points();
