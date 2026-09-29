# Target (Goals) — Design Spec

Tanggal: 2026-09-29
Status: draft, menunggu review
Dibangun di atas: `docs/superpowers/specs/2026-09-29-habit-tracker-design.md` (semua Global Constraints di sana tetap berlaku)

## 1. Tujuan

Pemilik bisa memasang **target jumlah centang dalam periode tertentu** untuk sebuah habit (contoh: "10× Gym dalam 1 bulan"), memantau progresnya, dan mendapat **perayaan (animasi + kalimat penyemangat acak)** saat tercapai, atau **penyemangat untuk coba lagi** saat periode habis tanpa tercapai. Semua target yang selesai tersimpan sebagai riwayat dengan detail.

**Sukses berarti:** buat target Gym 10× / 1 bulan → chip "🎯 0/10" muncul di Hari ini → centang ke-10 memunculkan perayaan → target pindah ke riwayat dengan detail "tercapai di hari ke-N" → satu ketukan membuat target berikutnya (11×).

**Bukan tujuan:** target lintas habit, target mingguan berulang otomatis, kalimat dari AI, notifikasi push, target lebih dari 1 aktif per habit.

## 2. Keputusan

| Topik | Keputusan |
|---|---|
| Periode | Mulai hari ini + durasi (1 minggu = 7, 2 minggu = 14, 1 bulan = 30 hari, atau custom 1–365 hari) |
| Progres | Jumlah centang habit itu dengan `starts_on <= day <= ends_on`; centang susulan di dalam periode ikut dihitung |
| Jumlah target aktif | Maksimal 1 per habit (dijaga partial unique index) |
| Tercapai lebih awal | Langsung `achieved` + perayaan saat centang ke-N; status final (tidak dicabut walau centang dibatalkan) |
| Periode habis belum tercapai | `failed`, tetap di riwayat, kartu penyemangat sekali + "Coba lagi" |
| Batal | `cancelled`, tetap di riwayat |
| Letak UI | Tab ke-4 "Target" + chip progres di kartu habit layar Hari ini |
| Penyemangat | Daftar tetap di `src/motivation.js`, acak, tidak mengulang kalimat terakhir |
| Animasi | Varian acak dari `confetti`, `fireworks`, `stars`, `balloons`, `trophy`; visual dibuat Antigravity; `prefers-reduced-motion` → statis |

## 3. Data model

Tambahan ke `supabase/schema.sql` dan file migrasi `supabase/migrations/2026-09-29-goals.sql` (dijalankan manual di SQL Editor untuk project yang sudah ada).

```sql
create table goals (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits on delete cascade,
  target smallint not null check (target between 1 and 365),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on and ends_on - starts_on < 365),
  status text not null default 'active' check (status in ('active', 'achieved', 'failed', 'cancelled')),
  finished_on date,
  created_at timestamptz not null default now(),
  check ((status = 'active') = (finished_on is null))
);
create unique index goals_one_active on goals (habit_id) where status = 'active';
create index on goals (habit_id, created_at desc);

alter table goals enable row level security;

create policy "own goals" on goals for all
  using (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())));
```

Aturan tulis:
- **Buat:** insert `{ habit_id, target, starts_on: today, ends_on: today + days - 1 }`. Pelanggaran unique index (habit sudah punya target aktif, mis. dari device lain) → pesan "Habit ini sudah punya target berjalan."
- **Selesaikan (tercapai/gagal/batal):** `update ... set status, finished_on where id = ? and status = 'active'`. Filter `status = 'active'` membuat operasi idempoten dan tidak menimpa status final dari device lain.
- **Arsipkan habit:** target aktifnya di-set `cancelled` (sebelum/bersama update `archived_at`).
- **Hapus habit permanen:** target ikut terhapus (cascade).

Batasan yang disadari: checkins dimuat 365 hari terakhir; periode maksimal 365 hari, jadi progres target aktif selalu lengkap. Riwayat target lama (selesai > 365 hari lalu) menampilkan angka hasil yang dihitung dari data yang ada — bisa kurang dari sebenarnya. Ceiling diterima untuk v1.

