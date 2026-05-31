import { Platform } from 'react-native'

import { getPennyIconState, type PennyIconState } from './penny-triggers'

const ICON_MAP: Record<PennyIconState, string> = {
  composed:     'composed',
  concerned:    'concerned',
  disappointed: 'disappointed',
  feral:        'feral',
  final_form:   'final_form',
}

export async function updatePennyIcon(lastLoggedAt: Date | null): Promise<void> {
  if (Platform.OS !== 'ios') return

  const state    = getPennyIconState(lastLoggedAt)
  const iconName = ICON_MAP[state]

  try {
    const { setAppIcon, getAppIcon } = await import('expo-dynamic-app-icon')
    const current   = getAppIcon()
    const onPrimary = !current || current === '' || current === 'DEFAULT'
    // Skip swapping to composed if already on primary — avoids iOS "App icon changed" toast
    if (iconName === 'composed' && onPrimary) return
    if (current !== iconName) setAppIcon(iconName)
  } catch {
    // Dynamic icons require a native build — silently skip in Expo Go
  }
}
