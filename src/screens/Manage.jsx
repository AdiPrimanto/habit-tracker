import React, { useState } from 'react'
import * as api from '../api'
import { moveHabit } from '../habits'
import { supabase } from '../supabase'
import SearchBar from '../components/SearchBar'
import { todayKey } from '../dates'
import {
  Plus,
  Save,
  Edit3,
  ArrowUp,
  ArrowDown,
  Archive,
  RotateCcw,
  Trash2,
  LogOut,
  Settings,
  Calendar as CalendarIcon,
  SearchX,
  AlertTriangle,
  X
} from 'lucide-react'

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

const daysLabel = (days) => (days.length === 7 ? 'Setiap hari' : days.map((d) => DAY_LABELS[d]).join(', '))

function DayPicker({ value, onChange }) {
  const flip = (i) => onChange(value.includes(i) ? value.filter((d) => d !== i) : [...value, i].sort((a, b) => a - b))

  return (
    <div className="days-picker" role="group" aria-label="Hari terjadwal">
      {DAY_LABELS.map((label, i) => (
        <label key={i} className="day-chip">
          <input type="checkbox" checked={value.includes(i)} onChange={() => flip(i)} />
          <span className="day-chip-content">
            <span className="day-name">{label}</span>
          </span>
        </label>
      ))}
    </div>
  )
}

function HabitForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [days, setDays] = useState(initial?.days ?? ALL_DAYS)
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  const valid = trimmed.length >= 1 && trimmed.length <= 100 && days.length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const ok = await onSubmit({ name: trimmed, days }).finally(() => setBusy(false))
    if (ok && !initial) {
      setName('')
      setDays(ALL_DAYS)
    }
  }

  return (
    <form className="habit-form" onSubmit={submit}>
      <div className="input-group">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Nama habit baru (mis. Olahraga Pagi)"
          aria-label="Nama habit"
          className="form-input"
        />
      </div>

      <div className="day-picker-container">
        <div className="form-label-row">
          <span className="form-label">
            <CalendarIcon size={14} /> Ulangi setiap minggu pada hari:
          </span>
        </div>
        <DayPicker value={days} onChange={setDays} />
      </div>

      {days.length === 0 && <p className="form-error">Pilih minimal 1 hari jadwal.</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={!valid || busy}>
          {initial ? <Save size={16} /> : <Plus size={16} />}
          <span>{submitLabel}</span>
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            <X size={16} />
            <span>Batal</span>
          </button>
        )}
      </div>
    </form>
  )
}

export default function Manage({ habits, mutate }) {
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const active = habits.filter((h) => !h.archived_at)
  const archived = habits.filter((h) => h.archived_at)
  const nextPos = habits.reduce((m, h) => Math.max(m, h.position), -1) + 1

  const filteredActive = active.filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  const filteredArchived = archived.filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))

  const move = (id, dir) => mutate(() => api.updatePositions(moveHabit(active, id, dir)))

  return (
    <section className="screen-container">
      <header className="header-card">
        <div className="header-top">
          <div>
            <span className="date-badge">
              <Settings size={14} /> Pengaturan
            </span>
            <h1 className="header-title">Kelola Habit</h1>
          </div>
        </div>
      </header>

      {/* Add New Habit Section */}
      <div className="card-box">
        <h3 className="card-box-title">
          <Plus size={18} className="title-icon" />
          <span>Tambah Habit Baru</span>
        </h3>
        <HabitForm
          submitLabel="Tambah Habit"
          onSubmit={(v) => mutate(() => api.createHabit({ ...v, position: nextPos }))}
        />
      </div>

      {/* Search Input for Managing Habits */}
      {habits.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari habit aktif atau diarsipkan..."
        />
      )}

      {/* Active Habits List */}
      <div className="manage-section">
        <h3 className="section-title">Habit Aktif ({filteredActive.length})</h3>

        {filteredActive.length === 0 ? (
          <div className="empty-card-subtle">
            <SearchX size={28} className="muted-icon" />
            <p className="muted">
              {searchQuery ? `Tidak ada habit aktif yang cocok dengan "${searchQuery}"` : 'Belum ada habit aktif.'}
            </p>
          </div>
        ) : (
          <ul className="habit-list">
            {filteredActive.map((h) => {
              const originalIndex = active.findIndex((item) => item.id === h.id)

              return (
                <li key={h.id} className="habit-card manage-card">
                  {editing === h.id ? (
                    <HabitForm
                      initial={h}
                      submitLabel="Simpan Perubahan"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (v) => {
                        const ok = await mutate(() => api.updateHabit(h.id, v))
                        if (ok) setEditing(null)
                        return ok
                      }}
                    />
                  ) : (
                    <div className="manage-row">
                      <div className="manage-info">
                        <span className="habit-name">{h.name}</span>
                        <span className="manage-days-badge">
                          <CalendarIcon size={12} className="inline-icon" /> {daysLabel(h.days)}
                        </span>
                      </div>

                      <div className="manage-actions">
                        <button
                          className="btn-icon-action"
                          aria-label={`Naikkan ${h.name}`}
                          disabled={originalIndex === 0 || searchQuery.length > 0}
                          onClick={() => move(h.id, -1)}
                          title="Naikkan Posisi"
                        >
                          <ArrowUp size={16} />
                        </button>

                        <button
                          className="btn-icon-action"
                          aria-label={`Turunkan ${h.name}`}
                          disabled={originalIndex === active.length - 1 || searchQuery.length > 0}
                          onClick={() => move(h.id, 1)}
                          title="Turunkan Posisi"
                        >
                          <ArrowDown size={16} />
                        </button>

                        <button
                          className="btn-icon-action"
                          onClick={() => setEditing(h.id)}
                          aria-label={`Ubah ${h.name}`}
                          title="Ubah Habit"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          className="btn-icon-action archive-btn"
                          onClick={() =>
                            mutate(() => api.archiveHabit(h.id, todayKey()))
                          }
                          aria-label={`Arsipkan ${h.name}`}
                          title="Arsipkan Habit"
                        >
                          <Archive size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Archived Habits Section */}
      {archived.length > 0 && (
        <details className="archived-details">
          <summary className="archived-summary">
            <Archive size={18} />
            <span>Diarsipkan ({archived.length})</span>
          </summary>

          <ul className="habit-list archived-list">
            {filteredArchived.map((h) => (
              <li key={h.id} className="habit-card manage-card archived-card">
                <div className="manage-row">
                  <div className="manage-info">
                    <span className="habit-name text-muted-line">{h.name}</span>
                  </div>

                  <div className="manage-actions">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() =>
                        mutate(() => api.updateHabit(h.id, { archived_at: null, position: nextPos }))
                      }
                    >
                      <RotateCcw size={14} />
                      <span>Pulihkan</span>
                    </button>

                    {confirmDelete === h.id ? (
                      <div className="confirm-delete-box">
                        <span className="confirm-warning">
                          <AlertTriangle size={14} /> Permanen?
                        </span>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => mutate(() => api.deleteHabit(h.id))}
                        >
                          Hapus
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button className="btn-danger btn-sm" onClick={() => setConfirmDelete(h.id)}>
                        <Trash2 size={14} />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Logout */}
      <div className="logout-wrapper">
        <button className="btn-logout" onClick={() => supabase.auth.signOut()}>
          <LogOut size={18} />
          <span>Keluar dari Akun</span>
        </button>
      </div>
    </section>
  )
}