## 4. Logika murni (`src/goals.js`, dites)

Semua fungsi menerima data, tidak memanggil Supabase. `goal = { id, habit_id, target, starts_on, ends_on, status, finished_on }`.

- `periodDays(goal) => string[]` — semua tanggal `starts_on..ends_on`.
- `goalProgress(goal, checkins) => number` — jumlah centang habit di periode.
- `scheduledDaysBetween(habit, from, to) => number` — hari terjadwal (pakai `isScheduled`) dalam rentang, inklusif.
- `maxTarget(habit, today, days) => number` — `scheduledDaysBetween(habit, today, today + days - 1)`.
- `goalInfo(goal, habit, checkins, today) => { done, needed, daysLeft, reachable }`
  - `done = goalProgress`, `needed = max(0, target - done)`, `daysLeft` = hari tersisa termasuk hari ini (0 kalau sudah lewat), `reachable = needed <=` jumlah hari terjadwal di periode (sampai `ends_on`) yang belum dicentang — termasuk hari lalu di periode, karena bisa dicentang susulan.
- `achievedDayNumber(goal) => number` — `finished_on - starts_on + 1` (untuk "tercapai di hari ke-N").
- `dueTransitions(goals, checkins, today) => { achieve: goal[], fail: goal[] }` — untuk target `active`: `done >= target` → achieve; selain itu `ends_on < today` → fail.
- `suggestNextTarget(goal, habit, today, days) => number` — tercapai: `min(ceil(target * 1.1), maxTarget)`; tidak tercapai/batal: `min(target, maxTarget)`; minimal 1.
- `newGoal({ habitId, target, days }, today) => { habit_id, target, starts_on, ends_on }`
- `validateGoal({ target, days }, habit, today) => string | null` — `days` 1–365; `target` bulat 1–365; `target <= maxTarget`, kalau `maxTarget === 0` → "Tidak ada hari terjadwal di periode ini."

`src/motivation.js`:
- `ACHIEVED_MESSAGES`, `FAILED_MESSAGES` (masing-masing ≥ 15 kalimat Bahasa Indonesia, hangat, tidak menggurui).
- `ANIMATIONS = ['confetti', 'fireworks', 'stars', 'balloons', 'trophy']`.
- `pickRandom(list, previous, rng = Math.random)` — acak; kalau `list.length > 1` tidak pernah mengembalikan `previous`.

## 5. Alur

**Load (App):** tambah query `goals` (semua status, urut `created_at desc`) di `loadAll`. Setelah data masuk, jalankan `dueTransitions`:
- `achieve` → selesaikan ke `achieved` dengan `finished_on = today` (kasus: centang ke-N datang dari device lain / sebelum update terkirim). **Tanpa perayaan** — perayaan hanya di device yang melakukan centang.
- `fail` → selesaikan ke `failed` dengan `finished_on = ends_on`; tampilkan **kartu tidak tercapai** untuk goal tersebut (antre kalau lebih dari satu).

**Centang (toggle) berhasil tersimpan:** kalau habit punya target aktif dan `goalProgress >= target` setelah centang → selesaikan ke `achieved` (`finished_on = today`) → tampilkan **overlay perayaan** dengan `variant = pickRandom(ANIMATIONS, lastVariant)` dan `message = pickRandom(ACHIEVED_MESSAGES, lastMessage)`. Gagal menyimpan status → toast; status akan dicoba lagi otomatis oleh `dueTransitions` saat load berikutnya.

**Tab Target (`src/screens/Goals.jsx`):**
- Header ringkasan: jumlah target berjalan, jumlah tercapai total.
- "Sedang berjalan": kartu per target aktif — nama habit, `done/target`, progress bar, "sisa X hari · butuh Y lagi", peringatan "Sudah tidak mungkin tercapai" kalau `!reachable`, tombol Batalkan (konfirmasi di dalam kartu).
- Tombol "Buat Target" → `GoalForm` (bottom sheet).
- "Riwayat target": target non-aktif, terbaru dulu — ikon status (✅ tercapai / ❌ tidak tercapai / ⏹ dibatalkan), nama habit, `hasil/target`, rentang tanggal. Ketuk → `GoalDetail`.
- Kosong: ajakan membuat target pertama; kalau belum ada habit aktif → ajakan ke tab Kelola.

