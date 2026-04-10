const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

/**
 * TMDB'den gelen "2024-03-15" formatını "15 Mart 2024" formatına çevirir.
 * Sadece yıl verilmişse (örn. "2024") olduğu gibi döner.
 */
export function formatDateTR(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const y = parts[0]
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    if (!isNaN(m) && m >= 0 && m < 12 && !isNaN(d)) {
      return `${d} ${TR_MONTHS[m]} ${y}`
    }
  }
  if (/^\d{4}$/.test(dateStr)) return dateStr
  return dateStr
}

/** Sadece yıl kısmını döner: "2024-03-15" → "2024" */
export function yearFromDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.substring(0, 4)
}
