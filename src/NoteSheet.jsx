import React, { useEffect, useState } from 'react'
import { FileText, CheckCircle2, XCircle, Save, X, Calendar } from 'lucide-react'

const fullDate = (day) =>
  new Date(`${day}T12:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

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
    onToggle()
  }

  const save = async () => {
    if (await onSave(text)) onClose()
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${habit.name}, ${fullDate(day)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <div className="sheet-title-group">
            <div className="sheet-icon-wrap">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="sheet-habit-name">{habit.name}</h2>
              <p className="sheet-date-text">
                <Calendar size={13} /> {fullDate(day)}
              </p>
            </div>
          </div>
          <button className="btn-close-sheet" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          {!checked ? (
            <button className="btn-primary btn-block" onClick={onToggle}>
              <CheckCircle2 size={18} />
              <span>Tandai Selesai</span>
            </button>
          ) : confirming ? (
            <div className="sheet-confirm-box">
              <span className="error-text">Catatan ini akan terhapus. Lanjut?</span>
              <div className="sheet-actions">
                <button className="btn-danger btn-sm" onClick={uncheck}>
                  Ya, Batal Centang
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setConfirming(false)}>
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-secondary btn-block" onClick={uncheck}>
              <XCircle size={18} />
              <span>Batal Centang</span>
            </button>
          )}

          <div className="note-textarea-wrap">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={280}
              rows={4}
              disabled={!checked}
              placeholder={checked ? 'Tulis catatan atau jurnal kecil hari ini...' : 'Centang dulu habit ini untuk menambah catatan'}
              aria-label="Catatan"
              className="sheet-textarea"
            />
            {checked && <span className="char-count">{text.length}/280</span>}
          </div>
        </div>

        <div className="sheet-footer">
          <button
            className="btn-primary"
            disabled={!checked || text.trim() === (note ?? '').trim()}
            onClick={save}
          >
            <Save size={16} />
            <span>Simpan</span>
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}