**`GoalForm` (bottom sheet):** pilih habit (hanya habit aktif tanpa target aktif), durasi (chip 1 mgg / 2 mgg / 1 bln / Custom + input hari), target (input angka dengan − / +), teks "maksimal N× di periode ini", pesan validasi dari `validateGoal`, tombol Simpan (terkunci saat menyimpan). Bisa dibuka dengan nilai awal (habit, durasi, target) untuk "Buat target berikutnya" / "Coba lagi".

**`GoalDetail` (bottom sheet):** status, periode, `hasil/target`, "Tercapai di hari ke-N dari M" (achieved), grid tanggal periode (dicentang / tidak / tidak terjadwal), daftar catatan di periode, kalimat penyemangat acak sesuai status, tombol "Buat target berikutnya" (achieved) / "Coba lagi" (failed, cancelled) → `GoalForm` terisi `suggestNextTarget`. Tombol ini disembunyikan kalau habit sudah diarsipkan atau sudah punya target aktif.

**`Celebration` (overlay):** props `{ variant, message, goal, habit, onDetail, onNext, onClose }`; menampilkan animasi varian, "Target tercapai!", `habit.name`, `target× dalam N hari`, kalimat, tombol Lihat detail / Buat target berikutnya / Tutup. Tutup juga lewat Escape / klik backdrop.

**`GoalMissed` (kartu/overlay lembut):** props `{ message, goal, habit, done, onRetry, onClose }`.

**Hari ini:** kartu habit dengan target aktif menampilkan chip `🎯 done/target · X hari lagi`.

**Tab bar:** 4 tab — Hari ini / Riwayat / Target / Kelola.

**Kelola:** Arsipkan habit → batalkan target aktifnya dulu.

## 6. Penanganan error

- Semua tulis goal lewat `mutate` / toast yang sudah ada; tidak ada perubahan diam-diam.
- Error unique violation (`23505`) saat buat → "Habit ini sudah punya target berjalan."
- Transisi gagal tersimpan → dicoba lagi di load berikutnya (idempoten karena filter `status = 'active'`).

## 7. UI

Komponen dari Claude berfungsi penuh dengan styling sederhana memakai class yang sudah ada (`habit-card`, `btn-primary`, `sheet-modal`, dst.). Visual final dan animasi dibuat lewat prompt Antigravity (`docs/antigravity/goals-ui-prompt.md`) dengan aturan: **tidak mengubah props, nama export, struktur data, atau logika di `src/goals.js`, `src/motivation.js`, `src/api.js`, `src/App.jsx`**; hanya markup/class di komponen UI goal dan CSS.

Mobile rules spec induk tetap berlaku (375px, target sentuh ≥ 44px, input ≥ 16px, tanpa scroll horizontal halaman, fokus keyboard terlihat, `prefers-reduced-motion`).

## 8. Testing

- `src/goals.test.js`: progres dalam/luar periode, centang susulan, `maxTarget` dengan jadwal Sen/Rab/Jum, `reachable` (hari ini belum/sudah dicentang), `dueTransitions` (achieve, fail tepat setelah `ends_on`, tidak fail di hari `ends_on`, abaikan non-active), `suggestNextTarget` (naik 10% dibulatkan ke atas, dibatasi max, gagal = sama, min 1), `validateGoal` (batas, 0 hari terjadwal), `achievedDayNumber`.
- `src/motivation.test.js`: `pickRandom` tidak mengulang `previous`, list 1 elemen tetap mengembalikan elemen itu, jumlah kalimat ≥ 15 per kelompok.
- Manual (mock Supabase di browser 375px + nanti Supabase asli): buat target, chip muncul, centang ke-N → perayaan, detail, target berikutnya terisi 11, target lewat periode → kartu tidak tercapai sekali, arsipkan habit → target dibatalkan.
