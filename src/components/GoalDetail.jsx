import { useEffect } from 'react'
import { CheckCircle2, XCircle, MinusCircle, RotateCcw, X, FileText } from 'lucide-react'
import { achievedDayNumber, goalDays, goalProgress, periodDays } from '../goals'
import { isScheduled, key } from '../stats'

const fmt = (d) => new Date(`${d}T12:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const STATUS = {
  achieved: { Icon: CheckCircle2, label: 'Tercapai' },
  failed: { Icon: XCircle, label: 'Tidak tercapai' },
  cancelled: { Icon: MinusCircle, label: 'Dibatalkan' },
  active: { Icon: RotateCcw, label: 'Berjalan' },
}

export default function GoalDetail({ goal, habit, checkins, today, message, canRepeat, onRepeat, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { Icon, label } = STATUS[goal.status]
  const days = periodDays(goal)
  const notes = days.map((d) => [d, checkins.get(key(goal.habit_id, d))]).filter(([, n]) => n)

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet-modal" role="dialog" aria-modal="true" aria-label={`Detail target ${habit.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="sheet-title-group">
            <div className={`sheet-icon-wrap status-${goal.status}`}>
              <Icon size={20} />
            </div>
            <div>
              <h2 className="sheet-habit-name">{habit.name}</h2>
              <p className="sheet-date-text">
                {label} · {fmt(goal.starts_on)} – {fmt(goal.ends_on)}
              </p>
            </div>
          </div>
          <button className="btn-close-sheet" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          <p className="goal-detail-result">
            <strong>{goalProgress(goal, checkins)}</strong> / {goal.target} centang
          </p>
          {goal.status === 'achieved' && (
            <p className="muted">
              Tercapai di hari ke-{achievedDayNumber(goal)} dari {goalDays(goal)} ({fmt(goal.finished_on)})
            </p>
          )}

          <div className="goal-period-grid" aria-label="Hari dalam periode">
            {days.map((d) => {
              const s = d > today ? 'future' : checkins.has(key(goal.habit_id, d)) ? 'done' : isScheduled(habit, d) ? 'todo' : 'off'
              return <span key={d} className={`history-cell cell-${s}`} title={`${d}: ${s}`} />
            })}
          </div>

          {notes.length > 0 && (
            <ul className="goal-notes">
              {notes.map(([d, n]) => (
                <li key={d}>
                  <FileText size={14} /> <strong>{new Date(`${d}T12:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</strong> {n}
                </li>
              ))}
            </ul>
          )}

          {message && <p className="goal-message">“{message}”</p>}
        </div>

        <div className="sheet-footer">
          {canRepeat && (
            <button className="btn-primary" onClick={onRepeat}>
              <RotateCcw size={16} />
              <span>{goal.status === 'achieved' ? 'Buat target berikutnya' : 'Coba lagi'}</span>
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
