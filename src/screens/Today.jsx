import React, { useState } from 'react'
import { addDays, formatShortDate } from '../dates'
import { cellState, isScheduled, key, streak } from '../stats'
import SearchBar from '../components/SearchBar'
import { Flame, FileText, Plus, Check, Sparkles, Trophy, SearchX } from 'lucide-react'

const LABEL = { done: 'selesai', todo: 'belum', off: 'tidak terjadwal', future: '' }
const longDate = (day) =>
  new Date(`${day}T12:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function Today({ habits, checkins, today, onToggle, onOpen, onGoManage }) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!habits.length) {
    return (
      <section className="empty-card">
        <div className="empty-icon-wrap">
          <Sparkles size={40} className="empty-icon" />
        </div>
        <h2>Belum Ada Habit</h2>
        <p className="muted">Mulai perjalanan kebiasaan baikmu dengan menambahkan habit pertama!</p>
        <button className="btn-primary" onClick={onGoManage}>
          <Plus size={18} />
          <span>Tambah Habit</span>
        </button>
      </section>
    )
  }

  const todays = habits.filter((h) => isScheduled(h, today))
  const filtered = todays.filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))

  const doneCount = todays.filter((h) => checkins.has(key(h.id, today))).length
  const totalCount = todays.length
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  return (
    <section className="screen-container">
      {/* Date Header & Progress Overview Card */}
      <header className="header-card">
        <div className="header-top">
          <div>
            <span className="date-badge">Hari Ini</span>
            <h1 className="header-title">{longDate(today)}</h1>
          </div>
          {totalCount > 0 && (
            <div className="progress-badge">
              <Trophy size={16} className="trophy-icon" />
              <span>{percentage}% Selesai</span>
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <div className="progress-section">
            <div className="progress-info">
              <span>Progress Hari Ini</span>
              <span className="progress-count">
                <strong>{doneCount}</strong> dari {totalCount} habit
              </span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${percentage}%` }}
                aria-valuenow={percentage}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
            {percentage === 100 && (
              <div className="congrats-banner">
                <Sparkles size={16} />
                <span>Luar biasa! Semua habit hari ini selesai! 🎉</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Search Input */}
      {todays.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari habit hari ini..."
        />
      )}

      {/* Habit List */}
      {!todays.length ? (
        <div className="empty-card-subtle">
          <p className="muted">Tidak ada habit yang terjadwal untuk hari ini.</p>
          <button className="btn-secondary" onClick={onGoManage}>
            Kelola Jadwal Habit
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-card-subtle">
          <SearchX size={32} className="muted-icon" />
          <p className="muted">Tidak ada habit yang cocok dengan "{searchQuery}"</p>
        </div>
      ) : (
        <ul className="habit-list">
          {filtered.map((h) => {
            const k = key(h.id, today)
            const checked = checkins.has(k)
            const note = checkins.get(k)
            const currentStreak = streak(h, checkins, today)

            return (
              <li key={h.id} className={`habit-card ${checked ? 'is-completed' : ''}`}>
                <div className="habit-card-top">
                  <label className="habit-checkbox-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(h, today)}
                      aria-label={`Tandai ${h.name}`}
                    />
                    <span className={`custom-checkbox ${checked ? 'checked' : ''}`}>
                      {checked && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="habit-name">{h.name}</span>
                  </label>

                  <div className="habit-meta">
                    <div
                      className={`streak-pill ${currentStreak > 0 ? 'active' : ''}`}
                      title={`${currentStreak} hari berturut-turut`}
                    >
                      <Flame size={14} className="flame-icon" />
                      <span>{currentStreak}d</span>
                    </div>

                    {checked && (
                      <button
                        className={`btn-icon-note ${note ? 'has-note' : ''}`}
                        aria-label={`Catatan ${h.name}`}
                        onClick={() => onOpen(h, today)}
                        title="Tambah/Edit Catatan"
                      >
                        <FileText size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 7 Day Mini History Bar */}
                <div className="habit-week-grid">
                  {last7.map((d) => {
                    const s = cellState(h, checkins, d, today)
                    const dayDate = new Date(`${d}T12:00`)
                    const dayLabel = DAY_NAMES[dayDate.getDay()]
                    const shortFormatted = formatShortDate(d)
                    const isTodayCell = d === today

                    return (
                      <button
                        key={d}
                        className={`week-cell cell-${s} ${isTodayCell ? 'is-today' : ''}`}
                        disabled={s === 'off'}
                        aria-label={`${shortFormatted}: ${LABEL[s]}`}
                        onClick={() => onToggle(h, d)}
                        title={`${shortFormatted} (${dayLabel}): ${LABEL[s]}`}
                      >
                        <span className="week-day-name">{dayLabel}</span>
                        <span className="week-day-dot">
                          {s === 'done' ? <Check size={12} strokeWidth={3} /> : dayDate.getDate()}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {note && (
                  <button type="button" className="habit-note-box" onClick={() => onOpen(h, today)} aria-label={`Ubah catatan ${h.name}`}>
                    <FileText size={14} className="note-box-icon" />
                    <p className="note-text">{note}</p>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
