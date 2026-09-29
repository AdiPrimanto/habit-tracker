import { describe, it, expect } from 'vitest'
import { toKey, addDays, weekday, getCurrentWeekDays, formatShortDate } from './dates'

describe('dates', () => {
  it('test berjalan di Asia/Jakarta', () => {
    expect(new Date('2026-01-01T00:00:00Z').getTimezoneOffset()).toBe(-420)
  })

  it('toKey memakai tanggal lokal (WIB), bukan UTC', () => {
    expect(toKey(new Date('2026-09-28T17:30:00Z'))).toBe('2026-09-29') // 00:30 WIB
  })

  it('toKey menambah nol di depan', () => {
    expect(toKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })

  it('addDays melewati batas bulan, tahun, kabisat', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-09-29', -365)).toBe('2025-09-29')
  })

  it('weekday: 0=Minggu', () => {
    expect(weekday('2026-09-29')).toBe(2) // Selasa
    expect(weekday('2026-09-27')).toBe(0) // Minggu
  })

  it('getCurrentWeekDays mengembalikan 7 hari minggu ini dari Minggu ke Sabtu', () => {
    const days = getCurrentWeekDays('2026-09-29') // Selasa
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-09-27') // Minggu
    expect(days[2]).toBe('2026-09-29') // Selasa
    expect(days[6]).toBe('2026-10-03') // Sabtu
  })

  it('formatShortDate memformat tanggal pendek indonesia', () => {
    expect(formatShortDate('2026-09-29')).toMatch(/29\s*Sep/)
  })
})
