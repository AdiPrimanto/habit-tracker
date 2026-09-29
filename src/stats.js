import { toKey, addDays, weekday } from './dates'

export const WINDOW = 365

export const key = (habitId, day) => `${habitId}|${day}`

const createdDay = (habit) => toKey(new Date(habit.created_at))
const windowStart = (today) => addDays(today, -WINDOW)
const firstDay = (habit, today) => {
  const c = createdDay(habit)
  const w = windowStart(today)
  return c > w ? c : w
}

export function isScheduled(habit, day) {
  return day >= createdDay(habit) && habit.days.includes(weekday(day))
}

export function streak(habit, checkins, today) {
  const start = firstDay(habit, today)
  let n = 0
  for (let d = today; d >= start; d = addDays(d, -1)) {
    if (!isScheduled(habit, d)) continue
    if (checkins.has(key(habit.id, d))) n++
    else if (d !== today) break
  }
  return n
}

export function longestStreak(habit, checkins, today) {
  let best = 0
  let run = 0
  for (let d = firstDay(habit, today); d <= today; d = addDays(d, 1)) {
    if (!isScheduled(habit, d)) continue
    if (checkins.has(key(habit.id, d))) best = Math.max(best, ++run)
    else if (d !== today) run = 0
  }
  return best
}

export function completionRate(habit, checkins, today) {
  let checked = 0
  let total = 0
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i)
    if (!isScheduled(habit, d)) continue
    const c = checkins.has(key(habit.id, d))
    if (d === today && !c) continue
    total++
    if (c) checked++
  }
  return total ? checked / total : null
}

export function cellState(habit, checkins, day, today) {
  if (day > today) return 'future'
  if (day < windowStart(today)) return 'off'
  if (checkins.has(key(habit.id, day))) return 'done'
  return isScheduled(habit, day) ? 'todo' : 'off'
}
