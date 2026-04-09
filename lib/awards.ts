// Ödüllü filmler veritabanı
// 🏆 Oscar (En İyi Film)  🌍 Oscar Uluslararası  🌿 Cannes (Palme d'Or)  🦁 Venedik  🐻 Berlin

export interface FilmAward {
  label: string
  color: string
}

// Anahtar: normalize edilmiş İngilizce orijinal isim (küçük harf)
const AWARDS_DB: Record<string, FilmAward[]> = {
  // Oscar En İyi Film
  'oppenheimer':                            [{ label: '🏆 Oscar 2024', color: '#f59e0b' }],
  'everything everywhere all at once':      [{ label: '🏆 Oscar 2023', color: '#f59e0b' }],
  'coda':                                   [{ label: '🏆 Oscar 2022', color: '#f59e0b' }],
  'nomadland':                              [{ label: '🏆 Oscar 2021', color: '#f59e0b' }, { label: '🦁 Venedik 2020', color: '#a855f7' }],
  'parasite':                               [{ label: '🏆 Oscar 2020', color: '#f59e0b' }, { label: '🌿 Cannes 2019', color: '#22c55e' }],
  'green book':                             [{ label: '🏆 Oscar 2019', color: '#f59e0b' }],
  'the shape of water':                     [{ label: '🏆 Oscar 2018', color: '#f59e0b' }, { label: '🦁 Venedik 2017', color: '#a855f7' }],
  'moonlight':                              [{ label: '🏆 Oscar 2017', color: '#f59e0b' }],
  'spotlight':                              [{ label: '🏆 Oscar 2016', color: '#f59e0b' }],
  'birdman':                                [{ label: '🏆 Oscar 2015', color: '#f59e0b' }],
  '12 years a slave':                       [{ label: '🏆 Oscar 2014', color: '#f59e0b' }],
  'argo':                                   [{ label: '🏆 Oscar 2013', color: '#f59e0b' }],
  'the artist':                             [{ label: '🏆 Oscar 2012', color: '#f59e0b' }],
  "the king's speech":                      [{ label: '🏆 Oscar 2011', color: '#f59e0b' }],
  'the hurt locker':                        [{ label: '🏆 Oscar 2010', color: '#f59e0b' }],
  'slumdog millionaire':                    [{ label: '🏆 Oscar 2009', color: '#f59e0b' }],
  'no country for old men':                 [{ label: '🏆 Oscar 2008', color: '#f59e0b' }],
  'the departed':                           [{ label: '🏆 Oscar 2007', color: '#f59e0b' }],
  'crash':                                  [{ label: '🏆 Oscar 2006', color: '#f59e0b' }],
  'million dollar baby':                    [{ label: '🏆 Oscar 2005', color: '#f59e0b' }],
  'the lord of the rings: the return of the king': [{ label: '🏆 Oscar 2004', color: '#f59e0b' }],
  'chicago':                                [{ label: '🏆 Oscar 2003', color: '#f59e0b' }],
  'a beautiful mind':                       [{ label: '🏆 Oscar 2002', color: '#f59e0b' }],
  'gladiator':                              [{ label: '🏆 Oscar 2001', color: '#f59e0b' }],
  'american beauty':                        [{ label: '🏆 Oscar 2000', color: '#f59e0b' }],
  'titanic':                                [{ label: '🏆 Oscar 1998', color: '#f59e0b' }],
  "schindler's list":                       [{ label: '🏆 Oscar 1994', color: '#f59e0b' }],
  'the silence of the lambs':               [{ label: '🏆 Oscar 1992', color: '#f59e0b' }],
  'the godfather':                          [{ label: '🏆 Oscar 1973', color: '#f59e0b' }],
  'the godfather part ii':                  [{ label: '🏆 Oscar 1975', color: '#f59e0b' }],
  'one flew over the cuckoo\'s nest':       [{ label: '🏆 Oscar 1976', color: '#f59e0b' }],
  'annie hall':                             [{ label: '🏆 Oscar 1978', color: '#f59e0b' }],
  'rocky':                                  [{ label: '🏆 Oscar 1977', color: '#f59e0b' }],
  'amadeus':                                [{ label: '🏆 Oscar 1985', color: '#f59e0b' }],
  'forrest gump':                           [{ label: '🏆 Oscar 1995', color: '#f59e0b' }],
  'braveheart':                             [{ label: '🏆 Oscar 1996', color: '#f59e0b' }],
  'unforgiven':                             [{ label: '🏆 Oscar 1993', color: '#f59e0b' }],
  'rain man':                               [{ label: '🏆 Oscar 1989', color: '#f59e0b' }],
  'platoon':                                [{ label: '🏆 Oscar 1987', color: '#f59e0b' }],
  'gandhi':                                 [{ label: '🏆 Oscar 1983', color: '#f59e0b' }],

  // Oscar Uluslararası Film
  'a separation':                           [{ label: '🌍 Oscar Uluslararası 2012', color: '#3b82f6' }, { label: '🐻 Berlin 2011', color: '#ef4444' }],
  'roma':                                   [{ label: '🌍 Oscar Uluslararası 2019', color: '#3b82f6' }, { label: '🦁 Venedik 2018', color: '#a855f7' }],
  'drive my car':                           [{ label: '🌍 Oscar Uluslararası 2022', color: '#3b82f6' }, { label: '🌿 Cannes 2021', color: '#22c55e' }],
  'all quiet on the western front':         [{ label: '🌍 Oscar Uluslararası 2023', color: '#3b82f6' }],
  'the zone of interest':                   [{ label: '🌍 Oscar Uluslararası 2024', color: '#3b82f6' }, { label: '🌿 Cannes 2023', color: '#22c55e' }],
  'anatomy of a fall':                      [{ label: '🌿 Cannes 2023', color: '#22c55e' }],
  'past lives':                             [{ label: '🎖 Gotham 2023', color: '#94a3b8' }],

  // Cannes Palme d'Or
  'pulp fiction':                           [{ label: '🌿 Cannes 1994', color: '#22c55e' }],
  'the piano':                              [{ label: '🌿 Cannes 1993', color: '#22c55e' }],
  'apocalypse now':                         [{ label: '🌿 Cannes 1979', color: '#22c55e' }],
  'the pianist':                            [{ label: '🌿 Cannes 2002', color: '#22c55e' }],
  'fahrenheit 9/11':                        [{ label: '🌿 Cannes 2004', color: '#22c55e' }],
  'the white ribbon':                       [{ label: '🌿 Cannes 2009', color: '#22c55e' }],
  'amour':                                  [{ label: '🌿 Cannes 2012', color: '#22c55e' }],
  'blue is the warmest colour':             [{ label: '🌿 Cannes 2013', color: '#22c55e' }],
  'winter sleep':                           [{ label: '🌿 Cannes 2014', color: '#22c55e' }],
  'kış uykusu':                             [{ label: '🌿 Cannes 2014', color: '#22c55e' }],
  'titane':                                 [{ label: '🌿 Cannes 2021', color: '#22c55e' }],
  'triangle of sadness':                    [{ label: '🌿 Cannes 2022', color: '#22c55e' }],
  'shoplifters':                            [{ label: '🌿 Cannes 2018', color: '#22c55e' }],
  'portrait of a lady on fire':             [{ label: '🌿 Cannes En İyi Senaryo 2019', color: '#22c55e' }],
  'once upon a time in anatolia':           [{ label: '🌿 Cannes Büyük Ödül 2011', color: '#22c55e' }],
  'three monkeys':                          [{ label: '🌿 Cannes En İyi Yönetmen 2008', color: '#22c55e' }],
  'uzak':                                   [{ label: '🌿 Cannes Büyük Ödül 2003', color: '#22c55e' }],

  // Venedik Altın Aslan
  'joker':                                  [{ label: '🦁 Venedik 2019', color: '#a855f7' }],
  'the favourite':                          [{ label: '🦁 Venedik Jüri 2018', color: '#a855f7' }],
  'poor things':                            [{ label: '🦁 Venedik 2023', color: '#a855f7' }],
  'the power of the dog':                   [{ label: '🦁 Venedik En İyi Yönetmen 2021', color: '#a855f7' }],
  'brokeback mountain':                     [{ label: '🦁 Venedik 2005', color: '#a855f7' }],

  // Berlin Altın Ayı
  'there is no evil':                       [{ label: '🐻 Berlin 2020', color: '#ef4444' }],
  'synonyms':                               [{ label: '🐻 Berlin 2019', color: '#ef4444' }],
  'on body and soul':                       [{ label: '🐻 Berlin 2017', color: '#ef4444' }],
  'taxi':                                   [{ label: '🐻 Berlin 2015', color: '#ef4444' }],
  'child\'s pose':                          [{ label: '🐻 Berlin 2013', color: '#ef4444' }],
  'black coal thin ice':                    [{ label: '🐻 Berlin 2014', color: '#ef4444' }],
}

/** Filmin ödüllerini döndürür. title ve originalTitle ile dener. */
export function getFilmAwards(title: string, originalTitle?: string): FilmAward[] {
  const normalize = (s: string) => s.toLowerCase().trim()
    .replace(/['']/g, "'").replace(/[""]/g, '"')

  const t1 = normalize(title)
  const t2 = originalTitle ? normalize(originalTitle) : null

  return AWARDS_DB[t1] || (t2 ? AWARDS_DB[t2] : null) || []
}
