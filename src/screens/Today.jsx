import { addDays } from '../dates'
import { cellState, isScheduled, key, streak } from '../stats'

const LABEL = { done: 'selesai', todo: 'belum', off: 'tidak terjadwal', future: '' }
const longDate = (day) => new Date(`${day}T12:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Today({ habits, checkins, today, onToggle, onOpen, onGoManage }) {
  if (!habits.length)
    return (
      <section className="empty">
        <p className="muted">Belum ada habit.</p>
        <button className="primary" onClick={onGoManage}>Tambah habit</button>
      </section>
    )

  const todays = habits.filter((h) => isScheduled(h, today))
  const doneCount = todays.filter((h) => checkins.has(key(h.id, today))).length
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  return (
    <section>
      <header className="head">
        <h1>{longDate(today)}</h1>
        <p className="muted">{doneCount}/{todays.length} selesai</p>
      </header>
      {!todays.length && <p className="muted">Tidak ada habit terjadwal hari ini.</p>}
      <ul className="list">
        {todays.map((h) => {
          const k = key(h.id, today)
          const checked = checkins.has(k)
          const note = checkins.get(k)
          return (
            <li key={h.id} className="row">
              <div className="row-top">
                <label className="check">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(h, today)} />
                  <span>{h.name}</span>
                </label>
                <span className="streak" title="Streak">🔥 {streak(h, checkins, today)}</span>
                {checked && (
                  <button className="icon" aria-label={`Catatan ${h.name}`} onClick={() => onOpen(h, today)}>✎</button>
                )}
              </div>
              <div className="week">
                {last7.map((d) => {
                  const s = cellState(h, checkins, d, today)
                  return (
                    <button
                      key={d}
                      className={`cell ${s}`}
                      disabled={s === 'off'}
                      aria-label={`${longDate(d)}: ${LABEL[s]}`}
                      onClick={() => onToggle(h, d)}
                    />
                  )
                })}
              </div>
              {note && <p className="note">{note}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
