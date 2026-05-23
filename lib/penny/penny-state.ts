import AsyncStorage from '@react-native-async-storage/async-storage'

const K = {
  lastLoggedAt:      'penny:lastLoggedAt',
  lastNotifiedAt:    'penny:lastNotifiedAt',
  dailyCount:        'penny:dailyCount',
  dailyDate:         'penny:dailyDate',
  thresholdCrossed:  'penny:thresholdCrossed',
  thresholdMonth:    'penny:thresholdMonth',
  roastedAt:         'penny:roastedAt',
  streakNotified:    'penny:streakNotified',
  midpointPraised:   'penny:midpointPraised',
  midpointMonth:     'penny:midpointMonth',
  inactivityIds:     'penny:inactivityIds',
  nudgeIds:          'penny:nudgeIds',
}

export type PennyState = {
  lastLoggedAt:         Date | null
  lastNotifiedAt:       Date | null
  dailyCount:           number
  lastThresholdCrossed: number
  roastedAt:            Record<string, number>
  streakNotified:       number
  midpointPraised:      boolean
  midpointMonth:         string | null
}

export async function loadPennyState(): Promise<PennyState> {
  const pairs = await AsyncStorage.multiGet(Object.values(K))
  const map: Record<string, string | null> = {}
  pairs.forEach(([k, v]) => { map[k] = v })

  const today = new Date().toDateString()
  const count = map[K.dailyDate] === today
    ? parseInt(map[K.dailyCount] ?? '0', 10)
    : 0

  const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
  const sameMonth = map[K.thresholdMonth] === currentMonth

  return {
    lastLoggedAt:         map[K.lastLoggedAt] ? new Date(map[K.lastLoggedAt]!) : null,
    lastNotifiedAt:       map[K.lastNotifiedAt] ? new Date(map[K.lastNotifiedAt]!) : null,
    dailyCount:           count,
    lastThresholdCrossed: sameMonth ? parseInt(map[K.thresholdCrossed] ?? '0', 10) : 0,
    roastedAt:            map[K.roastedAt] ? JSON.parse(map[K.roastedAt]!) : {},
    streakNotified:       parseInt(map[K.streakNotified] ?? '0', 10),
    midpointPraised:      map[K.midpointPraised] === 'true',
    midpointMonth:         map[K.midpointMonth] ?? null,
  }
}

export async function markExpenseSaved(): Promise<void> {
  await AsyncStorage.setItem(K.lastLoggedAt, new Date().toISOString())
}

export async function markNotificationSent(state: PennyState): Promise<void> {
  await AsyncStorage.multiSet([
    [K.lastNotifiedAt, new Date().toISOString()],
    [K.dailyCount,     String(state.dailyCount + 1)],
    [K.dailyDate,      new Date().toDateString()],
  ])
}

export async function markThresholdCrossed(threshold: number): Promise<void> {
  const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
  await AsyncStorage.multiSet([
    [K.thresholdCrossed, String(threshold)],
    [K.thresholdMonth,   currentMonth],
  ])
}

export async function markRoasted(roastKey: string, state: PennyState): Promise<void> {
  const updated = { ...state.roastedAt, [roastKey]: Date.now() }
  await AsyncStorage.setItem(K.roastedAt, JSON.stringify(updated))
}

export async function markMidpointPraised(): Promise<void> {
  const month = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
  await AsyncStorage.multiSet([
    [K.midpointPraised, 'true'],
    [K.midpointMonth,   month],
  ])
}

export function isMidpointPraisedThisMonth(state: PennyState): boolean {
  const month = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
  return state.midpointPraised && state.midpointMonth === month
}

export async function resetStreakNotified(): Promise<void> {
  await AsyncStorage.setItem(K.streakNotified, '0')
}

export async function markStreakNotified(streak: number): Promise<void> {
  await AsyncStorage.setItem(K.streakNotified, String(streak))
}

export async function saveNotificationIds(
  key: 'inactivityIds' | 'nudgeIds',
  ids: string[]
): Promise<void> {
  await AsyncStorage.setItem(K[key], JSON.stringify(ids))
}

export async function loadNotificationIds(
  key: 'inactivityIds' | 'nudgeIds'
): Promise<string[]> {
  const raw = await AsyncStorage.getItem(K[key])
  return raw ? JSON.parse(raw) : []
}

export function canNotify(state: PennyState): boolean {
  const DAILY_MAX = 3
  const HOURLY_COOLDOWN = 60 * 60 * 1000
  if (state.dailyCount >= DAILY_MAX) return false
  if (state.lastNotifiedAt && Date.now() - state.lastNotifiedAt.getTime() < HOURLY_COOLDOWN) return false
  return true
}

export function canRoastCategory(roastKey: string, roastedAt: Record<string, number>): boolean {
  const last = roastedAt[roastKey]
  if (!last) return true
  return Date.now() - last > 24 * 60 * 60 * 1000
}
