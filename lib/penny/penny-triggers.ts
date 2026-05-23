import type { Expense } from '@/context/ExpenseContext'

export type PennyIconState = 'composed' | 'concerned' | 'disappointed' | 'feral' | 'final_form'

export function getPennyIconState(lastLoggedAt: Date | null): PennyIconState {
  // null = brand new install, never logged — show concerned not final_form
  if (!lastLoggedAt) return 'concerned'
  const hours = (Date.now() - lastLoggedAt.getTime()) / (1000 * 60 * 60)
  if (hours < 6)   return 'composed'
  if (hours < 24)  return 'concerned'
  if (hours < 48)  return 'disappointed'
  if (hours < 72)  return 'feral'
  return 'final_form'
}

const KEYWORDS: Record<string, string[]> = {
  food_delivery:  ['uber eats', 'deliveroo', 'foodpanda', 'careem food', 'doordash', 'delivery', 'hunger station'],
  coffee:         ['starbucks', 'coffee', 'café', 'cafe', 'espresso', 'latte', 'cappuccino', 'costa'],
  ride_share:     ['uber', 'careem', 'lyft', 'taxi', 'indriver', 'bykea', 'ride'],
  fuel:           ['petrol', 'fuel', 'gas station', 'cng', 'shell', 'pso', 'total parco', 'byco'],
  fast_fashion:   ['zara', 'h&m', 'shein', 'uniqlo', 'primark', 'sapphire', 'khaadi', 'outfitters', 'breakout'],
  beauty:         ['sephora', 'nykaa', 'skincare', 'makeup', 'beauty', 'salon', 'spa', 'mac cosmetics', 'lush', 'face', 'serum'],
  online_shopping:['amazon', 'daraz', 'aliexpress', 'noon', 'online order'],
  streaming:      ['netflix', 'spotify', 'youtube premium', 'disney', 'apple tv', 'hbo', 'prime video', 'crunchyroll'],
}

function matches(desc: string, keys: string[]): boolean {
  const lower = desc.toLowerCase()
  return keys.some(k => lower.includes(k))
}

export type RoastKey =
  | 'food_delivery' | 'coffee' | 'food_generic'
  | 'ride_share' | 'fuel' | 'transport_generic'
  | 'fast_fashion' | 'beauty' | 'online_shopping' | 'late_night_shopping' | 'shopping_generic'
  | 'streaming' | 'entertainment_generic'
  | 'bills_generic'

export function getRoastKey(
  expense: Expense,
  weekCoffeeCount: number,
  hourOfDay: number,
): RoastKey | null {
  const { category, description } = expense

  switch (category) {
    case 'Food':
      if (matches(description, KEYWORDS.food_delivery!)) return 'food_delivery'
      if (matches(description, KEYWORDS.coffee!) && weekCoffeeCount >= 3) return 'coffee'
      return 'food_generic'

    case 'Transport':
      if (matches(description, KEYWORDS.ride_share!)) return 'ride_share'
      if (matches(description, KEYWORDS.fuel!))       return 'fuel'
      return 'transport_generic'

    case 'Shopping':
      if (hourOfDay >= 22)                                    return 'late_night_shopping'
      if (matches(description, KEYWORDS.fast_fashion!))      return 'fast_fashion'
      if (matches(description, KEYWORDS.beauty!))            return 'beauty'
      if (matches(description, KEYWORDS.online_shopping!))   return 'online_shopping'
      return 'shopping_generic'

    case 'Entertainment':
      if (matches(description, KEYWORDS.streaming!)) return 'streaming'
      return 'entertainment_generic'

    case 'Bills':
      return 'bills_generic'

    case 'Other':
      return null
  }
}

const THRESHOLDS = [50, 75, 90, 100, 110, 150, 200]

export function getBudgetThresholdAlert(
  monthTotal: number,
  totalBudget: number,
  lastCrossed: number,
): number | null {
  if (totalBudget === 0) return null
  const pct = (monthTotal / totalBudget) * 100
  for (const t of THRESHOLDS) {
    if (pct >= t && lastCrossed < t) return t
  }
  return null
}

export function computeStreak(expenses: Expense[]): number {
  const days = new Set(expenses.map(e => e.date))
  let streak = 0
  const d = new Date()
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (days.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
