# Habit Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app habit tracker harian pribadi (checklist ya/tidak) yang sync antar-device, mobile-first.

**Architecture:** SPA Vite + React tanpa server sendiri. Browser memanggil Supabase langsung (Postgres + Google OAuth); isolasi data lewat RLS. Semua logika tanggal/streak/statistik ada di modul JS murni yang dites dengan Vitest; komponen React hanya menampilkan dan memanggil `src/api.js`.

**Tech Stack:** Vite, React, `@supabase/supabase-js` v2, Vitest, CSS biasa.

**Spec:** `docs/superpowers/specs/2026-09-29-habit-tracker-design.md`

## Global Constraints

- Bahasa kode: JavaScript (bukan TypeScript), file komponen `.jsx`.
- Dependency runtime hanya `react`, `react-dom`, `@supabase/supabase-js`. Dev: `vite`, `@vitejs/plugin-react`, `vitest`. Tidak ada lib state/tanggal/UI/router.
- Frontend hanya memakai anon/publishable key (`VITE_SUPABASE_ANON_KEY`). **Service role key tidak boleh masuk ke frontend atau repo.** `.env.local` di-`.gitignore`.
- Format key tanggal: `YYYY-MM-DD` menurut zona waktu lokal device. Weekday: `0=Minggu..6=Sabtu`.
- Nama habit 1–100 karakter; minimal 1 hari terjadwal; catatan ≤280 karakter.
- Data checkins dimuat 365 hari terakhir (`WINDOW = 365`).
- Mobile-first: lebar 375px, area sentuh ≥44×44px untuk checkbox/kotak 7 hari/tombol, font input ≥16px, tab bar bawah dengan `env(safe-area-inset-bottom)`, tidak ada scroll horizontal di level halaman.
- Konfirmasi selalu di dalam UI, **jangan pakai `window.confirm`/`alert`**.
- Error Supabase → toast; state optimistic dikembalikan. Tidak boleh ada perubahan yang diam-diam tidak tersimpan.
- Test dijalankan dengan `TZ=Asia/Jakarta` (lewat script `npm test`).

## Review Focus

1. **Checkins > 1000 row** (5 habit × 365 hari = 1825): PostgREST memotong hasil di `max-rows` (default 1000) tanpa error → riwayat lama hilang diam-diam. Harus dipaginasi sampai halaman kosong. → Task 3, test `fetchAllPages`.
2. **`created_at` UTC vs tanggal lokal:** habit dibuat 00:30 WIB (`17:30Z` hari sebelumnya) harus terhitung mulai hari itu (WIB), bukan kemarin. → Task 1 test `toKey`, Task 2 test `isScheduled`.
3. **Jadwal diubah setelah ada centang:** centang lama di hari yang kini tidak terjadwal tidak boleh memutus/menambah streak atau persentase, tapi kotaknya tetap tampil "done" dan bisa diklik. → Task 2 test `streak`/`cellState`.
4. **Posisi habit duplikat** (semua `0`, misal insert manual): tombol ↑/↓ tetap harus mengubah urutan. → Task 3 test `moveHabit`.
5. **App dibiarkan terbuka melewati tengah malam / double-tap cepat:** "hari ini" harus ikut berganti saat app aktif kembali; double-tap tidak boleh menghasilkan error duplikat atau state kacau. → Task 7 langkah verifikasi manual.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.env.example` | Konfigurasi project |
| `supabase/schema.sql` | Tabel, constraint, RLS |
| `src/dates.js` | Key tanggal lokal, aritmetika tanggal |
| `src/stats.js` | `key`, `isScheduled`, `streak`, `longestStreak`, `completionRate`, `cellState` |
| `src/habits.js` | `moveHabit` (hitung ulang posisi) |
| `src/supabase.js` | Client Supabase |
| `src/api.js` | Semua query Supabase + `fetchAllPages` |
| `src/App.jsx` | Auth gate, load data, state, toggle/note/mutate, tab bar, toast, sheet |
| `src/screens/Login.jsx`, `Today.jsx`, `History.jsx`, `Manage.jsx` | Layar |
| `src/NoteSheet.jsx` | Bottom sheet centang + catatan |
| `src/styles.css` | Semua style |
| `public/manifest.webmanifest`, `public/icon.svg`, PNG icons | PWA |

Deviasi kecil dari spec: `src/api.js` dan `src/habits.js` ditambahkan supaya query Supabase dan logika urutan bisa dites terpisah dari `App.jsx`; `toKey` memakai getter tanggal lokal manual (hasil sama dengan `toLocaleDateString('en-CA')`, tapi jauh lebih cepat karena dipanggil ribuan kali per render).

---

### Task 1: Scaffold project + `dates.js`

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.env.example`, `src/main.jsx`, `src/dates.js`
- Test: `src/dates.test.js`

**Interfaces:**
- Produces:
  - `toKey(date: Date) => string` (`YYYY-MM-DD`, lokal)
  - `todayKey() => string`
  - `addDays(day: string, n: number) => string`
  - `weekday(day: string) => number` (0=Minggu)

- [ ] **Step 1: Init git + package.json**

```bash
cd "/Users/adiprimanto/Developer/Rangkai Web/habit-tracker"
git init
```

`package.json`:
```json
{
  "name": "habit-tracker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "TZ=Asia/Jakarta vitest run"
  }
}
```

```bash
npm install react react-dom @supabase/supabase-js
npm install -D vite @vitejs/plugin-react vitest
```

