import { it, expect } from 'vitest'
import { moveHabit } from './habits'

const hs = (...pos) => pos.map((p, i) => ({ id: 'abc'[i], position: p }))

it('menukar dengan tetangga', () =>
  expect(moveHabit(hs(0, 1, 2), 'b', -1)).toEqual([{ id: 'b', position: 0 }, { id: 'a', position: 1 }]))
it('tetap jalan saat posisi duplikat', () =>
  expect(moveHabit(hs(0, 0, 0), 'c', -1)).toEqual([{ id: 'c', position: 1 }, { id: 'b', position: 2 }]))
it('tidak bisa naik dari urutan pertama', () => expect(moveHabit(hs(0, 1, 2), 'a', -1)).toEqual([]))
it('tidak bisa turun dari urutan terakhir', () => expect(moveHabit(hs(0, 1, 2), 'c', 1)).toEqual([]))
it('id tidak dikenal', () => expect(moveHabit(hs(0, 1), 'z', 1)).toEqual([]))
