import { getPennyIconState, getBudgetThresholdAlert, computeStreak, getRoastKey } from '../lib/penny/penny-triggers';
import type { Expense } from '../context/ExpenseContext';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: '1',
  amount: 10,
  date: '2026-05-28',
  description: 'Test',
  category: 'Food',
  notes: '',
  captureMethod: 'text',
  receiptPath: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('getPennyIconState', () => {
  it('returns concerned for null (brand new install)', () => {
    expect(getPennyIconState(null)).toBe('concerned');
  });

  it('returns composed when logged within 6 hours', () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(getPennyIconState(recent)).toBe('composed');
  });

  it('returns concerned when 7-23 hours since last log', () => {
    const past = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(getPennyIconState(past)).toBe('concerned');
  });

  it('returns disappointed at 24-47 hours', () => {
    const past = new Date(Date.now() - 36 * 60 * 60 * 1000);
    expect(getPennyIconState(past)).toBe('disappointed');
  });

  it('returns feral at 48-71 hours', () => {
    const past = new Date(Date.now() - 60 * 60 * 60 * 1000);
    expect(getPennyIconState(past)).toBe('feral');
  });

  it('returns final_form at 72+ hours', () => {
    const past = new Date(Date.now() - 100 * 60 * 60 * 1000);
    expect(getPennyIconState(past)).toBe('final_form');
  });
});

describe('getBudgetThresholdAlert', () => {
  it('returns null when totalBudget is 0', () => {
    expect(getBudgetThresholdAlert(500, 0, 0)).toBeNull();
  });

  it('returns 50 when crossing 50% for the first time', () => {
    expect(getBudgetThresholdAlert(600, 1000, 0)).toBe(50);
  });

  it('returns null when threshold already crossed', () => {
    expect(getBudgetThresholdAlert(600, 1000, 50)).toBeNull();
  });

  it('returns 100 when at exactly 100%', () => {
    expect(getBudgetThresholdAlert(1000, 1000, 90)).toBe(100);
  });

  it('returns 200 when double budget, not previously crossed', () => {
    expect(getBudgetThresholdAlert(2100, 1000, 150)).toBe(200);
  });
});

describe('computeStreak', () => {
  it('returns 0 for empty expenses', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 1 for just today', () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(computeStreak([makeExpense({ date: dateStr })])).toBe(1);
  });

  it('breaks streak when a day is missing', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    // skip today — streak should be 0 (today has no expense, streak breaks immediately)
    const dateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(computeStreak([makeExpense({ date: dateStr })])).toBe(0);
  });
});

describe('getRoastKey', () => {
  it('returns food_delivery for Uber Eats', () => {
    expect(getRoastKey(makeExpense({ category: 'Food', description: 'Uber Eats' }), 0, 12)).toBe('food_delivery');
  });

  it('returns coffee when 3+ coffees this week', () => {
    expect(getRoastKey(makeExpense({ category: 'Food', description: 'Starbucks' }), 3, 12)).toBe('coffee');
  });

  it('returns food_generic for regular food', () => {
    expect(getRoastKey(makeExpense({ category: 'Food', description: 'Biryani' }), 0, 12)).toBe('food_generic');
  });

  it('returns late_night_shopping after 10pm', () => {
    expect(getRoastKey(makeExpense({ category: 'Shopping', description: 'Random stuff' }), 0, 22)).toBe('late_night_shopping');
  });

  it('returns null for custom categories', () => {
    expect(getRoastKey(makeExpense({ category: 'Gym', description: 'Monthly fee' }), 0, 12)).toBeNull();
  });

  it('returns null for Other category', () => {
    expect(getRoastKey(makeExpense({ category: 'Other', description: 'Misc' }), 0, 12)).toBeNull();
  });

  it('returns bills_generic for Bills', () => {
    expect(getRoastKey(makeExpense({ category: 'Bills', description: 'Electricity' }), 0, 12)).toBe('bills_generic');
  });
});
