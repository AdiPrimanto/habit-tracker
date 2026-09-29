import { describe, it, expect } from 'vitest'
import { key, isScheduled, streak, longestStreak, completionRate, cellState } from './stats'
import { addDays } from './dates'

const ALL = [0, 1, 2, 3, 4, 5, 6]
const TODAY = '2026-09-29' // Selasa
const habit = (over = {}) => ({ id: 'h', days: ALL, created_at: '2026-09-01T05:00:00Z', ...over })
const done = (...days) => new Map(days.map((d) => [key('h', d), null]))
const range = (from, to) => {
  const out = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

describe('isScheduled', () => {
  it('false sebelum hari dibuat', () => expect(isScheduled(habit(), '2026-08-31')).toBe(false))
  it('true di hari dibuat', () => expect(isScheduled(habit(), '2026-09-01')).toBe(true))
  it('hari dibuat memakai tanggal WIB', () => {
    const h = habit({ created_at: '2026-09-28T17:30:00Z' }) // 29 Sep 00:30 WIB
    expect(isScheduled(h, '2026-09-28')).toBe(false)
    expect(isScheduled(h, TODAY)).toBe(true)
  })
  it('mengikuti hari dalam minggu', () => {
    const h = habit({ days: [1, 3, 5] })
    expect(isScheduled(h, '2026-09-28')).toBe(true) // Senin
    expect(isScheduled(h, TODAY)).toBe(false) // Selasa
  })
})

describe('streak', () => {
  it('hari berturut-turut', () => expect(streak(habit(), done('2026-09-27', '2026-09-28', TODAY), TODAY)).toBe(3))
  it('hari ini belum dicentang tidak memutus', () => expect(streak(habit(), done('2026-09-27', '2026-09-28'), TODAY)).toBe(2))
  it('putus di hari terjadwal yang terlewat', () =>
    expect(streak(habit(), done('2026-09-25', '2026-09-27', '2026-09-28', TODAY), TODAY)).toBe(3))
  it('melewati hari tidak terjadwal', () => {
    const h = habit({ days: [1, 3, 5] }) // Sen, Rab, Jum
    expect(streak(h, done('2026-09-23', '2026-09-25', '2026-09-28'), TODAY)).toBe(3)
  })
  it('berhenti di hari dibuat', () => {
    const h = habit({ created_at: '2026-09-27T05:00:00Z' })
    expect(streak(h, done('2026-09-27', '2026-09-28', TODAY), TODAY)).toBe(3)
  })
  it('kosong = 0', () => expect(streak(habit(), new Map(), TODAY)).toBe(0))
  it('centang di hari yang kini tidak terjadwal diabaikan', () => {
    const h = habit({ days: [1] }) // Senin saja
    expect(streak(h, done('2026-09-28', TODAY), TODAY)).toBe(1)
  })
})

describe('longestStreak', () => {
  it('run terpanjang', () => {
    const c = done(...range('2026-09-01', '2026-09-05'), ...range('2026-09-10', '2026-09-12'))
    expect(longestStreak(habit(), c, TODAY)).toBe(5)
  })
  it('run yang berakhir kemarin tetap dihitung', () =>
    expect(longestStreak(habit(), done('2026-09-27', '2026-09-28'), TODAY)).toBe(2))
})

describe('completionRate', () => {
  it('hari ini belum dicentang tidak masuk pembagi', () => {
    // 1..29 Sep = 29 hari terjadwal, minus hari ini = 28; 14 dicentang
    expect(completionRate(habit(), done(...range('2026-09-01', '2026-09-14')), TODAY)).toBeCloseTo(0.5)
  })
  it('hari ini sudah dicentang masuk pembagi', () => {
    const c = done(...range('2026-09-01', '2026-09-14'), TODAY)
    expect(completionRate(habit(), c, TODAY)).toBeCloseTo(15 / 29)
  })
  it('null kalau tidak ada hari terjadwal', () => {
    expect(completionRate(habit({ created_at: '2026-09-29T01:00:00Z' }), new Map(), TODAY)).toBeNull()
  })
})

describe('cellState', () => {
  it('future', () => expect(cellState(habit(), new Map(), '2026-09-30', TODAY)).toBe('future'))
  it('todo', () => expect(cellState(habit(), new Map(), '2026-09-28', TODAY)).toBe('todo'))
  it('done', () => expect(cellState(habit(), done('2026-09-28'), '2026-09-28', TODAY)).toBe('done'))
  it('off: tidak terjadwal', () => expect(cellState(habit({ days: [1] }), new Map(), TODAY, TODAY)).toBe('off'))
  it('off: sebelum dibuat', () => expect(cellState(habit(), new Map(), '2026-08-31', TODAY)).toBe('off'))
  it('done walau kini tidak terjadwal', () =>
    expect(cellState(habit({ days: [1] }), done(TODAY), TODAY, TODAY)).toBe('done'))
  it('off: di luar jendela data', () => {
    const h = habit({ created_at: '2025-01-01T05:00:00Z' })
    expect(cellState(h, new Map(), addDays(TODAY, -366), TODAY)).toBe('off')
  })
})
