import { useEffect } from 'react'
import { achievedDayNumber } from '../goals'

const EMOJI = { confetti: '🎊', fireworks: '🎆', stars: '🌟', balloons: '🎈', trophy: '🏆' }
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Celebration({ variant, message, goal, habit, onDetail, onNext, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const mode = reducedMotion() ? 'static' : variant

  return (
    <div className="backdrop celebration-backdrop" onClick={onClose}>
      <div
        className={`celebration celebration-${mode}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="celebration-anim" aria-hidden="true">{EMOJI[variant]}</div>
        <h2 id="celebration-title">Target tercapai!</h2>
        <p className="celebration-habit">{habit.name}</p>
        <p className="muted">
          {goal.target}x dalam {achievedDayNumber(goal)} hari
        </p>
        <p className="goal-message">“{message}”</p>
        <div className="celebration-actions">
          <button className="btn-primary" onClick={onNext}>Buat target berikutnya</button>
          <button className="btn-secondary" onClick={onDetail}>Lihat detail</button>
          <button className="btn-secondary" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
