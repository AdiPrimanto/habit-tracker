import { useEffect } from 'react'

export default function GoalMissed({ message, goal, habit, done, onRetry, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="backdrop celebration-backdrop" onClick={onClose}>
      <div className="celebration goal-missed" role="dialog" aria-modal="true" aria-labelledby="missed-title" onClick={(e) => e.stopPropagation()}>
        <div className="celebration-anim" aria-hidden="true">🌱</div>
        <h2 id="missed-title">Target belum tercapai</h2>
        <p className="celebration-habit">{habit.name}</p>
        <p className="muted">
          {done}/{goal.target} centang
        </p>
        <p className="goal-message">“{message}”</p>
        <div className="celebration-actions">
          {onRetry && <button className="btn-primary" onClick={onRetry}>Coba lagi</button>}
          <button className="btn-secondary" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
