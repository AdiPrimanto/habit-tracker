export const ACHIEVED_MESSAGES = [
  'Konsistensimu terbayar. Pasang target berikutnya selagi semangat masih hangat!',
  'Satu target tuntas. Kamu baru saja membuktikan bahwa kamu bisa.',
  'Kebiasaan kecil yang diulang terus inilah yang mengubah hidup. Lanjutkan!',
  'Hebat! Naikkan sedikit tantangannya, kamu sudah siap.',
  'Disiplin hari ini adalah kebebasan di masa depan. Terus jalan!',
  'Target tercapai bukan kebetulan, itu hasil keputusanmu setiap hari.',
  'Rayakan sebentar, lalu tentukan puncak berikutnya.',
  'Kamu lebih kuat dari alasan-alasan yang sempat muncul. Mantap!',
  'Momentum sedang di pihakmu. Jangan biarkan berhenti di sini.',
  'Progres, bukan kesempurnaan. Dan hari ini progresmu luar biasa.',
  'Setiap centang adalah janji yang kamu tepati pada dirimu sendiri.',
  'Versi dirimu bulan lalu pasti bangga melihat ini.',
  'Target berikutnya tidak akan terasa seberat yang ini. Kamu sudah terlatih.',
  'Kebiasaan baik sudah mulai jadi bagian dirimu. Pertahankan!',
  'Sukses itu kumpulan usaha kecil yang diulang. Kamu sedang melakukannya.',
  'Luar biasa! Sekarang tantang dirimu satu langkah lebih jauh.',
]

export const FAILED_MESSAGES = [
  'Belum tercapai bukan berarti gagal. Kamu tetap maju dari titik nol.',
  'Setiap centang yang sudah kamu kumpulkan tetap berarti. Coba lagi!',
  'Jatuh itu biasa, yang penting bangkit lagi. Pasang target baru hari ini.',
  'Mungkin targetnya sedikit terlalu tinggi. Sesuaikan, lalu mulai lagi.',
  'Konsistensi dibangun dari percobaan berulang. Ini baru satu percobaan.',
  'Kamu sudah memulai, dan itu bagian tersulitnya. Ayo lanjutkan.',
  'Evaluasi sebentar: hari apa yang paling sulit? Atur ulang jadwalnya.',
  'Tidak ada yang sia-sia. Kebiasaanmu sedang terbentuk pelan-pelan.',
  'Hari ini adalah kesempatan baru untuk mulai lagi.',
  'Target kecil yang tercapai lebih baik daripada target besar yang ditunda. Coba lagi dengan ritme yang pas.',
  'Istirahat boleh, menyerah jangan. Kamu pasti bisa di putaran berikutnya.',
  'Yang terpenting bukan seberapa cepat, tapi terus bergerak.',
  'Kamu lebih dekat dari yang kamu kira. Satu putaran lagi!',
  'Belajar dari periode ini, lalu buat rencana yang lebih realistis.',
  'Perubahan besar selalu dimulai dari kemauan untuk mencoba lagi.',
  'Tidak apa-apa. Tarik napas, pasang target, dan mulai dari centang pertama.',
]

export const ANIMATIONS = ['confetti', 'fireworks', 'stars', 'balloons', 'trophy']

export function pickRandom(list, previous, rng = Math.random) {
  const pool = list.length > 1 ? list.filter((x) => x !== previous) : list
  return pool[Math.floor(rng() * pool.length)]
}
