# Prompt Antigravity — Polish UI fitur Target

Salin seluruh isi di bawah garis ke Antigravity.

---

Kamu sedang memperbaiki **tampilan** fitur "Target" di web app habit tracker (Vite + React 19, CSS biasa di `src/styles.css`, ikon `lucide-react`). Logika dan alur sudah selesai dan sudah dites — tugasmu **hanya visual**: markup, className, dan CSS, plus animasi perayaan.

## Tema yang sudah ada (ikuti, jangan ganti)
- Warna biru: token `--primary-50` … `--primary-900`, `--grad-primary`, `--grad-header`, `--slate-*`, `--line-color`, `--card-border`, `--radius-*`, `--shadow-*` di `:root` `src/styles.css`.
- Gaya kartu glass (`.habit-card`, `.header-card`), tombol `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-icon-action`, sheet `.backdrop` + `.sheet-modal` + `.sheet-header/.sheet-body/.sheet-footer`.
- Lihat layar Hari ini (`src/screens/Today.jsx`) dan Riwayat sebagai acuan gaya.

## File yang BOLEH diubah
- `src/screens/Goals.jsx`
- `src/components/GoalForm.jsx`
- `src/components/GoalDetail.jsx`
- `src/components/Celebration.jsx`
- `src/components/GoalMissed.jsx`
- `src/styles.css` (bagian "GOALS" di akhir file, boleh ditambah/diubah; boleh menambah class baru)

Di file JSX di atas kamu **hanya** boleh mengubah markup (elemen pembungkus, urutan tampilan, className, ikon lucide, teks statis). Tambahan elemen dekoratif untuk animasi boleh (mis. 20 `<span>` confetti), selama `aria-hidden="true"`.

## File yang TIDAK BOLEH diubah
`src/App.jsx`, `src/goals.js`, `src/motivation.js`, `src/api.js`, `src/stats.js`, `src/dates.js`, semua `*.test.js`, `supabase/*`, `package.json` (jangan tambah dependency).

## Aturan keras
1. **Jangan ubah** nama export, nama/urutan props, handler (`onCreate`, `onOpen`, `onCancel`, `onSubmit`, `onClose`, `onRepeat`, `onDetail`, `onNext`, `onRetry`, `onGoManage`), state, validasi, atau perhitungan. Nilai yang ditampilkan harus tetap dari props/fungsi yang sekarang dipakai.
2. Pertahankan atribut aksesibilitas: `role="dialog"`, `aria-modal`, `aria-label`/`aria-labelledby` (`id="celebration-title"`, `id="missed-title"`), `aria-pressed` di chip durasi, `role="progressbar"` + `aria-valuenow`, `role="alert"` di error form, `aria-label` tombol ikon.
3. Pertahankan penutupan dengan Escape dan klik backdrop (`onClick={onClose}` di `.backdrop`, `stopPropagation` di isi dialog).
4. Mobile-first 375px: tidak ada scroll horizontal halaman, target sentuh ≥ 44×44px, font input ≥ 16px, fokus keyboard terlihat (`:focus-visible` sudah ada — jangan dihapus), tab bar tetap 4 tombol muat.
5. Tanpa library baru. Animasi pakai CSS (keyframes) dan/atau SVG inline.

## Yang perlu dibuat bagus

### Tab Target (`Goals.jsx`)
- Header ringkasan (`N berjalan · M tercapai`) — buat lebih menarik (mis. dua stat besar).
- Kartu target berjalan: nama habit, angka `done/target` menonjol, progress bar (`.goal-progress`, `.goal-progress-fill`) — boleh ring/circular progress asalkan tetap `role="progressbar"`, teks "Sisa X hari · butuh Y lagi · s/d tanggal", peringatan "Sudah tidak mungkin tercapai" (warna amber), tombol Batalkan + konfirmasi inline.
- Riwayat: baris per target (`.goal-history-row` + `status-achieved|failed|cancelled`) — badge status berwarna (hijau/merah/abu), rentang tanggal, hasil `x/y`.
- Empty state untuk "belum ada target" dan "tambahkan habit dulu".

### Form (`GoalForm.jsx`, bottom sheet)
- Select habit, chip durasi (1 minggu / 2 minggu / 1 bulan / Custom, state terpilih `.is-selected` + `aria-pressed`), input hari custom, stepper target (− angka +), teks "Maksimal Nx", error.

### Detail (`GoalDetail.jsx`, bottom sheet)
- Status + periode, hasil besar `x / target`, "Tercapai di hari ke-N dari M", grid hari periode (kelas `history-cell cell-done|todo|off|future`), daftar catatan, kutipan penyemangat (`.goal-message`), tombol aksi.

### Perayaan (`Celebration.jsx`) — bagian paling penting
Root dialog punya class `celebration celebration-<variant>` dengan variant salah satu:
`confetti`, `fireworks`, `stars`, `balloons`, `trophy`, atau `static` (dipakai saat pengguna mengaktifkan reduce motion).

Buat **5 animasi berbeda**, masing-masing dipicu oleh class variant di atas:
- `confetti` — potongan kertas warna-warni jatuh berputar dari atas.
- `fireworks` — 2–3 ledakan partikel memancar dari titik berbeda.
- `stars` — bintang berkelip/muncul menyebar di sekitar kartu.
- `balloons` — beberapa balon naik dari bawah sambil bergoyang.
- `trophy` — piala memantul masuk dengan kilau (shine) melintas.

Syarat animasi:
- Durasi total ≤ 2,5 detik, lalu diam (tidak loop terus). Konten teks tetap terbaca selama animasi.
- `celebration-static` dan `@media (prefers-reduced-motion: reduce)` → **tanpa gerak sama sekali** (tampilkan ilustrasi diam).
- Elemen dekoratif `aria-hidden="true"`, `pointer-events: none`, tidak menyebabkan scroll horizontal (`overflow: hidden` pada pembungkus).
- Ringan di HP: animasikan `transform`/`opacity` saja.

Konten yang harus tetap ada: judul "Target tercapai!", nama habit, "`target`x dalam N hari", kalimat penyemangat, tombol **Buat target berikutnya** (utama), **Lihat detail**, **Tutup**.

### Tidak tercapai (`GoalMissed.jsx`)
Nuansa lembut dan menyemangati (bukan merah menakutkan): ilustrasi tunas/tanaman, "Target belum tercapai", nama habit, `done/target centang`, kalimat, tombol **Coba lagi** (bisa `null` → sembunyikan) dan **Tutup**. Animasi masuk halus (fade/slide), ikuti aturan reduce motion.

### Chip di Hari ini
Class `.habit-goal-chip` (di `src/screens/Today.jsx` — **jangan ubah JSX-nya**, cukup CSS) menampilkan `🎯 done/target · Xh`. Rapikan gayanya agar serasi dengan `.streak-pill`.

## Verifikasi sebelum selesai
1. `npm test` → semua test lulus (jumlah test tidak berkurang).
2. `npm run build` → sukses tanpa error.
3. `git diff --stat` hanya menyentuh file yang boleh diubah.
4. Cek di lebar 375px: tab Target, form, detail, kelima animasi (ubah variant sementara di DevTools dengan mengganti class `celebration-*`), dan mode reduce motion (DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`).
