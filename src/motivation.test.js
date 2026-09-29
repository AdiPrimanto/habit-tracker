import { it, expect } from 'vitest'
import { ACHIEVED_MESSAGES, FAILED_MESSAGES, ANIMATIONS, pickRandom } from './motivation'

it('tidak mengulang pilihan sebelumnya', () => {
  const list = ['a', 'b', 'c']
  for (const r of [0, 0.4, 0.99]) expect(pickRandom(list, 'a', () => r)).not.toBe('a')
})
it('list satu elemen tetap mengembalikan elemen itu', () => expect(pickRandom(['x'], 'x', () => 0.5)).toBe('x'))
it('memakai rng', () => {
  expect(pickRandom(['a', 'b', 'c'], undefined, () => 0)).toBe('a')
  expect(pickRandom(['a', 'b', 'c'], undefined, () => 0.99)).toBe('c')
})
it('cukup banyak kalimat unik', () => {
  expect(new Set(ACHIEVED_MESSAGES).size).toBeGreaterThanOrEqual(15)
  expect(new Set(FAILED_MESSAGES).size).toBeGreaterThanOrEqual(15)
})
it('varian animasi', () => expect(ANIMATIONS).toEqual(['confetti', 'fireworks', 'stars', 'balloons', 'trophy']))
