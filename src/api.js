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
