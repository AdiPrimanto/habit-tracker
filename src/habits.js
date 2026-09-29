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
