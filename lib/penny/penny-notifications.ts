import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { pickCopy } from './penny-copy'
import { loadNotificationIds, saveNotificationIds } from './penny-state'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
})

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  if (!(await hasPermission())) return
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  })
}

// Called every time an expense is saved.
// Cancels old inactivity chain and schedules a fresh one from now.
export async function scheduleInactivityChain(): Promise<void> {
  if (!(await hasPermission())) return
  const oldIds = await loadNotificationIds('inactivityIds')
  await Promise.all(oldIds.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})))

  const schedule = [
    { hours: 24,  key: 'inactivity_1_day' },
    { hours: 48,  key: 'inactivity_2_days' },
    { hours: 72,  key: 'inactivity_3_days' },
    { hours: 120, key: 'inactivity_5_days' },
    { hours: 168, key: 'inactivity_7_days' },
  ]

  const ids: string[] = []
  for (const { hours, key } of schedule) {
    const copy = pickCopy(key)
    const date = new Date(Date.now() + hours * 60 * 60 * 1000)
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: copy.title, body: copy.body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    })
    ids.push(id)
  }
  await saveNotificationIds('inactivityIds', ids)
}

// Called on every app foreground.
// Schedules noon / evening / final-warning nudges for today if not logged yet.
export async function scheduleDailyNudges(lastLoggedAt: Date | null): Promise<void> {
  if (!(await hasPermission())) return
  const oldIds = await loadNotificationIds('nudgeIds')
  await Promise.all(oldIds.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})))

  const now = new Date()
  const todayStr = toDateStr(now)
  const lastStr  = lastLoggedAt ? toDateStr(lastLoggedAt) : null

  // If already logged today, no nudges needed
  if (lastStr === todayStr) {
    await saveNotificationIds('nudgeIds', [])
    return
  }

  const nudges = [
    { hour: 12, key: 'nudge_noon' },
    { hour: 18, key: 'nudge_evening' },
    { hour: 22, key: 'nudge_final_warning' },
  ]

  const ids: string[] = []
  for (const { hour, key } of nudges) {
    const date = new Date()
    date.setHours(hour, 0, 0, 0)
    if (date.getTime() <= now.getTime()) continue
    const copy = pickCopy(key)
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: copy.title, body: copy.body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    })
    ids.push(id)
  }
  await saveNotificationIds('nudgeIds', ids)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
