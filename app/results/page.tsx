interface Recommendation {
  title: string
  turkish_title: string
  type: string
  year: number
  duration: string
  imdb: number
  platform: string
  platform: string
  reason: string
  tags: string[]
}
```

Aynı dosyada şu satırı bul:
```
<span>⭐ {rec.imdb}</span>
                  {rec.platform && <span>📺 {rec.platform}</span>}
```

Hemen altına şunu ekle:
```
{rec.platform && <span>📺 {rec.platform}</span>}