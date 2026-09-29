const pad = (n) => String(n).padStart(2, '0')

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayKey = () => toKey(new Date())

// Jam 12:00 supaya perubahan DST tidak menggeser tanggal
const parse = (day) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const addDays = (day, n) => {
  const d = parse(day)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export const weekday = (day) => parse(day).getDay()

export function getCurrentWeekDays(todayStr = todayKey()) {
  const current = parse(todayStr)
  const sunDiff = current.getDay() // 0 = Minggu
  const sunday = new Date(current)
  sunday.setDate(current.getDate() - sunDiff)
  const sunKey = toKey(sunday)
  return Array.from({ length: 7 }, (_, i) => addDays(sunKey, i))
}

export function formatShortDate(dayStr) {
  const d = parse(dayStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
