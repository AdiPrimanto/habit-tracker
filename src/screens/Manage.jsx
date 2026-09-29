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