- [ ] **Step 2: Config files**

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react()] })
```

`.gitignore`:
```
node_modules
dist
.env.local
.env.*.local
.vercel
```

`.env.example`:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

`index.html`:
```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#16a34a" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>Habit Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`src/main.jsx` (sementara, diganti di Task 5):
```jsx
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(<p>Habit Tracker</p>)
```

- [ ] **Step 3: Write the failing test** — `src/dates.test.js`

```js
import { describe, it, expect } from 'vitest'
import { toKey, addDays, weekday } from './dates'

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
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./dates"`.

- [ ] **Step 5: Write implementation** — `src/dates.js`

```js
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react app, add date helpers"
```

---

### Task 2: `stats.js` — jadwal, streak, statistik, status kotak

**Files:**
- Create: `src/stats.js`
- Test: `src/stats.test.js`

**Interfaces:**
- Consumes: `toKey`, `addDays`, `weekday` dari `src/dates.js`.
- Produces (semua murni; `habit = { id, days: number[], created_at: string ISO }`, `checkins: Map<string, string|null>` dengan key dari `key()`, `today: 'YYYY-MM-DD'`):
  - `WINDOW = 365`
  - `key(habitId: string, day: string) => string` (`"habitId|day"`)
  - `isScheduled(habit, day) => boolean`
  - `streak(habit, checkins, today) => number`
  - `longestStreak(habit, checkins, today) => number`
  - `completionRate(habit, checkins, today) => number | null` (0..1, `null` kalau tidak ada hari terjadwal)
  - `cellState(habit, checkins, day, today) => 'future' | 'done' | 'todo' | 'off'`

- [ ] **Step 1: Write the failing test** — `src/stats.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./stats"`.

- [ ] **Step 3: Write implementation** — `src/stats.js`

```js
import { toKey, addDays, weekday } from './dates'

export const WINDOW = 365

export const key = (habitId, day) => `${habitId}|${day}`

const createdDay = (habit) => toKey(new Date(habit.created_at))
const windowStart = (today) => addDays(today, -WINDOW)
const firstDay = (habit, today) => {
  const c = createdDay(habit)
  const w = windowStart(today)
  return c > w ? c : w
}

export function isScheduled(habit, day) {
  return day >= createdDay(habit) && habit.days.includes(weekday(day))
}

export function streak(habit, checkins, today) {
  const start = firstDay(habit, today)
  let n = 0
  for (let d = today; d >= start; d = addDays(d, -1)) {
    if (!isScheduled(habit, d)) continue
    if (checkins.has(key(habit.id, d))) n++
    else if (d !== today) break
  }
  return n
}

export function longestStreak(habit, checkins, today) {
  let best = 0
  let run = 0
  for (let d = firstDay(habit, today); d <= today; d = addDays(d, 1)) {
    if (!isScheduled(habit, d)) continue
    if (checkins.has(key(habit.id, d))) best = Math.max(best, ++run)
    else if (d !== today) run = 0
  }
  return best
}

export function completionRate(habit, checkins, today) {
  let checked = 0
  let total = 0
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i)
    if (!isScheduled(habit, d)) continue
    const c = checkins.has(key(habit.id, d))
    if (d === today && !c) continue
    total++
    if (c) checked++
  }
  return total ? checked / total : null
}

export function cellState(habit, checkins, day, today) {
  if (day > today) return 'future'
  if (day < windowStart(today)) return 'off'
  if (checkins.has(key(habit.id, day))) return 'done'
  return isScheduled(habit, day) ? 'todo' : 'off'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, semua test di `dates.test.js` dan `stats.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/stats.js src/stats.test.js
git commit -m "feat: add streak, completion rate and cell state logic"
```

---

### Task 3: Schema, client Supabase, `api.js`, `habits.js`

**Files:**
- Create: `supabase/schema.sql`, `src/supabase.js`, `src/api.js`, `src/habits.js`
- Test: `src/api.test.js`, `src/habits.test.js`

**Interfaces:**
- Produces:
  - `supabase` (client) dari `src/supabase.js`
  - `fetchAllPages(getPage: (from, to) => Promise<{data, error}>, size = 1000) => Promise<any[]>`
  - `loadAll(fromDay: string) => Promise<{ habits: Habit[], checkins: {habit_id, day, note}[] }>`
  - `setChecked(habitId, day, checked: boolean) => Promise`
  - `saveNote(habitId, day, note: string|null) => Promise` (throw kalau row tidak ada)
  - `createHabit({ name, days, position }) => Promise`
  - `updateHabit(id, fields) => Promise`
  - `updatePositions(updates: {id, position}[]) => Promise`
  - `deleteHabit(id) => Promise`
  - `moveHabit(active: {id, position}[], id, dir: -1|1) => {id, position}[]` (hanya yang berubah; `[]` kalau tidak bisa pindah)
  - Semua fungsi api **throw** error Supabase (objek dengan `.message`).

- [ ] **Step 1: Schema** — `supabase/schema.sql`

```sql
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 100),
  days smallint[] not null default '{0,1,2,3,4,5,6}'   -- 0=Minggu..6=Sabtu
    check (cardinality(days) between 1 and 7 and days <@ '{0,1,2,3,4,5,6}'),
  position integer not null default 0,
  archived_at timestamptz,                              -- null = aktif
  created_at timestamptz not null default now()
);
create index on habits (user_id, position);

create table checkins (
  habit_id uuid not null references habits on delete cascade,
  day date not null,
  note text check (note is null or length(note) <= 280),
  primary key (habit_id, day)
);

alter table habits enable row level security;
alter table checkins enable row level security;

create policy "own habits" on habits for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own checkins" on checkins for all
  using (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())));
```

- [ ] **Step 2: Write the failing tests**

`src/habits.test.js`:
```js
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
```

`src/api.test.js`:
```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./habits"` dan `"./api"`.

