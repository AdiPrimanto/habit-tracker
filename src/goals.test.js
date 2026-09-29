import { describe, it, expect } from 'vitest'
import {
  periodDays, goalDays, goalProgress, scheduledDaysBetween, maxTarget, goalInfo,
  achievedDayNumber, dueTransitions, suggestNextTarget, newGoal, validateGoal,
} from './goals'
import { key } from './stats'

const TODAY = '2026-09-29' // Selasa
const ALL = [0, 1, 2, 3, 4, 5, 6]
const habit = (over = {}) => ({ id: 'h', days: ALL, created_at: '2026-08-01T05:00:00Z', ...over })
const goal = (over = {}) => ({
  id: 'g', habit_id: 'h', target: 3, starts_on: '2026-09-27', ends_on: '2026-10-03',
  status: 'active', finished_on: null, ...over,
})
const done = (...days) => new Map(days.map((d) => [key('h', d), null]))

describe('periode', () => {
  it('periodDays inklusif', () => {
    expect(periodDays(goal())).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(goalDays(goal())).toBe(7)
  })
})

describe('goalProgress', () => {
  it('hanya centang di dalam periode dan habit yang sama', () => {
    const c = done('2026-09-26', '2026-09-27', '2026-09-29', '2026-10-04')
    c.set(key('lain', '2026-09-28'), null)
    expect(goalProgress(goal(), c)).toBe(2)
  })
})

describe('jadwal', () => {
  const mwf = habit({ days: [1, 3, 5] }) // Sen, Rab, Jum
  it('scheduledDaysBetween inklusif', () => expect(scheduledDaysBetween(mwf, '2026-09-28', '2026-10-04')).toBe(3))
  it('maxTarget 1 minggu mulai hari ini', () => expect(maxTarget(mwf, TODAY, 7)).toBe(3)) // Rab 30, Jum 2, Sen 5
  it('maxTarget 30 hari', () => expect(maxTarget(mwf, TODAY, 30)).toBe(13))
})

describe('goalInfo', () => {
  it('progres dan sisa hari', () => {
    expect(goalInfo(goal(), habit(), done('2026-09-27'), TODAY)).toEqual({ done: 1, needed: 2, daysLeft: 5, reachable: true })
  })
  it('hari lalu yang belum dicentang masih dihitung sebagai kapasitas', () => {
    const g = goal({ target: 6, ends_on: '2026-09-30' }) // 27..30 = 4 hari
    expect(goalInfo(g, habit(), new Map(), TODAY).reachable).toBe(false) // butuh 6, kapasitas 4
    const g2 = goal({ target: 4, ends_on: '2026-09-30' })
    expect(goalInfo(g2, habit(), new Map(), TODAY).reachable).toBe(true) // 27, 28 bisa disusulkan
  })
  it('hari tidak terjadwal bukan kapasitas', () => {
    const g = goal({ target: 3 })
    expect(goalInfo(g, habit({ days: [1] }), new Map(), TODAY).reachable).toBe(false) // hanya Senin 28
  })
  it('periode lewat → daysLeft 0', () => {
    expect(goalInfo(goal(), habit(), new Map(), '2026-10-05').daysLeft).toBe(0)
  })
  it('needed tidak negatif', () => {
    expect(goalInfo(goal({ target: 1 }), habit(), done('2026-09-27', '2026-09-28'), TODAY).needed).toBe(0)
  })
})

describe('achievedDayNumber', () => {
  it('hari ke-N sejak mulai', () => expect(achievedDayNumber(goal({ status: 'achieved', finished_on: '2026-09-29' }))).toBe(3))
})

describe('dueTransitions', () => {
  it('achieve kalau progres >= target', () => {
    const r = dueTransitions([goal({ target: 2 })], done('2026-09-27', '2026-09-28'), TODAY)
    expect(r.achieve.map((g) => g.id)).toEqual(['g'])
    expect(r.fail).toEqual([])
  })
  it('tidak fail di hari ends_on', () => {
    expect(dueTransitions([goal()], new Map(), '2026-10-03').fail).toEqual([])
  })
  it('fail sehari setelah ends_on', () => {
    expect(dueTransitions([goal()], new Map(), '2026-10-04').fail.map((g) => g.id)).toEqual(['g'])
  })
  it('abaikan yang bukan active', () => {
    const r = dueTransitions([goal({ status: 'cancelled', finished_on: TODAY })], new Map(), '2026-10-10')
    expect(r).toEqual({ achieve: [], fail: [] })
  })
})

describe('suggestNextTarget', () => {
  it('tercapai → naik 10% dibulatkan ke atas', () => {
    expect(suggestNextTarget(goal({ target: 10, status: 'achieved' }), habit(), TODAY, 30)).toBe(11)
    expect(suggestNextTarget(goal({ target: 3, status: 'achieved' }), habit(), TODAY, 30)).toBe(4)
  })
  it('dibatasi maxTarget', () => {
    expect(suggestNextTarget(goal({ target: 13, status: 'achieved' }), habit({ days: [1, 3, 5] }), TODAY, 30)).toBe(13)
  })
  it('gagal/batal → target sama', () => {
    expect(suggestNextTarget(goal({ target: 10, status: 'failed' }), habit(), TODAY, 30)).toBe(10)
    expect(suggestNextTarget(goal({ target: 10, status: 'cancelled' }), habit(), TODAY, 30)).toBe(10)
  })
  it('minimal 1', () => {
    expect(suggestNextTarget(goal({ target: 5, status: 'failed' }), habit({ days: [1] }), '2026-09-29', 1)).toBe(1)
  })
})

describe('newGoal', () => {
  it('mulai hari ini, berakhir days-1 hari kemudian', () => {
    expect(newGoal({ habitId: 'h', target: 10, days: 30 }, TODAY)).toEqual({ habit_id: 'h', target: 10, starts_on: TODAY, ends_on: '2026-10-28' })
  })
})

describe('validateGoal', () => {
  const mwf = habit({ days: [1, 3, 5] })
  it('valid', () => expect(validateGoal({ target: 3, days: 7 }, mwf, TODAY)).toBeNull())
  it('melebihi hari terjadwal', () => expect(validateGoal({ target: 10, days: 7 }, mwf, TODAY)).toBe('Maksimal 3x di periode ini.'))
  it('durasi di luar batas', () => {
    expect(validateGoal({ target: 1, days: 0 }, mwf, TODAY)).toBe('Durasi harus 1–365 hari.')
    expect(validateGoal({ target: 1, days: 366 }, mwf, TODAY)).toBe('Durasi harus 1–365 hari.')
  })
  it('target < 1 atau bukan bilangan bulat', () => {
    expect(validateGoal({ target: 0, days: 7 }, mwf, TODAY)).toBe('Target minimal 1x.')
    expect(validateGoal({ target: 1.5, days: 7 }, mwf, TODAY)).toBe('Target minimal 1x.')
  })
  it('tidak ada hari terjadwal', () => {
    expect(validateGoal({ target: 1, days: 1 }, mwf, TODAY)).toBe('Tidak ada hari terjadwal di periode ini.')
  })
})
