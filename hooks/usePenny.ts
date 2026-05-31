import { useCallback } from 'react'

import type { Expense } from '@/context/ExpenseContext'
import { useExpenses } from '@/context/ExpenseContext'
import { updatePennyIcon } from '@/lib/penny/penny-icon'
import { pickCopy } from '@/lib/penny/penny-copy'
import {
  scheduleInactivityChain,
  scheduleDailyNudges,
  sendImmediateNotification,
} from '@/lib/penny/penny-notifications'
import {
  canNotify,
  canRoastCategory,
  isMidpointPraisedThisMonth,
  loadPennyState,
  markExpenseSaved,
  markMidpointPraised,
  markNotificationSent,
  markRoasted,
  markStreakNotified,
  markThresholdCrossed,
  resetStreakNotified,
} from '@/lib/penny/penny-state'
import {
  computeStreak,
  getBudgetThresholdAlert,
  getRoastKey,
} from '@/lib/penny/penny-triggers'

export function usePenny() {
  const { expenses, preferences, getMonthTotal } = useExpenses()

  const onExpenseSaved = useCallback(async (expense: Expense) => {
    // Persist last-logged timestamp and update icon immediately
    await markExpenseSaved()
    await updatePennyIcon(new Date())

    // Reschedule the inactivity chain from now and cancel today's nudges
    void scheduleInactivityChain().catch(console.warn)
    void scheduleDailyNudges(new Date()).catch(console.warn)

    const state = await loadPennyState()
    if (!canNotify(state)) return

    // Include the just-saved expense — React state may not have updated yet
    const allExpenses = [expense, ...expenses]

    // ── 1. Category roast ────────────────────────────────────────────────
    const hourOfDay = new Date().getHours()
    const weekAgo   = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weekCoffeeCount = allExpenses.filter(e =>
      e.category === 'Food' &&
      /coffee|starbucks|café|cafe|espresso|latte|cappuccino|costa/i.test(e.description) &&
      new Date(e.createdAt).getTime() >= weekAgo
    ).length

    const roastKey = getRoastKey(expense, weekCoffeeCount, hourOfDay)
    if (roastKey && canRoastCategory(roastKey, state.roastedAt)) {
      const copy = pickCopy(`roast_${roastKey}`)
      await sendImmediateNotification(copy.title, copy.body)
      await markRoasted(roastKey, state)
      await markNotificationSent(state)
      return
    }

    // ── 2. Budget threshold alert ─────────────────────────────────────────
    const now         = new Date()
    const monthTotal  = getMonthTotal(now.getFullYear(), now.getMonth() + 1) + expense.amount
    const totalBudget = Object.values(preferences.budgets).reduce<number>((s, v) => s + (v ?? 0), 0)
    const threshold   = getBudgetThresholdAlert(monthTotal, totalBudget, state.lastThresholdCrossed)

    if (threshold !== null) {
      const copy = pickCopy(`budget_${threshold}`)
      await sendImmediateNotification(copy.title, copy.body)
      await markThresholdCrossed(threshold)
      await markNotificationSent(state)
      return
    }

    // ── 3. Streak milestone ───────────────────────────────────────────────
    const streak = computeStreak(allExpenses)
    // Reset if streak broke since last milestone notification
    if (streak < state.streakNotified) await resetStreakNotified()
    if ((streak === 7 || streak === 30) && state.streakNotified < streak) {
      const copy = pickCopy(`positive_streak_${streak}`)
      await sendImmediateNotification(copy.title, copy.body)
      await markStreakNotified(streak)
      await markNotificationSent(state)
    }
  }, [expenses, preferences, getMonthTotal])

  const onForeground = useCallback(async () => {
    const state = await loadPennyState()
    await updatePennyIcon(state.lastLoggedAt)
    void scheduleDailyNudges(state.lastLoggedAt).catch(console.warn)

    // ── Midpoint praise (day 15, under 50% of total budget used) ─────────
    const now          = new Date()
    const totalBudget  = Object.values(preferences.budgets).reduce<number>((s, v) => s + (v ?? 0), 0)
    const monthTotal   = getMonthTotal(now.getFullYear(), now.getMonth() + 1)
    const isDay15      = now.getDate() === 15
    const underHalf    = totalBudget > 0 && monthTotal < totalBudget * 0.5

    if (isDay15 && underHalf && !isMidpointPraisedThisMonth(state) && canNotify(state)) {
      const copy = pickCopy('positive_midpoint')
      await sendImmediateNotification(copy.title, copy.body)
      await markMidpointPraised()
      await markNotificationSent(state)
    }
  }, [preferences, getMonthTotal])

  return { onExpenseSaved, onForeground }
}