- [ ] **Step 4: Write implementation**

`src/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
```

`src/habits.js`:
```js
// Tukar urutan lalu nomori ulang semua habit aktif, supaya posisi duplikat tetap bisa dipindah.
export function moveHabit(active, id, dir) {
  const ids = active.map((h) => h.id)
  const i = ids.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ids.length) return []
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  const current = new Map(active.map((h) => [h.id, h.position]))
  return ids.map((id, position) => ({ id, position })).filter((u) => current.get(u.id) !== u.position)
}
```

`src/api.js`:
```js
import { supabase } from './supabase'

const check = ({ data, error }) => {
  if (error) throw error
  return data
}

// PostgREST memotong hasil di max-rows tanpa error; ambil terus sampai halaman kosong.
export async function fetchAllPages(getPage, size = 1000) {
  const rows = []
  for (;;) {
    const { data, error } = await getPage(rows.length, rows.length + size - 1)
    if (error) throw error
    if (!data.length) return rows
    rows.push(...data)
  }
}

export async function loadAll(fromDay) {
  const [habits, checkins] = await Promise.all([
    supabase.from('habits').select('*').order('position').order('created_at').then(check),
    fetchAllPages((from, to) =>
      supabase
        .from('checkins')
        .select('habit_id, day, note')
        .gte('day', fromDay)
        .order('habit_id')
        .order('day')
        .range(from, to),
    ),
  ])
  return { habits, checkins }
}

export const setChecked = (habit_id, day, checked) =>
  checked
    ? supabase.from('checkins').upsert({ habit_id, day }, { onConflict: 'habit_id,day', ignoreDuplicates: true }).then(check)
    : supabase.from('checkins').delete().eq('habit_id', habit_id).eq('day', day).then(check)

export async function saveNote(habit_id, day, note) {
  const rows = check(await supabase.from('checkins').update({ note }).eq('habit_id', habit_id).eq('day', day).select())
  if (!rows.length) throw new Error('Centang tidak ditemukan, mungkin sudah dibatalkan di device lain.')
}

export const createHabit = (fields) => supabase.from('habits').insert(fields).then(check)

export const updateHabit = (id, fields) => supabase.from('habits').update(fields).eq('id', id).then(check)

export const updatePositions = (updates) =>
  Promise.all(updates.map(({ id, position }) => updateHabit(id, { position })))

export const deleteHabit = (id) => supabase.from('habits').delete().eq('id', id).then(check)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (dates, stats, habits, api).

- [ ] **Step 6: Commit**

```bash
git add supabase src/supabase.js src/api.js src/api.test.js src/habits.js src/habits.test.js
git commit -m "feat: add schema, supabase api layer and habit reordering"
```

---

### Task 4: Setup Supabase + Google OAuth (manual, dikerjakan pemilik)

Tidak ada kode. Executor **berhenti dan meminta pemilik** mengerjakan langkah ini, lalu menunggu konfirmasi `.env.local` sudah terisi.

- [ ] **Step 1:** Buat project di https://supabase.com/dashboard (region Singapore). Buka SQL Editor → tempel isi `supabase/schema.sql` → Run. Expected: "Success. No rows returned".
- [ ] **Step 2:** Google Cloud Console → APIs & Services → OAuth consent screen (External, isi nama app + email) → Credentials → Create OAuth client ID → Web application. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Simpan Client ID + Client Secret.
- [ ] **Step 3:** Supabase → Authentication → Sign In / Providers → Google → Enable, isi Client ID + Secret → Save.
- [ ] **Step 4:** Supabase → Authentication → URL Configuration: Site URL `http://localhost:5173` (diganti URL produksi di Task 9); Redirect URLs tambahkan `http://localhost:5173`.
- [ ] **Step 5:** Salin `.env.example` ke `.env.local`, isi dari Supabase → Project Settings → API (Project URL + anon/publishable key). **Jangan pakai service_role/secret key.**

---

### Task 5: App shell — auth gate, load data, tab bar, styles

**Files:**
- Create: `src/App.jsx`, `src/screens/Login.jsx`, `src/styles.css`
- Create (stub, diganti Task 6–8): `src/screens/Today.jsx`, `src/screens/History.jsx`, `src/screens/Manage.jsx`, `src/NoteSheet.jsx`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: `supabase`, `loadAll`, `setChecked`, `saveNote` (api), `key`, `WINDOW` (stats), `todayKey`, `addDays` (dates).
- Produces (props yang dipakai Task 6–8):
  - `<Today habits={Habit[] aktif} checkins={Map} today={string} onToggle={(habit, day) => void} onOpen={(habit, day) => void} onGoManage={() => void} />`
  - `<History habits={Habit[] aktif} checkins={Map} today={string} onOpen={(habit, day) => void} />`
  - `<Manage habits={Habit[] semua} mutate={(fn: () => Promise) => Promise<boolean>} />`
  - `<NoteSheet habit day checked={boolean} note={string} onToggle={() => void} onSave={(text) => Promise<boolean>} onClose={() => void} />`
  - `onToggle` di Today = "quick toggle": kalau hari itu sudah dicentang **dan** punya catatan → buka sheet (supaya konfirmasi hapus catatan), selain itu langsung toggle.

- [ ] **Step 1: Stub screens**

`src/screens/Today.jsx`:
```jsx
export default function Today() {
  return <p className="muted">Hari ini</p>
}
```
`src/screens/History.jsx`:
```jsx
export default function History() {
  return <p className="muted">Riwayat</p>
}
```
`src/screens/Manage.jsx`:
```jsx
export default function Manage() {
  return <p className="muted">Kelola</p>
}
```
`src/NoteSheet.jsx`:
```jsx
export default function NoteSheet() {
  return null
}
```

