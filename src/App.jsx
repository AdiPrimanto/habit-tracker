import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import * as api from './api'
import { key, WINDOW } from './stats'
import { addDays, todayKey } from './dates'
import Login from './screens/Login'
import Today from './screens/Today'
import History from './screens/History'
import Manage from './screens/Manage'
import NoteSheet from './NoteSheet'

const TABS = [
  ['today', 'Hari ini'],
  ['history', 'Riwayat'],
  ['manage', 'Kelola'],
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = belum dicek
  const [habits, setHabits] = useState([])
  const [checkins, setCheckins] = useState(new Map())
  const [today, setToday] = useState(todayKey)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [tab, setTab] = useState('today')
  const [toast, setToast] = useState(null)
  const [sheet, setSheet] = useState(null) // { habit, day }
  const pending = useRef(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    const t = todayKey()
    setToday(t)
    try {
      const data = await api.loadAll(addDays(t, -WINDOW))
      setHabits(data.habits)
      setCheckins(new Map(data.checkins.map((r) => [key(r.habit_id, r.day), r.note])))
      setLoadError(null)
      setLoaded(true)
    } catch (e) {
      setLoadError(e.message)
      setToast(`Gagal memuat: ${e.message}`)
    }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const toggle = async (habitId, day) => {
    const k = key(habitId, day)
    if (pending.current.has(k) || day > todayKey()) return
    pending.current.add(k)
    const wasChecked = checkins.has(k)
    const prevNote = checkins.get(k) ?? null
    setCheckins((m) => {
      const n = new Map(m)
      wasChecked ? n.delete(k) : n.set(k, null)
      return n
    })
    try {
      await api.setChecked(habitId, day, !wasChecked)
    } catch (e) {
      setCheckins((m) => {
        const n = new Map(m)
        wasChecked ? n.set(k, prevNote) : n.delete(k)
        return n
      })
      setToast(`Gagal menyimpan: ${e.message}`)
    } finally {
      pending.current.delete(k)
    }
  }

  const quickToggle = (habit, day) =>
    checkins.get(key(habit.id, day)) ? setSheet({ habit, day }) : toggle(habit.id, day)

  const saveNote = async (habitId, day, text) => {
    const k = key(habitId, day)
    const prev = checkins.get(k) ?? null
    const note = text.trim() || null
    setCheckins((m) => new Map(m).set(k, note))
    try {
      await api.saveNote(habitId, day, note)
      return true
    } catch (e) {
      setCheckins((m) => new Map(m).set(k, prev))
      setToast(`Gagal menyimpan catatan: ${e.message}`)
      return false
    }
  }

  const mutate = async (fn) => {
    try {
      await fn()
      await load()
      return true
    } catch (e) {
      setToast(`Gagal menyimpan: ${e.message}`)
      return false
    }
  }

  if (session === undefined) return null
  if (!session) return <Login />
  if (!loaded)
    return (
      <main className="page empty">
        {loadError ? (
          <>
            <p className="error">Gagal memuat: {loadError}</p>
            <button onClick={load}>Coba lagi</button>
          </>
        ) : (
          <p className="muted">Memuat…</p>
        )}
      </main>
    )

  const active = habits.filter((h) => !h.archived_at)
  const openSheet = (habit, day) => setSheet({ habit, day })
  const sheetKey = sheet && key(sheet.habit.id, sheet.day)

  return (
    <>
      <main className="page">
        {tab === 'today' && (
          <Today
            habits={active}
            checkins={checkins}
            today={today}
            onToggle={quickToggle}
            onOpen={openSheet}
            onGoManage={() => setTab('manage')}
          />
        )}
        {tab === 'history' && <History habits={active} checkins={checkins} today={today} onOpen={openSheet} />}
        {tab === 'manage' && <Manage habits={habits} mutate={mutate} />}
      </main>
      {sheet && (
        <NoteSheet
          key={sheetKey}
          habit={sheet.habit}
          day={sheet.day}
          checked={checkins.has(sheetKey)}
          note={checkins.get(sheetKey) ?? ''}
          onToggle={() => toggle(sheet.habit.id, sheet.day)}
          onSave={(text) => saveNote(sheet.habit.id, sheet.day, text)}
          onClose={() => setSheet(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <nav className="tabbar">
        {TABS.map(([id, label]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
