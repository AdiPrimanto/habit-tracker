import { useEffect, useState } from 'react'
import { Target, Minus, Plus, X } from 'lucide-react'
import { DURATIONS, maxTarget, validateGoal } from '../goals'

export default function GoalForm({ habits, today, initial, onSubmit, onClose }) {
  const [habitId, setHabitId] = useState(initial?.habitId ?? habits[0]?.id ?? '')
  const [days, setDays] = useState(initial?.days ?? 30)
  const [custom, setCustom] = useState(initial ? !DURATIONS.some((d) => d.days === initial.days) : false)
  const [target, setTarget] = useState(initial?.target ?? 10)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const habit = habits.find((h) => h.id === habitId)
  const max = habit && Number.isInteger(days) && days >= 1 && days <= 365 ? maxTarget(habit, today, days) : 0
  const error = habit ? validateGoal({ target, days }, habit, today) : 'Pilih habit dulu.'

  const submit = async (e) => {
    e.preventDefault()
    if (error || busy) return
    setBusy(true)
    const ok = await onSubmit({ habitId, target, days }).finally(() => setBusy(false))
    if (ok) onClose()
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="sheet-modal" role="dialog" aria-modal="true" aria-label="Buat target" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-header">
          <div className="sheet-title-group">
            <div className="sheet-icon-wrap">
              <Target size={20} />
            </div>
            <h2 className="sheet-habit-name">Buat Target</h2>
          </div>
          <button type="button" className="btn-close-sheet" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          {habits.length === 0 ? (
            <p className="muted">Semua habit aktif sudah punya target berjalan.</p>
          ) : (
            <>
              <label className="form-label" htmlFor="goal-habit">Habit</label>
              <select id="goal-habit" className="form-input" value={habitId} onChange={(e) => setHabitId(e.target.value)}>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>

              <span className="form-label">Durasi (mulai hari ini)</span>
              <div className="goal-duration-chips" role="group" aria-label="Durasi">
                {DURATIONS.map((d) => (
                  <button
                    key={d.days}
                    type="button"
                    className={`btn-secondary btn-sm ${!custom && days === d.days ? 'is-selected' : ''}`}
                    aria-pressed={!custom && days === d.days}
                    onClick={() => {
                      setCustom(false)
                      setDays(d.days)
                    }}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`btn-secondary btn-sm ${custom ? 'is-selected' : ''}`}
                  aria-pressed={custom}
                  onClick={() => setCustom(true)}
                >
                  Custom
                </button>
              </div>
              {custom && (
                <label className="goal-custom-days">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="365"
                    className="form-input"
                    value={Number.isNaN(days) ? '' : days}
                    onChange={(e) => setDays(e.target.valueAsNumber)}
                    aria-label="Jumlah hari"
                  />
                  <span>hari</span>
                </label>
              )}

              <span className="form-label">Target</span>
              <div className="goal-stepper">
                <button type="button" className="btn-icon-action" aria-label="Kurangi target" onClick={() => setTarget((t) => Math.max(1, (t || 1) - 1))}>
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  className="form-input goal-target-input"
                  value={Number.isNaN(target) ? '' : target}
                  onChange={(e) => setTarget(e.target.valueAsNumber)}
                  aria-label="Target jumlah centang"
                />
                <button type="button" className="btn-icon-action" aria-label="Tambah target" onClick={() => setTarget((t) => (t || 0) + 1)}>
                  <Plus size={16} />
                </button>
                <span className="muted">kali</span>
              </div>
              <p className="muted">Maksimal {max}x di periode ini.</p>
              {error && <p className="form-error" role="alert">{error}</p>}
            </>
          )}
        </div>

        <div className="sheet-footer">
          <button type="submit" className="btn-primary" disabled={!!error || busy || habits.length === 0}>
            <Target size={16} />
            <span>{busy ? 'Menyimpan…' : 'Simpan Target'}</span>
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