- [ ] **Step 2: Login** — `src/screens/Login.jsx`

```jsx
import { useState } from 'react'
import { supabase } from '../supabase'

// Supabase mengembalikan error OAuth (mis. signup dimatikan) lewat query atau hash URL
const urlError = () => {
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.slice(1))
  return params.get('error_description')
}

export default function Login() {
  const [error, setError] = useState(urlError)

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <main className="page login">
      <h1>Habit Tracker</h1>
      <button className="primary" onClick={signIn}>Continue with Google</button>
      {error && <p className="error">{error}</p>}
    </main>
  )
}
```

- [ ] **Step 3: App** — `src/App.jsx`

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import * as api from './api'
import { key, WINDOW } from './stats'
import { addDays, todayKey } from './dates'
import Login from './screens/Login'
import Today from './screens/Today'
import History from './screens/History'
import Manage from './screens/Manage'
import NoteSheet from './NoteSheet'

const TABS = [
  ['today', 'Hari ini'],
  ['history', 'Riwayat'],
  ['manage', 'Kelola'],
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = belum dicek
  const [habits, setHabits] = useState([])
  const [checkins, setCheckins] = useState(new Map())
  const [today, setToday] = useState(todayKey)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [tab, setTab] = useState('today')
  const [toast, setToast] = useState(null)
  const [sheet, setSheet] = useState(null) // { habit, day }
  const pending = useRef(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    const t = todayKey()
    setToday(t)
    try {
      const data = await api.loadAll(addDays(t, -WINDOW))
      setHabits(data.habits)
      setCheckins(new Map(data.checkins.map((r) => [key(r.habit_id, r.day), r.note])))
      setLoadError(null)
      setLoaded(true)
    } catch (e) {
      setLoadError(e.message)
      setToast(`Gagal memuat: ${e.message}`)
    }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const toggle = async (habitId, day) => {
    const k = key(habitId, day)
    if (pending.current.has(k) || day > todayKey()) return
    pending.current.add(k)
    const wasChecked = checkins.has(k)
    const prevNote = checkins.get(k) ?? null
    setCheckins((m) => {
      const n = new Map(m)
      wasChecked ? n.delete(k) : n.set(k, null)
      return n
    })
    try {
      await api.setChecked(habitId, day, !wasChecked)
    } catch (e) {
      setCheckins((m) => {
        const n = new Map(m)
        wasChecked ? n.set(k, prevNote) : n.delete(k)
        return n
      })
      setToast(`Gagal menyimpan: ${e.message}`)
    } finally {
      pending.current.delete(k)
    }
  }

  const quickToggle = (habit, day) =>
    checkins.get(key(habit.id, day)) ? setSheet({ habit, day }) : toggle(habit.id, day)

  const saveNote = async (habitId, day, text) => {
    const k = key(habitId, day)
    const prev = checkins.get(k) ?? null
    const note = text.trim() || null
    setCheckins((m) => new Map(m).set(k, note))
    try {
      await api.saveNote(habitId, day, note)
      return true
    } catch (e) {
      setCheckins((m) => new Map(m).set(k, prev))
      setToast(`Gagal menyimpan catatan: ${e.message}`)
      return false
    }
  }

  const mutate = async (fn) => {
    try {
      await fn()
      await load()
      return true
    } catch (e) {
      setToast(`Gagal menyimpan: ${e.message}`)
      return false
    }
  }

  if (session === undefined) return null
  if (!session) return <Login />
  if (!loaded)
    return (
      <main className="page empty">
        {loadError ? (
          <>
            <p className="error">Gagal memuat: {loadError}</p>
            <button onClick={load}>Coba lagi</button>
          </>
        ) : (
          <p className="muted">Memuat…</p>
        )}
      </main>
    )

  const active = habits.filter((h) => !h.archived_at)
  const openSheet = (habit, day) => setSheet({ habit, day })
  const sheetKey = sheet && key(sheet.habit.id, sheet.day)

  return (
    <>
      <main className="page">
        {tab === 'today' && (
          <Today
            habits={active}
            checkins={checkins}
            today={today}
            onToggle={quickToggle}
            onOpen={openSheet}
            onGoManage={() => setTab('manage')}
          />
        )}
        {tab === 'history' && <History habits={active} checkins={checkins} today={today} onOpen={openSheet} />}
        {tab === 'manage' && <Manage habits={habits} mutate={mutate} />}
      </main>
      {sheet && (
        <NoteSheet
          key={sheetKey}
          habit={sheet.habit}
          day={sheet.day}
          checked={checkins.has(sheetKey)}
          note={checkins.get(sheetKey) ?? ''}
          onToggle={() => toggle(sheet.habit.id, sheet.day)}
          onSave={(text) => saveNote(sheet.habit.id, sheet.day, text)}
          onClose={() => setSheet(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <nav className="tabbar">
        {TABS.map(([id, label]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 4: main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Styles** — `src/styles.css` (semua layar, supaya Task 6–8 tidak perlu edit CSS)

```css
:root {
  --bg: #f7f7f5;
  --surface: #fff;
  --text: #1c1c1a;
  --muted: #6b6b66;
  --line: #e4e4df;
  --accent: #16a34a;
  --accent-soft: #dcfce7;
  --off: #ededea;
  --danger: #dc2626;
  --tap: 44px;
  --radius: 12px;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--text);
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); -webkit-tap-highlight-color: transparent; }
button, input, textarea { font: inherit; font-size: 16px; }
h1 { font-size: 1.4rem; margin: 0 0 4px; }
h2 { font-size: 1.15rem; margin: 0; }

button {
  min-height: var(--tap);
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
button:disabled { opacity: 0.4; cursor: default; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.danger { color: var(--danger); border-color: var(--danger); }

input:not([type]), input[type='text'], textarea {
  width: 100%;
  min-height: var(--tap);
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}

.page { max-width: 640px; margin: 0 auto; padding: 16px 16px calc(80px + env(safe-area-inset-bottom)); }
.muted { color: var(--muted); margin: 0; font-size: 0.9rem; }
.error { color: var(--danger); margin: 0; font-size: 0.9rem; }
.head { margin-bottom: 16px; }
.name { font-weight: 600; overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.row { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 12px; display: grid; gap: 8px; min-width: 0; }
.row-top { display: flex; align-items: center; gap: 8px; }

.check { flex: 1; display: flex; align-items: center; gap: 12px; min-height: var(--tap); min-width: 0; cursor: pointer; }
.check input { width: 28px; height: 28px; accent-color: var(--accent); flex: none; margin: 0; }
.check span { overflow-wrap: anywhere; }
.streak { font-variant-numeric: tabular-nums; white-space: nowrap; }
.icon { width: var(--tap); padding: 0; }
.note { margin: 0; font-size: 0.9rem; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere; }

.cell { border: none; border-radius: 6px; padding: 0; background: var(--accent-soft); }
.cell.done { background: var(--accent); }
.cell.off, .cell.pad { background: var(--off); }
.cell.pad { visibility: hidden; }
.cell.future { visibility: hidden; }
.cell:disabled { opacity: 1; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.week .cell { min-height: var(--tap); }

.grid-wrap { overflow-x: auto; }
.grid { display: grid; grid-template-rows: repeat(7, 22px); grid-auto-flow: column; grid-auto-columns: 22px; gap: 4px; width: max-content; }
.grid .cell { min-height: 0; width: 22px; height: 22px; }

.form { display: grid; gap: 10px; margin: 12px 0 20px; }
.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.day { position: relative; }
.day input { position: absolute; inset: 0; opacity: 0; margin: 0; }
.day span { display: grid; place-items: center; min-height: var(--tap); border: 1px solid var(--line); border-radius: 10px; font-size: 0.85rem; background: var(--surface); }
.day input:checked + span { background: var(--accent); border-color: var(--accent); color: #fff; }
.day input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }

details { margin-top: 24px; }
summary { min-height: var(--tap); display: flex; align-items: center; cursor: pointer; }
.logout { margin-top: 32px; width: 100%; }

.login, .empty { min-height: 60dvh; display: grid; place-content: center; justify-items: center; gap: 16px; text-align: center; }
.login { min-height: 100dvh; }

.tabbar { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(3, 1fr); background: var(--surface); border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom); }
.tabbar button { border: none; border-radius: 0; min-height: 56px; background: none; color: var(--muted); }
.tabbar button[aria-current='page'] { color: var(--accent); font-weight: 600; }

.toast { position: fixed; left: 16px; right: 16px; bottom: calc(72px + env(safe-area-inset-bottom)); max-width: 608px; margin: 0 auto; background: var(--text); color: var(--surface); padding: 12px 14px; border-radius: var(--radius); z-index: 20; }

.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.35); display: flex; align-items: flex-end; justify-content: center; z-index: 10; }
.sheet { width: 100%; max-width: 640px; background: var(--surface); border-radius: 16px 16px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); display: grid; gap: 12px; }

@media (min-width: 900px) {
  .page { max-width: 880px; }
  .grid { grid-template-rows: repeat(7, 12px); grid-auto-columns: 12px; gap: 3px; }
  .grid .cell { width: 12px; height: 12px; border-radius: 3px; }
}
```

- [ ] **Step 6: Verify**

Run: `npm test && npm run build`
Expected: test PASS, build sukses tanpa error.

Manual: `npm run dev` → buka `http://localhost:5173` → klik "Continue with Google" → login → tampil "Hari ini" + tab bar bawah; tab berpindah. Di DevTools device toolbar (iPhone SE, 375px) tidak ada scroll horizontal.

Signup **belum** dimatikan di sini; uji RLS dengan akun kedua dan mematikan signup ada di Task 6 (butuh layar Kelola untuk membuat data).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app shell with google login, data loading and tab bar"
```

---

### Task 6: Layar Kelola

**Files:**
- Modify (ganti seluruh isi stub): `src/screens/Manage.jsx`

**Interfaces:**
- Consumes: props `habits` (semua, urut `position`), `mutate` dari Task 5; `createHabit`, `updateHabit`, `updatePositions`, `deleteHabit` (api); `moveHabit` (habits); `supabase`.

- [ ] **Step 1: Implementasi** — `src/screens/Manage.jsx`

```jsx
import { useState } from 'react'
import * as api from '../api'
import { moveHabit } from '../habits'
import { supabase } from '../supabase'

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

const daysLabel = (days) => (days.length === 7 ? 'Setiap hari' : days.map((d) => DAY_LABELS[d]).join(', '))

function DayPicker({ value, onChange }) {
  const flip = (i) => onChange(value.includes(i) ? value.filter((d) => d !== i) : [...value, i].sort((a, b) => a - b))
  return (
    <div className="days" role="group" aria-label="Hari terjadwal">
      {DAY_LABELS.map((label, i) => (
        <label key={i} className="day">
          <input type="checkbox" checked={value.includes(i)} onChange={() => flip(i)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}

function HabitForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [days, setDays] = useState(initial?.days ?? ALL_DAYS)
  const trimmed = name.trim()
  const valid = trimmed.length >= 1 && trimmed.length <= 100 && days.length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    const ok = await onSubmit({ name: trimmed, days })
    if (ok && !initial) {
      setName('')
      setDays(ALL_DAYS)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Nama habit" aria-label="Nama habit" />
      <DayPicker value={days} onChange={setDays} />
      {days.length === 0 && <p className="error">Pilih minimal 1 hari.</p>}
      <div className="actions">
        <button type="submit" className="primary" disabled={!valid}>{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>Batal</button>}
      </div>
    </form>
  )
}

export default function Manage({ habits, mutate }) {
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const active = habits.filter((h) => !h.archived_at)
  const archived = habits.filter((h) => h.archived_at)
  const nextPos = habits.reduce((m, h) => Math.max(m, h.position), -1) + 1

  const move = (id, dir) => mutate(() => api.updatePositions(moveHabit(active, id, dir)))

  return (
    <section>
      <h1>Kelola habit</h1>
      <HabitForm submitLabel="Tambah" onSubmit={(v) => mutate(() => api.createHabit({ ...v, position: nextPos }))} />

      <ul className="list">
        {active.map((h, i) => (
          <li key={h.id} className="row">
            {editing === h.id ? (
              <HabitForm
                initial={h}
                submitLabel="Simpan"
                onCancel={() => setEditing(null)}
                onSubmit={async (v) => {
                  const ok = await mutate(() => api.updateHabit(h.id, v))
                  if (ok) setEditing(null)
                  return ok
                }}
              />
            ) : (
              <>
                <span className="name">{h.name}</span>
                <p className="muted">{daysLabel(h.days)}</p>
                <div className="actions">
                  <button aria-label={`Naikkan ${h.name}`} disabled={i === 0} onClick={() => move(h.id, -1)}>↑</button>
                  <button aria-label={`Turunkan ${h.name}`} disabled={i === active.length - 1} onClick={() => move(h.id, 1)}>↓</button>
                  <button onClick={() => setEditing(h.id)}>Ubah</button>
                  <button onClick={() => mutate(() => api.updateHabit(h.id, { archived_at: new Date().toISOString() }))}>Arsipkan</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <details>
          <summary>Diarsipkan ({archived.length})</summary>
          <ul className="list">
            {archived.map((h) => (
              <li key={h.id} className="row">
                <span className="name">{h.name}</span>
                <div className="actions">
                  <button onClick={() => mutate(() => api.updateHabit(h.id, { archived_at: null, position: nextPos }))}>Pulihkan</button>
                  {confirmDelete === h.id ? (
                    <>
                      <span className="error">Riwayat ikut terhapus permanen.</span>
                      <button className="danger" onClick={() => mutate(() => api.deleteHabit(h.id))}>Hapus permanen</button>
                      <button onClick={() => setConfirmDelete(null)}>Batal</button>
                    </>
                  ) : (
                    <button className="danger" onClick={() => setConfirmDelete(h.id)}>Hapus…</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button className="logout" onClick={() => supabase.auth.signOut()}>Logout</button>
    </section>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run build` → PASS / sukses.

Manual (`npm run dev`, tab Kelola):
1. Tambah "Olahraga" (semua hari) dan "Gym" (Sen/Rab/Jum) → keduanya muncul; di Supabase Table Editor `habits` ada 2 row dengan `position` 0 dan 1.
2. Semua hari dimatikan → tombol Tambah disabled + pesan "Pilih minimal 1 hari."
3. ↓ pada Olahraga → urutan tertukar dan bertahan setelah reload halaman.
4. Ubah nama/hari → tersimpan setelah reload.
5. Arsipkan Gym → pindah ke "Diarsipkan"; Pulihkan → kembali di urutan terakhir.
6. Arsipkan lalu Hapus… → Hapus permanen → hilang dari tabel `habits`.
7. Logout → layar Login.
8. **Uji RLS:** pastikan akun utama punya minimal 1 habit. Buka jendela incognito → login dengan akun Google **lain** → Expected: daftar habit kosong (data akun utama tidak terlihat). Logout akun kedua, lalu hapus akun itu di Supabase → Authentication → Users.
9. **Matikan signup (manual, pemilik):** Supabase → Authentication → Sign In / Providers → matikan **"Allow new users to sign up"** → Save. Ulangi login akun kedua di incognito → Expected: kembali ke layar Login dengan pesan error dari Supabase (mis. "Signups not allowed for this instance").

- [ ] **Step 3: Commit**

```bash
git add src/screens/Manage.jsx
git commit -m "feat: add manage habits screen"
```

---

### Task 7: Layar Hari ini + NoteSheet

**Files:**
- Modify (ganti seluruh isi stub): `src/screens/Today.jsx`, `src/NoteSheet.jsx`

**Interfaces:**
- Consumes: props dari Task 5; `key`, `streak`, `isScheduled`, `cellState` (stats); `addDays` (dates).

- [ ] **Step 1: Today** — `src/screens/Today.jsx`

```jsx
import { addDays } from '../dates'
import { cellState, isScheduled, key, streak } from '../stats'

const LABEL = { done: 'selesai', todo: 'belum', off: 'tidak terjadwal', future: '' }
const longDate = (day) => new Date(`${day}T12:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Today({ habits, checkins, today, onToggle, onOpen, onGoManage }) {
  if (!habits.length)
    return (
      <section className="empty">
        <p className="muted">Belum ada habit.</p>
        <button className="primary" onClick={onGoManage}>Tambah habit</button>
      </section>
    )

  const todays = habits.filter((h) => isScheduled(h, today))
  const doneCount = todays.filter((h) => checkins.has(key(h.id, today))).length
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  return (
    <section>
      <header className="head">
        <h1>{longDate(today)}</h1>
        <p className="muted">{doneCount}/{todays.length} selesai</p>
      </header>
      {!todays.length && <p className="muted">Tidak ada habit terjadwal hari ini.</p>}
      <ul className="list">
        {todays.map((h) => {
          const k = key(h.id, today)
          const checked = checkins.has(k)
          const note = checkins.get(k)
          return (
            <li key={h.id} className="row">
              <div className="row-top">
                <label className="check">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(h, today)} />
                  <span>{h.name}</span>
                </label>
                <span className="streak" title="Streak">🔥 {streak(h, checkins, today)}</span>
                {checked && (
                  <button className="icon" aria-label={`Catatan ${h.name}`} onClick={() => onOpen(h, today)}>✎</button>
                )}
              </div>
              <div className="week">
                {last7.map((d) => {
                  const s = cellState(h, checkins, d, today)
                  return (
                    <button
                      key={d}
                      className={`cell ${s}`}
                      disabled={s === 'off'}
                      aria-label={`${longDate(d)}: ${LABEL[s]}`}
                      onClick={() => onToggle(h, d)}
                    />
                  )
                })}
              </div>
              {note && <p className="note">{note}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: NoteSheet** — `src/NoteSheet.jsx`

```jsx
import { useEffect, useState } from 'react'

const fullDate = (day) =>
  new Date(`${day}T12:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function NoteSheet({ habit, day, checked, note, onToggle, onSave, onClose }) {
  const [text, setText] = useState(note)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const uncheck = () => {
    if (note && !confirming) return setConfirming(true)
    setConfirming(false)
    setText('')
    onToggle()
  }

  const save = async () => {
    if (await onSave(text)) onClose()
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`${habit.name}, ${fullDate(day)}`} onClick={(e) => e.stopPropagation()}>
        <div>
          <h2>{habit.name}</h2>
          <p className="muted">{fullDate(day)}</p>
        </div>
        {!checked ? (
          <button className="primary" onClick={onToggle}>Centang</button>
        ) : confirming ? (
          <div className="actions">
            <span className="error">Catatan ikut terhapus. Lanjut?</span>
            <button className="danger" onClick={uncheck}>Ya, batal centang</button>
            <button onClick={() => setConfirming(false)}>Tidak</button>
          </div>
        ) : (
          <button onClick={uncheck}>Batal centang</button>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          disabled={!checked}
          placeholder={checked ? 'Catatan (opsional)' : 'Centang dulu untuk menambah catatan'}
          aria-label="Catatan"
        />
        <div className="actions">
          <button className="primary" disabled={!checked || text.trim() === (note ?? '').trim()} onClick={save}>Simpan</button>
          <button onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build` → PASS / sukses.

Manual (`npm run dev`, DevTools 375px):
1. Header menampilkan tanggal Indonesia dan "0/N selesai". Habit yang tidak terjadwal hari ini tidak muncul.
2. Centang habit → "1/N", 🔥 naik; reload → tetap tercentang (row ada di tabel `checkins`).
3. Klik kotak kemarin di baris 7 hari → jadi hijau, streak ikut naik. Kotak hari tidak terjadwal abu-abu dan tidak bisa diklik.
4. ✎ → tulis catatan → Simpan → catatan tampil di bawah baris.
5. Klik checkbox habit yang punya catatan → sheet terbuka (bukan langsung batal). Batal centang → muncul "Catatan ikut terhapus. Lanjut?" → Ya → centang dan catatan hilang.
6. **Review Focus 5 — double-tap:** klik checkbox dua kali sangat cepat → tidak ada toast error, state akhir konsisten dengan tabel `checkins` setelah reload.
7. **Review Focus 5 — tengah malam:** di DevTools → Sensors, atau ubah jam sistem ke 23:59, biarkan tab di background melewati 00:00, lalu kembali ke tab → header berganti ke tanggal baru.
8. Matikan jaringan (DevTools → Offline) → centang → centang kembali ke semula + toast "Gagal menyimpan: …".
9. Buka di device kedua (atau browser lain, login akun sama) → centang di satu tempat, pindah ke tab lain → data muncul setelah tab aktif kembali.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Today.jsx src/NoteSheet.jsx
git commit -m "feat: add today screen and note sheet"
```

---

### Task 8: Layar Riwayat

**Files:**
- Modify (ganti seluruh isi stub): `src/screens/History.jsx`

**Interfaces:**
- Consumes: props dari Task 5; `cellState`, `completionRate`, `longestStreak`, `WINDOW` (stats); `addDays`, `weekday` (dates).

- [ ] **Step 1: Implementasi** — `src/screens/History.jsx`

```jsx
import { useEffect, useRef } from 'react'
import { addDays, weekday } from '../dates'
import { WINDOW, cellState, completionRate, longestStreak } from '../stats'

const LABEL = { done: 'selesai', todo: 'belum', off: 'tidak terjadwal' }

function Grid({ habit, checkins, today, onOpen }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current.scrollLeft = ref.current.scrollWidth // tampilkan minggu terbaru dulu
  }, [])

  const first = addDays(today, -(WINDOW - 1))
  const start = addDays(first, -weekday(first)) // kolom dimulai hari Minggu
  const days = []
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d)

  return (
    <div className="grid-wrap" ref={ref}>
      <div className="grid">
        {days.map((d) => {
          const s = d < first ? 'pad' : cellState(habit, checkins, d, today)
          const disabled = s === 'off' || s === 'pad'
          return (
            <button
              key={d}
              className={`cell ${s}`}
              disabled={disabled}
              aria-hidden={s === 'pad' || undefined}
              aria-label={s === 'pad' ? undefined : `${d}: ${LABEL[s]}`}
              onClick={() => onOpen(habit, d)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function History({ habits, checkins, today, onOpen }) {
  if (!habits.length) return <p className="muted">Belum ada habit.</p>
  return (
    <section>
      <h1>Riwayat</h1>
      <ul className="list">
        {habits.map((h) => {
          const pct = completionRate(h, checkins, today)
          return (
            <li key={h.id} className="row">
              <span className="name">{h.name}</span>
              <p className="muted">
                {pct === null ? '–' : `${Math.round(pct * 100)}%`} 30 hari · terpanjang {longestStreak(h, checkins, today)} hari
              </p>
              <Grid habit={h} checkins={checkins} today={today} onOpen={onOpen} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run build` → PASS / sukses.

Manual:
1. Di 375px: grid menampilkan ±3 bulan terakhir, kotak paling kanan = minggu ini, grid bisa digeser ke kiri **di dalam kartunya**; halaman sendiri tidak ikut scroll horizontal.
2. Di lebar ≥900px: 12 bulan muat tanpa scroll.
3. Kotak sebelum habit dibuat dan hari tidak terjadwal abu-abu dan tidak bisa diklik; tidak ada kotak untuk hari setelah hari ini.
4. Klik kotak hari lalu → NoteSheet → Centang → kotak jadi hijau; % dan "terpanjang" ter-update.
5. Ubah jadwal habit di Kelola (hapus satu hari yang sudah pernah dicentang) → kotak lama tetap hijau dan bisa diklik; % tidak naik karena hari itu.

- [ ] **Step 3: Commit**

```bash
git add src/screens/History.jsx
git commit -m "feat: add history grid with stats"
```

---

### Task 9: PWA manifest, icons, deploy

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`

- [ ] **Step 1: Icon SVG** — `public/icon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#16a34a"/>
  <path d="M150 265l70 70 142-156" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 2: Generate PNG (macOS)**

```bash
cd "/Users/adiprimanto/Developer/Rangkai Web/habit-tracker/public"
qlmanage -t -s 512 -o . icon.svg && mv icon.svg.png icon-512.png
sips -z 192 192 icon-512.png --out icon-192.png
sips -z 180 180 icon-512.png --out apple-touch-icon.png
file icon-512.png icon-192.png apple-touch-icon.png
```
Expected: ketiganya `PNG image data`, ukuran 512×512, 192×192, 180×180.

- [ ] **Step 3: Manifest** — `public/manifest.webmanifest`

```json
{
  "name": "Habit Tracker",
  "short_name": "Habit",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f7f7f5",
  "theme_color": "#16a34a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 4: Verify lokal**

Run: `npm run build && npm run preview`
Manual: DevTools → Application → Manifest → tidak ada error, ikon tampil.

- [ ] **Step 5: Commit**

```bash
git add public
git commit -m "feat: add pwa manifest and icons"
```

- [ ] **Step 6: Deploy (minta konfirmasi pemilik dulu — ini mempublikasikan app)**

```bash
npx vercel link
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod
```
Expected: URL produksi, mis. `https://habit-tracker-xxx.vercel.app`.

- [ ] **Step 7: Daftarkan URL produksi (manual, pemilik)**

Supabase → Authentication → URL Configuration: Site URL = URL produksi; Redirect URLs tambahkan URL produksi (biarkan `http://localhost:5173`).

- [ ] **Step 8: Verify produksi di HP**

1. Buka URL produksi di HP → login Google berhasil → data sama dengan di laptop.
2. iPhone: Safari → Share → Add to Home Screen. Android: Chrome → menu → Install app. Ikon hijau muncul, app terbuka fullscreen tanpa address bar, tab bar tidak tertutup home indicator.
3. Centang di HP → buka di laptop → centang muncul.

---

## Amendment 2026-09-29: login email + password (menggantikan Google OAuth)

Diminta pemilik setelah Task 9. Kode `Login.jsx` di Task 5 diganti form email + password (`signInWithPassword`); tidak ada form daftar dan lupa password. Langkah manual di bawah **menggantikan** Task 4, Task 5 Step 6 (bagian manual), Task 6 item 8–9, dan Task 9 Step 7–8 item 1.

**Setup (pengganti Task 4):**
1. Buat project Supabase (region Singapore) → SQL Editor → jalankan `supabase/schema.sql`.
2. Authentication → Users → Add user → Create new user: email + password pemilik, centang **Auto Confirm User**.
3. Authentication → Sign In / Providers: matikan **"Allow new users to sign up"** (provider Email tetap aktif).
4. Salin `.env.example` ke `.env.local`, isi Project URL + anon/publishable key. **Jangan pakai service_role/secret key.**

**Cek manual:**
1. `npm run dev` → login dengan email + password → tampil "Hari ini" + tab bar. Password salah → "Email atau password salah."
2. **Uji RLS:** setelah akun utama punya minimal 1 habit, buat akun kedua lewat Add user → login di incognito → daftar habit kosong → hapus akun kedua.
3. **Uji signup mati:** di console browser (tab app), jalankan `await (await import('/src/supabase.js')).supabase.auth.signUp({ email: 'x@example.com', password: 'xxxxxxxx' })` → Expected: error "Signups not allowed for this instance".
4. Deploy: Redirect URLs tidak perlu diisi (tidak ada redirect OAuth). Buka URL produksi di HP → login email + password → data sama dengan di laptop.
