import { useEffect, useState } from 'react'

const fullDate = (day) =>
  new Date(`${day}T12:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function NoteSheet({ habit, day, checked, note, onToggle, onSave, onClose }) {
  const [text, setText] = useState(note)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const uncheck = () => {
    if (note && !confirming) return setConfirming(true)
    setConfirming(false)
    setText('')
    onToggle()
  }

  const save = async () => {
    if (await onSave(text)) onClose()
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`${habit.name}, ${fullDate(day)}`} onClick={(e) => e.stopPropagation()}>
        <div>
          <h2>{habit.name}</h2>
          <p className="muted">{fullDate(day)}</p>
        </div>
        {!checked ? (
          <button className="primary" onClick={onToggle}>Centang</button>
        ) : confirming ? (
          <div className="actions">
            <span className="error">Catatan ikut terhapus. Lanjut?</span>
            <button className="danger" onClick={uncheck}>Ya, batal centang</button>
            <button onClick={() => setConfirming(false)}>Tidak</button>
          </div>
        ) : (
          <button onClick={uncheck}>Batal centang</button>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          disabled={!checked}
          placeholder={checked ? 'Catatan (opsional)' : 'Centang dulu untuk menambah catatan'}
          aria-label="Catatan"
        />
        <div className="actions">
          <button className="primary" disabled={!checked || text.trim() === (note ?? '').trim()} onClick={save}>Simpan</button>
          <button onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
