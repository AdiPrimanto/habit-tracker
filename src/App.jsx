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
import BackgroundDecoration from './components/BackgroundDecoration'
import SkeletonLoading from './components/SkeletonLoading'
import Goals from './screens/Goals'
import GoalForm from './components/GoalForm'
import GoalDetail from './components/GoalDetail'
import Celebration from './components/Celebration'
import GoalMissed from './components/GoalMissed'
import { dueTransitions, goalProgress, goalDays, newGoal, suggestNextTarget } from './goals'
import { ACHIEVED_MESSAGES, ANIMATIONS, FAILED_MESSAGES, pickRandom } from './motivation'
import { Calendar, History as HistoryIcon, Settings, AlertTriangle, RotateCcw, Target } from 'lucide-react'

const TABS = [
  { id: 'today', label: 'Hari Ini', Icon: Calendar },
  { id: 'history', label: 'Riwayat', Icon: HistoryIcon },
  { id: 'goals', label: 'Target', Icon: Target },
  { id: 'manage', label: 'Kelola', Icon: Settings },
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
  const loadSeq = useRef(0)
  const [goals, setGoals] = useState([])
  const [goalForm, setGoalForm] = useState(null) // { initial } | null
  const [goalDetail, setGoalDetail] = useState(null) // { goalId, message } | null
  const [celebration, setCelebration] = useState(null) // { goalId, variant, message } | null
  const [missed, setMissed] = useState([]) // [{ goalId, message }]
  const lastPick = useRef({})

  // Acak tanpa mengulang pilihan terakhir per jenis
  const pick = (kind, list) => (lastPick.current[kind] = pickRandom(list, lastPick.current[kind]))

  // Target yang sudah tercapai/lewat periode tapi masih active (mis. centang dari device lain)
  const settleGoals = async (list, map, t) => {
    const { achieve, fail } = dueTransitions(list, map, t)
    const jobs = [...achieve.map((g) => api.finishGoal(g.id, 'achieved', t)), ...fail.map((g) => api.finishGoal(g.id, 'failed', g.ends_on))]
    if (!jobs.length) return
    try {
      const rows = (await Promise.all(jobs)).flat()
      setGoals((gs) => gs.map((g) => rows.find((r) => r.id === g.id) ?? g))
      const failed = rows.filter((r) => r.status === 'failed')
      if (failed.length) setMissed((q) => [...q, ...failed.map((g) => ({ goalId: g.id, message: pick('failed', FAILED_MESSAGES) }))])
    } catch (e) {
      setToast(`Gagal memperbarui target: ${e.message}`)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    const t = todayKey()
    setToday(t)
    const seq = ++loadSeq.current
    try {
      const data = await api.loadAll(addDays(t, -WINDOW))
      if (seq !== loadSeq.current) return
      const map = new Map(data.checkins.map((r) => [key(r.habit_id, r.day), r.note]))
      setHabits(data.habits)
      setCheckins(map)
      setGoals(data.goals)
      setLoadError(null)
      setLoaded(true)
      settleGoals(data.goals, map, t)
    } catch (e) {
      if (seq !== loadSeq.current) return
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
    loadSeq.current++
    const wasChecked = checkins.has(k)
    const prevNote = checkins.get(k) ?? null
    setCheckins((m) => {
      const n = new Map(m)
      wasChecked ? n.delete(k) : n.set(k, null)
      return n
    })
    let saved = false
    try {
      await api.setChecked(habitId, day, !wasChecked)
      saved = true
    } catch (e) {
      setCheckins((m) => {
        const n = new Map(m)
        wasChecked ? n.set(k, prevNote) : n.delete(k)
        return n
      })
      setToast(`Gagal menyimpan: ${e.message}`)
    } finally {
      pending.current.delete(k)
      loadSeq.current++
    }
    if (saved && !wasChecked) {
      const goal = goals.find((g) => g.habit_id === habitId && g.status === 'active')
      if (goal && day >= goal.starts_on && day <= goal.ends_on && goalProgress(goal, new Map(checkins).set(k, null)) >= goal.target) {
        achieveGoal(goal)
      }
    }
  }

  const achieveGoal = async (goal) => {
    try {
      const [row] = await api.finishGoal(goal.id, 'achieved', todayKey())
      if (!row) return // sudah diselesaikan device lain
      setGoals((gs) => gs.map((g) => (g.id === row.id ? row : g)))
      setCelebration({ goalId: row.id, variant: pick('anim', ANIMATIONS), message: pick('achieved', ACHIEVED_MESSAGES) })
    } catch (e) {
      setToast(`Gagal menyimpan target: ${e.message}`)
    }
  }

  const quickToggle = (habit, day) =>
    checkins.get(key(habit.id, day)) ? setSheet({ habit, day }) : toggle(habit.id, day)

  const saveNote = async (habitId, day, text) => {
    const k = key(habitId, day)
    const prev = checkins.get(k) ?? null
    const note = text.trim() || null
    setCheckins((m) => new Map(m).set(k, note))
    loadSeq.current++
    let ok = false
    try {
      await api.saveNote(habitId, day, note)
      ok = true
    } catch (e) {
      setCheckins((m) => new Map(m).set(k, prev))
      setToast(`Gagal menyimpan catatan: ${e.message}`)
    } finally {
      loadSeq.current++
    }
    if (!ok) load()
    return ok
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

  const active = habits.filter((h) => !h.archived_at)
  const openSheet = (habit, day) => setSheet({ habit, day })
  const sheetKey = sheet && key(sheet.habit.id, sheet.day)

  const habitById = new Map(habits.map((h) => [h.id, h]))
  const goalById = new Map(goals.map((g) => [g.id, g]))
  const activeGoals = goals.filter((g) => g.status === 'active')
  const eligibleHabits = active.filter((h) => !activeGoals.some((g) => g.habit_id === h.id))
  const canRepeat = (goal) => {
    const h = habitById.get(goal.habit_id)
    return !!h && !h.archived_at && !activeGoals.some((g) => g.habit_id === goal.habit_id)
  }
  const repeatGoal = (goal) => {
    const days = goalDays(goal)
    const initial = { habitId: goal.habit_id, days, target: suggestNextTarget(goal, habitById.get(goal.habit_id), todayKey(), days) }
    setGoalDetail(null)
    setTab('goals')
    setGoalForm({ initial })
  }
  const openGoalDetail = (goal) => {
    const failedLike = goal.status !== 'achieved'
    setGoalDetail({ goalId: goal.id, message: failedLike ? pick('failed', FAILED_MESSAGES) : pick('achieved', ACHIEVED_MESSAGES) })
  }
  const submitGoal = ({ habitId, target, days }) => mutate(() => api.createGoal(newGoal({ habitId, target, days }, todayKey())))
  const cancelGoal = (goal) => mutate(() => api.finishGoal(goal.id, 'cancelled', todayKey()))
  const detailGoal = goalDetail && goalById.get(goalDetail.goalId)
  const celebrationGoal = celebration && goalById.get(celebration.goalId)
  const missedGoal = !celebration && missed.length > 0 && goalById.get(missed[0].goalId)
  const dropMissed = () => setMissed((q) => q.slice(1))

  return (
    <div className="app-layout">
      <BackgroundDecoration />

      {!loaded ? (
        <main className="page empty-loading-page">
          {loadError ? (
            <div className="error-card">
              <AlertTriangle size={36} className="error-icon" />
              <p className="error-msg">Gagal memuat data: {loadError}</p>
              <button className="btn-primary" onClick={load}>
                <RotateCcw size={16} />
                <span>Coba Lagi</span>
              </button>
            </div>
          ) : (
            <SkeletonLoading />
          )}
        </main>
      ) : (
        <main className="page">
          {tab === 'today' && (
            <Today
              habits={active}
              checkins={checkins}
              today={today}
              goals={activeGoals}
              onToggle={quickToggle}
              onOpen={openSheet}
              onGoManage={() => setTab('manage')}
            />
          )}
          {tab === 'history' && (
            <History habits={active} checkins={checkins} today={today} onOpen={openSheet} />
          )}
          {tab === 'goals' && (
            <Goals
              goals={goals}
              habits={habits}
              checkins={checkins}
              today={today}
              onCreate={(initial) => setGoalForm({ initial })}
              onOpen={openGoalDetail}
              onCancel={cancelGoal}
              onGoManage={() => setTab('manage')}
            />
          )}
          {tab === 'manage' && <Manage habits={habits} mutate={mutate} />}
        </main>
      )}

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

      {goalForm && (
        <GoalForm habits={eligibleHabits} today={today} initial={goalForm.initial} onSubmit={submitGoal} onClose={() => setGoalForm(null)} />
      )}

      {detailGoal && (
        <GoalDetail
          goal={detailGoal}
          habit={habitById.get(detailGoal.habit_id)}
          checkins={checkins}
          today={today}
          message={goalDetail.message}
          canRepeat={canRepeat(detailGoal)}
          onRepeat={() => repeatGoal(detailGoal)}
          onClose={() => setGoalDetail(null)}
        />
      )}

      {celebrationGoal && (
        <Celebration
          variant={celebration.variant}
          message={celebration.message}
          goal={celebrationGoal}
          habit={habitById.get(celebrationGoal.habit_id)}
          onDetail={() => {
            setCelebration(null)
            setTab('goals')
            setGoalDetail({ goalId: celebrationGoal.id, message: celebration.message })
          }}
          onNext={() => {
            setCelebration(null)
            repeatGoal(celebrationGoal)
          }}
          onClose={() => setCelebration(null)}
        />
      )}

      {missedGoal && (
        <GoalMissed
          message={missed[0].message}
          goal={missedGoal}
          habit={habitById.get(missedGoal.habit_id)}
          done={goalProgress(missedGoal, checkins)}
          onRetry={
            canRepeat(missedGoal)
              ? () => {
                  dropMissed()
                  repeatGoal(missedGoal)
                }
              : null
          }
          onClose={dropMissed}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <AlertTriangle size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Floating Pill Bottom Tab Bar */}
      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-current={tab === id ? 'page' : undefined}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={20} className="tab-icon" />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
