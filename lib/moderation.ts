const BANNED_WORDS = [
  // Küfürler
  'orospu', 'orsp', 'ospu', 'oç', 'oq', 'amk', 'amına', 'amın', 'amcık',
  'göt', 'götün', 'gote', 'sik', 'sikerim', 'sikeyim', 'siktir', 'sikiş',
  'yarrak', 'yarak', 'penis', 'vajina', 'ibne', 'ibnelik',
  'pezevenk', 'pezeveng', 'piç', 'piçlik', 'piclerin',
  'kahpe', 'kaltak', 'fahişe', 'sürtük', 'orospuçocuğu',
  'şerefsiz', 'serefsiz', 'şerefsizlik', 'alçak', 'aşağılık',
  'gerizekalı', 'gerzek', 'salak', 'aptal', 'mal', 'mankafa',
  'it', 'köpek', 'eşek', 'eşşek', 'domuz', 'hayvan',
  'nişanlısını', 'götveren', 'dönme',
  'bok', 'boktan', 'boklu',
  'lanet', 'kahretsin', 'defol', 'çekil',
  'rezil', 'kepaze', 'utanmaz',
  // Kısaltmalar / varyasyonlar
  'amq', 'sg', 'sgg', 'orosb', 'bok',
  // Hakaret türleri
  'pislik', 'çöp', 'berbat adam', 'adi herif',
  'göbeğini', 'götünü', 'sünepe', 'serseri',
  'katmerli', 'boku', 'çiroz',
]

const SPOILER_WORDS = [
  'ölüyor', 'öldürüyor', 'öldürülüyor', 'öldürüldü', 'ölür', 'ölüm sahnesi',
  'öldü', 'ölmüş', 'ölmüyor', 'ölmedi',
  'katildir', 'katil aslında', 'gerçek katil',
  'sonunda öğreniyoruz', 'sonunda ortaya çıkıyor', 'son sahnede',
  'final sahnesinde', 'son bölümde', 'son sezonda',
  'aslında o', 'aslında o ki', 'meğer o', 'meğerse o',
  'gerçek kimliği', 'gizli kimliği',
  'twist var', 'büyük twist', 'sürpriz son',
  'bitişi', 'nasıl bitiyor', 'sonunu söyleyeyim',
  'spoiler', 'spoil edeyim', 'spoil',
  'ihanet eder', 'ihanetiyle', 'hain çıkıyor',
  'ölüm haberi', 'ölümü ortaya',
]

export function moderateComment(text: string): { approved: boolean; reason: string } {
  const lower = text.toLowerCase()

  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      return {
        approved: false,
        reason: 'Yorumunuz bazı uygunsuz ifadeler içerdiği için yayınlanamadı.',
      }
    }
  }

  for (const word of SPOILER_WORDS) {
    if (lower.includes(word)) {
      return {
        approved: false,
        reason: 'Yorumunuz spoiler içeriyor olabilir. Lütfen spoiler vermeden yorum yapın.',
      }
    }
  }

  return { approved: true, reason: '' }
}
