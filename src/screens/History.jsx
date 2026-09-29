import { useEffect, useRef } from 'react'
import { addDays, weekday } from '../dates'
import { WINDOW, cellState, completionRate, longestStreak } from '../stats'

const LABEL = { done: 'selesai', todo: 'belum', off: 'tidak terjadwal' }

function Grid({ habit, checkins, today, onOpen }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current.scrollLeft = ref.current.scrollWidth // tampilkan minggu terbaru dulu
  }, [])

  const first = addDays(today, -(WINDOW - 1))
  const start = addDays(first, -weekday(first)) // kolom dimulai hari Minggu
  const days = []
  for (let d = start; d <= today; d = addDays(d, 1)) days.push(d)

  return (
    <div className="grid-wrap" ref={ref}>
      <div className="grid">
        {days.map((d) => {
          const s = d < first ? 'pad' : cellState(habit, checkins, d, today)
          const disabled = s === 'off' || s === 'pad'
          return (
            <button
              key={d}
              className={`cell ${s}`}
              disabled={disabled}
              aria-hidden={s === 'pad' || undefined}
              aria-label={s === 'pad' ? undefined : `${d}: ${LABEL[s]}`}
              onClick={() => onOpen(habit, d)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function History({ habits, checkins, today, onOpen }) {
  if (!habits.length) return <p className="muted">Belum ada habit.</p>
  return (
    <section>
      <h1>Riwayat</h1>
      <ul className="list">
        {habits.map((h) => {
          const pct = completionRate(h, checkins, today)
          return (
            <li key={h.id} className="row">
              <span className="name">{h.name}</span>
              <p className="muted">
                {pct === null ? '–' : `${Math.round(pct * 100)}%`} 30 hari · terpanjang {longestStreak(h, checkins, today)} hari
              </p>
              <Grid habit={h} checkins={checkins} today={today} onOpen={onOpen} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
