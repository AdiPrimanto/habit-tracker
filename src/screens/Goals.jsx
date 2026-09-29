import { useState } from 'react'
import { Target, Plus, CheckCircle2, XCircle, MinusCircle, AlertTriangle } from 'lucide-react'
import { goalInfo, goalProgress } from '../goals'

const shortDate = (d) => new Date(`${d}T12:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
const STATUS = {
  achieved: { Icon: CheckCircle2, label: 'Tercapai' },
  failed: { Icon: XCircle, label: 'Tidak tercapai' },
  cancelled: { Icon: MinusCircle, label: 'Dibatalkan' },
}

export default function Goals({ goals, habits, checkins, today, onCreate, onOpen, onCancel, onGoManage }) {
  const [confirmCancel, setConfirmCancel] = useState(null)
  const byId = new Map(habits.map((h) => [h.id, h]))
  const running = goals.filter((g) => g.status === 'active' && byId.has(g.habit_id))
  const finished = goals.filter((g) => g.status !== 'active' && byId.has(g.habit_id))
  const achievedCount = finished.filter((g) => g.status === 'achieved').length
  const canCreate = habits.some((h) => !h.archived_at && !running.some((g) => g.habit_id === h.id))
  const hasActiveHabit = habits.some((h) => !h.archived_at)

  return (
    <section className="screen-container">
      <header className="header-card">
        <div className="header-top">
          <div>
            <span className="date-badge">
              <Target size={14} /> Target
            </span>
            <h1 className="header-title">Target & Pencapaian</h1>
          </div>
        </div>
        <p className="goal-summary">
          {running.length} berjalan · {achievedCount} tercapai
        </p>
      </header>

      {!hasActiveHabit ? (
        <div className="empty-card-subtle">
          <p className="muted">Tambahkan habit dulu sebelum membuat target.</p>
          <button className="btn-secondary" onClick={onGoManage}>Ke Kelola</button>
        </div>
      ) : (
        <button className="btn-primary btn-block" onClick={() => onCreate(null)} disabled={!canCreate}>
          <Plus size={18} />
          <span>{canCreate ? 'Buat Target' : 'Semua habit sudah punya target'}</span>
        </button>
      )}

      <div className="manage-section">
        <h3 className="section-title">Sedang berjalan ({running.length})</h3>
        {running.length === 0 ? (
          <p className="muted">Belum ada target berjalan.</p>
        ) : (
          <ul className="habit-list">
            {running.map((g) => {
              const habit = byId.get(g.habit_id)
              const info = goalInfo(g, habit, checkins, today)
              const pct = Math.min(100, Math.round((info.done / g.target) * 100))
              return (
                <li key={g.id} className="habit-card goal-card">
                  <div className="goal-card-head">
                    <span className="habit-name">{habit.name}</span>
                    <span className="goal-count">
                      {info.done}/{g.target}
                    </span>
                  </div>
                  <div className="goal-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
                    <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="muted">
                    Sisa {info.daysLeft} hari · butuh {info.needed} lagi · s/d {shortDate(g.ends_on)}
                  </p>
                  {!info.reachable && (
                    <p className="form-error">
                      <AlertTriangle size={14} /> Sudah tidak mungkin tercapai di periode ini.
                    </p>
                  )}
                  <div className="form-actions">
                    {confirmCancel === g.id ? (
                      <>
                        <span className="error-text">Batalkan target ini?</span>
                        <button
                          className="btn-danger btn-sm"
                          onClick={async () => (await onCancel(g)) && setConfirmCancel(null)}
                        >
                          Ya, batalkan
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => setConfirmCancel(null)}>
                          Tidak
                        </button>
                      </>
                    ) : (
                      <button className="btn-secondary btn-sm" onClick={() => setConfirmCancel(g.id)}>
                        Batalkan
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="manage-section">
        <h3 className="section-title">Riwayat target ({finished.length})</h3>
        {finished.length === 0 ? (
          <p className="muted">Target yang selesai akan muncul di sini.</p>
        ) : (
          <ul className="habit-list">
            {finished.map((g) => {
              const { Icon, label } = STATUS[g.status]
              return (
                <li key={g.id}>
                  <button className={`goal-history-row status-${g.status}`} onClick={() => onOpen(g)}>
                    <Icon size={20} aria-label={label} />
                    <span className="goal-history-main">
                      <span className="habit-name">{byId.get(g.habit_id).name}</span>
                      <span className="muted">
                        {goalProgress(g, checkins)}/{g.target} · {shortDate(g.starts_on)}–{shortDate(g.ends_on)}
                      </span>
                    </span>
                    <span className="goal-history-status">{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
