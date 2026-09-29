import { it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
import { fetchAllPages } from './api'

const rows = Array.from({ length: 2500 }, (_, i) => i)

it('mengambil semua halaman melewati 1000 row', async () => {
  const calls = []
  const getPage = async (from, to) => {
    calls.push([from, to])
    return { data: rows.slice(from, to + 1), error: null }
  }
  expect(await fetchAllPages(getPage)).toEqual(rows)
  expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999], [2500, 3499]])
})

it('tetap lengkap kalau server membatasi 500 row per request', async () => {
  const getPage = async (from, to) => ({ data: rows.slice(from, Math.min(to + 1, from + 500)), error: null })
  expect(await fetchAllPages(getPage)).toEqual(rows)
})

it('melempar error Supabase', async () => {
  await expect(fetchAllPages(async () => ({ data: null, error: new Error('boom') }))).rejects.toThrow('boom')
})
