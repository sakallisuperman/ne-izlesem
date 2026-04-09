-- En çok izlenen filmler için veritabanı fonksiyonu
-- SECURITY DEFINER ile RLS'yi bypass ederek tüm kullanıcıların verilerinden toplar
-- Ne İzlesem? - Migration 02

CREATE OR REPLACE FUNCTION get_popular_movies()
RETURNS TABLE(
  title         text,
  turkish_title text,
  type          text,
  watch_count   bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    title,
    MAX(turkish_title) AS turkish_title,
    MAX(type)          AS type,
    COUNT(*)           AS watch_count
  FROM watchlist
  WHERE status = 'watched'
  GROUP BY title
  ORDER BY watch_count DESC
  LIMIT 5;
$$;

-- Anonim ve giriş yapmış kullanıcılar çağırabilir
GRANT EXECUTE ON FUNCTION get_popular_movies() TO anon, authenticated;
