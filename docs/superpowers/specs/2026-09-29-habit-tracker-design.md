# Habit Tracker — Design Spec

Tanggal: 2026-09-29
Status: draft, menunggu review

## 1. Tujuan

Web app habit tracker harian untuk **satu orang (pemilik)**, dipakai dari beberapa device (HP + laptop). Data harus sync antar-device.

**Sukses berarti:** centang habit di HP, buka laptop, centang sudah muncul. Nyaman dipakai dengan satu jempol di HP.

**Bukan tujuan (v1):** multi-user publik, reminder push, offline mode, realtime sync, dark mode.

## 2. Keputusan utama

| Topik | Keputusan | Alasan |
|---|---|---|
| Frontend | Vite + React, JavaScript | SPA statis, tidak butuh server sendiri |
| Backend/DB | Supabase (Postgres + Auth + RLS) | Auth + DB + isolasi data per user tanpa backend custom |
| Auth | Google OAuth saja | Login sekali tap per device; sesi bertahan lewat refresh token |
| Hosting | Vercel / Netlify / Cloudflare Pages (gratis) | Hosting statis |
| Dependency | `@supabase/supabase-js`; dev: `vite`, `@vitejs/plugin-react`, `vitest` | Tanpa lib state/tanggal/UI |
| Styling | CSS biasa, mobile-first | Cukup untuk 3 layar |

## 3. Fitur v1

1. Login Google, logout.
2. **Kelola habit:** tambah, ubah nama, atur hari terjadwal (Min–Sab), ubah urutan (naik/turun), arsipkan, pulihkan, hapus permanen.
3. **Hari ini:** daftar habit aktif yang terjadwal hari ini, checkbox, streak 🔥, 7 kotak 7 hari terakhir (bisa diklik untuk edit hari lalu), ringkasan progres "3/5 selesai".
4. **Riwayat:** grid ala GitHub per habit, 12 bulan terakhir; klik kotak untuk centang/batal hari lalu. Hari tidak terjadwal & hari sebelum `created_at` abu-abu, tidak bisa diklik. Hari masa depan tidak ditampilkan.
5. **Catatan per centang:** catatan singkat (maks 280 karakter) pada centang tertentu.
6. **Statistik per habit:** persentase terpenuhi 30 hari terakhir, streak terpanjang.
7. **Install ke home screen** (PWA manifest, tanpa service worker).

## 4. Data model

File: `supabase/schema.sql` (dijalankan manual di SQL Editor Supabase).

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
  primary key (habit_id, day)                           -- 1 centang per habit per hari
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

Aturan:
- **Centang** = insert row; **batal centang** = delete row (catatannya ikut terhapus).
- **Catatan** = update kolom `note` pada row checkin yang sudah ada. Catatan hanya bisa ada pada hari yang dicentang.
- **Arsip** = set `archived_at = now()`; **pulihkan** = set `null`. Riwayat tetap utuh.
- **Hapus permanen** = delete habit → checkins ikut terhapus (cascade). Hanya tersedia untuk habit yang sudah diarsipkan.
- **Urutan:** habit baru mendapat `position = max(position) + 1`. Naik/turun = tukar `position` dua habit bersebelahan (2 update).
- Hari masa depan dicegah di client (DB tidak mengecek, karena `current_date` tidak cocok dipakai di CHECK constraint).

## 5. Keamanan

- Frontend hanya memakai **anon/publishable key** (`VITE_SUPABASE_ANON_KEY`). **Service role key tidak boleh masuk ke frontend atau repo.**
- RLS memastikan tiap akun hanya bisa membaca/menulis datanya sendiri.
- Setelah pemilik login pertama kali, **"Allow new users to sign up" dimatikan** di Supabase Auth settings, supaya orang lain tidak bisa membuat akun.
- `.env.local` masuk `.gitignore`.

## 6. Struktur file

```
index.html
vite.config.js
package.json
.env.example              # VITE_SUPABASE_URL=, VITE_SUPABASE_ANON_KEY=
public/
  manifest.webmanifest
  icon-192.png, icon-512.png, apple-touch-icon.png
supabase/schema.sql
src/
  main.jsx
  App.jsx                 # auth gate + tab bar + load data + toggle/note handlers
  supabase.js             # createClient
  dates.js                # todayKey(), addDays(), weekday(), key format YYYY-MM-DD lokal
  stats.js                # streak(), longestStreak(), completionRate()
  stats.test.js
  screens/Login.jsx
  screens/Today.jsx
  screens/History.jsx
  screens/Manage.jsx
  NoteSheet.jsx           # bottom sheet: centang/batal + catatan
  styles.css
```

## 7. Alur data

- **Load:** saat sesi ada → 2 query paralel:
  - `habits` semua (aktif + arsip), urut `position`.
  - `checkins` dengan `day >= today - 365`.
