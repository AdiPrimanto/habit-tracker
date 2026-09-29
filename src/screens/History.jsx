import React, { useEffect, useRef, useState } from 'react'
import { addDays, weekday } from '../dates'
import { WINDOW, cellState, completionRate, longestStreak } from '../stats'
import SearchBar from '../components/SearchBar'
import { Calendar, Award, Flame, SearchX, Sparkles } from 'lucide-react'

const LABEL = { done: 'selesai', todo: 'belum', off: 'tidak terjadwal' }

function Grid({ habit, checkins, today, onOpen }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollLeft = ref.current.scrollWidth // Scroll to latest week first
    }
  }, [])

  const first = addDays(today, -(WINDOW - 1))
  const start = addDays(first, -weekday(first)) // Start column on Sunday
  const days = []
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d)

  return (
    <div className="history-grid-wrap" ref={ref}>
      <div className="history-grid">
        {days.map((d) => {
          const s = d < first ? 'pad' : cellState(habit, checkins, d, today)
          const disabled = s === 'off' || s === 'pad'
          return (
            <button
              key={d}
              className={`history-cell cell-${s}`}
              disabled={disabled}
              aria-hidden={s === 'pad' || undefined}
              aria-label={s === 'pad' ? undefined : `${d}: ${LABEL[s]}`}
              onClick={() => onOpen(habit, d)}
              title={s === 'pad' ? undefined : `${d}: ${LABEL[s]}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function History({ habits, checkins, today, onOpen }) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!habits.length) {
    return (
      <div className="empty-card-subtle">
        <Sparkles size={32} className="muted-icon" />
        <p className="muted">Belum ada habit untuk ditampilkan riwayatnya.</p>
      </div>
    )
  }

  const filtered = habits.filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))

  return (
    <section className="screen-container">
      <header className="header-card">
        <div className="header-top">
          <div>
            <span className="date-badge">
              <Calendar size={14} /> 30 Hari Terakhir
            </span>
            <h1 className="header-title">Riwayat & Konsistensi</h1>
          </div>
        </div>
      </header>

      {/* Search Input */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Cari dalam riwayat habit..."
      />

      {filtered.length === 0 ? (
        <div className="empty-card-subtle">
          <SearchX size={32} className="muted-icon" />
          <p className="muted">Tidak ada habit yang cocok dengan "{searchQuery}"</p>
        </div>
      ) : (
        <ul className="habit-list">
          {filtered.map((h) => {
            const pct = completionRate(h, checkins, today)
            const maxStreak = longestStreak(h, checkins, today)
            const pctFormatted = pct === null ? '–' : `${Math.round(pct * 100)}%`

            return (
              <li key={h.id} className="habit-card">
                <div className="history-card-header">
                  <span className="habit-name">{h.name}</span>
                  <div className="history-stats">
                    <span className="stat-chip" title="Tingkat Penyelesaian 30 Hari">
                      <Award size={14} className="stat-chip-icon" />
                      <span>{pctFormatted} (30 hr)</span>
                    </span>
                    <span className="stat-chip flame-chip" title="Streak Terpanjang">
                      <Flame size={14} className="flame-icon" />
                      <span>Max {maxStreak}d</span>
                    </span>
                  </div>
                </div>

                <div className="history-grid-container">
                  <Grid habit={h} checkins={checkins} today={today} onOpen={onOpen} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
