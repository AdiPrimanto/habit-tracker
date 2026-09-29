import { addDays } from './dates'
import { isScheduled, key } from './stats'

export const DURATIONS = [
  { label: '1 minggu', days: 7 },
  { label: '2 minggu', days: 14 },
  { label: '1 bulan', days: 30 },
]

const daysBetween = (from, to) => {
  const out = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export const periodDays = (goal) => daysBetween(goal.starts_on, goal.ends_on)

export const goalDays = (goal) => periodDays(goal).length

export const goalProgress = (goal, checkins) =>
  periodDays(goal).filter((d) => checkins.has(key(goal.habit_id, d))).length

export const scheduledDaysBetween = (habit, from, to) => daysBetween(from, to).filter((d) => isScheduled(habit, d)).length

export const maxTarget = (habit, today, days) => scheduledDaysBetween(habit, today, addDays(today, days - 1))

export function goalInfo(goal, habit, checkins, today) {
  const done = goalProgress(goal, checkins)
  const needed = Math.max(0, goal.target - done)
  const daysLeft = today > goal.ends_on ? 0 : daysBetween(today > goal.starts_on ? today : goal.starts_on, goal.ends_on).length
  // Hari terjadwal di periode yang belum dicentang, termasuk hari lalu (bisa dicentang susulan)
  const capacity = periodDays(goal).filter((d) => isScheduled(habit, d) && !checkins.has(key(goal.habit_id, d))).length
  return { done, needed, daysLeft, reachable: needed <= capacity }
}

export const achievedDayNumber = (goal) => daysBetween(goal.starts_on, goal.finished_on).length

export function dueTransitions(goals, checkins, today) {
  const active = goals.filter((g) => g.status === 'active')
  return {
    achieve: active.filter((g) => goalProgress(g, checkins) >= g.target),
    fail: active.filter((g) => g.ends_on < today && goalProgress(g, checkins) < g.target),
  }
}

export function suggestNextTarget(goal, habit, today, days) {
  const base = goal.status === 'achieved' ? Math.ceil(goal.target * 1.1) : goal.target
  return Math.max(1, Math.min(base, maxTarget(habit, today, days)))
}

export const newGoal = ({ habitId, target, days }, today) => ({
  habit_id: habitId,
  target,
  starts_on: today,
  ends_on: addDays(today, days - 1),
})

export function validateGoal({ target, days }, habit, today) {
  if (!Number.isInteger(days) || days < 1 || days > 365) return 'Durasi harus 1–365 hari.'
  if (!Number.isInteger(target) || target < 1) return 'Target minimal 1x.'
  const max = maxTarget(habit, today, days)
  if (max === 0) return 'Tidak ada hari terjadwal di periode ini.'
  if (target > max) return `Maksimal ${max}x di periode ini.`
  return null
}