- **State di `App.jsx`:** `habits` (array), `checkins` (`Map` key `"habitId|YYYY-MM-DD"` → `note | null`). Tidak ada library state.
- **Toggle centang:** optimistic update → insert/delete ke Supabase → kalau gagal, kembalikan state + tampilkan pesan error (toast sederhana). Tidak boleh ada perubahan yang diam-diam tidak tersimpan.
- **Sync antar-device:** reload data saat `document.visibilityState` menjadi `visible`.
- **Tanggal lokal:** `new Date().toLocaleDateString('en-CA')` → `YYYY-MM-DD` sesuai zona waktu device. Aritmetika tanggal lewat `Date` lokal (set jam 12:00 untuk menghindari masalah DST).
- **Auth:** `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })`; `onAuthStateChange` mengatur tampil Login vs app.

## 8. Logika statistik (`stats.js`)

Semua fungsi murni; input: `habit`, `checkins` Map, `today` (string `YYYY-MM-DD`).

- **Hari terjadwal** = `habit.days` memuat weekday hari itu **dan** hari itu ≥ tanggal lokal `created_at`.
- **`streak`:** mulai dari hari ini, jalan mundur. Lewati hari tidak terjadwal. Kalau hari ini terjadwal tapi belum dicentang, lewati (streak belum putus). Berhenti di hari terjadwal pertama yang tidak dicentang, atau di `created_at`, atau di batas data 365 hari.
- **`longestStreak`:** run terpanjang hari terjadwal berturut-turut yang dicentang, dalam rentang data yang dimuat.
- **`completionRate`:** dicentang ÷ hari terjadwal dalam 30 hari terakhir (termasuk hari ini hanya kalau sudah dicentang). Kalau tidak ada hari terjadwal → tampilkan "–".

Batasan yang disadari: streak/longest dibatasi 365 hari data yang dimuat (cukup untuk v1; naikkan rentang query kalau perlu).

## 9. UI & mobile-first

- Dirancang untuk lebar 375px dulu, satu kolom; di layar lebar konten max-width ~640px di tengah.
- **Tab bar bawah** fixed: Hari ini / Riwayat / Kelola. Memperhitungkan `env(safe-area-inset-bottom)`.
- Area sentuh minimal 44×44px untuk checkbox, kotak 7 hari, tombol.
- Font input minimal 16px (mencegah auto-zoom iOS).
- Tidak ada scroll horizontal di level halaman. Grid Riwayat: di HP tampil ~3 bulan terakhir, bagian lebih lama digeser horizontal di dalam kontainernya sendiri; di laptop 12 bulan penuh.
- Viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`.

**Hari ini:**
- Header: tanggal + "3/5 selesai".
- Tiap baris: checkbox besar, nama, 🔥 streak, 7 kotak hari terakhir (kotak tidak terjadwal abu-abu), tombol ✎ (muncul kalau hari ini sudah dicentang) untuk membuka NoteSheet. Baris dengan catatan menampilkan potongan catatannya.
- Kosong (belum ada habit): ajakan ke tab Kelola.

**Riwayat:**
- Per habit aktif: nama, % 30 hari, streak terpanjang, grid.
- Tap kotak terjadwal → buka NoteSheet untuk hari itu.

**NoteSheet (bottom sheet):**
- Judul: nama habit + tanggal.
- Tombol centang/batal centang; textarea catatan (aktif hanya kalau dicentang) + tombol Simpan.
- Batal centang saat ada catatan → konfirmasi di dalam sheet ("Catatan ikut terhapus. Lanjut?"), bukan `window.confirm`.

**Kelola:**
- Form tambah: nama + 7 toggle hari (default semua aktif).
- Daftar habit aktif: edit nama/hari inline, tombol ↑ ↓, Arsipkan.
- Seksi "Diarsipkan" (collapsible): Pulihkan, Hapus permanen (dengan konfirmasi di halaman).
- Tombol Logout di bawah.

## 10. Penanganan error

- Semua error Supabase ditampilkan lewat toast singkat; state optimistic dikembalikan.
- Gagal load awal → pesan + tombol "Coba lagi".
- Validasi input di client sesuai constraint DB (nama 1–100 karakter, minimal 1 hari, catatan ≤280).

## 11. Testing

- `src/stats.test.js` (Vitest): streak dengan hari tidak terjadwal, hari ini belum dicentang, putus di tengah, batas `created_at`, longestStreak, completionRate termasuk kasus "tidak ada hari terjadwal".
- Uji manual RLS: login akun kedua (sebelum signup dimatikan) → pastikan data akun utama tidak terlihat.
- Uji manual di HP: layout 375px, tab bar, install ke home screen, sync HP ↔ laptop.

## 12. Setup (manual, sekali)

1. Buat project Supabase; jalankan `supabase/schema.sql` di SQL Editor.
2. Google Cloud Console → buat OAuth Client ID (Web). Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → Google: isi Client ID & Secret.
4. Supabase → Authentication → URL Configuration: Site URL = URL produksi; Redirect URLs = `http://localhost:5173` + URL produksi.
5. Isi `.env.local` dari `.env.example`.
6. Login sekali dengan akun pemilik → matikan "Allow new users to sign up".
7. Deploy ke hosting statis; set env var yang sama di hosting.
