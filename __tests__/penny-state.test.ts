import { canNotify, canRoastCategory, isMidpointPraisedThisMonth } from '../lib/penny/penny-state';
import type { PennyState } from '../lib/penny/penny-state';

const makeState = (overrides: Partial<PennyState> = {}): PennyState => ({
  lastLoggedAt: null,
  lastNotifiedAt: null,
  dailyCount: 0,
  lastThresholdCrossed: 0,
  roastedAt: {},
  streakNotified: 0,
  midpointPraised: false,
  midpointMonth: null,
  ...overrides,
});

describe('canNotify', () => {
  it('returns true when no notifications sent', () => {
    expect(canNotify(makeState())).toBe(true);
  });

  it('returns false when daily cap (3) reached', () => {
    expect(canNotify(makeState({ dailyCount: 3 }))).toBe(false);
  });

  it('returns false when notified within the hour', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    expect(canNotify(makeState({ lastNotifiedAt: recent }))).toBe(false);
  });

  it('returns true when last notification was 2 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(canNotify(makeState({ lastNotifiedAt: twoHoursAgo }))).toBe(true);
  });
});

describe('canRoastCategory', () => {
  it('returns true when never roasted', () => {
    expect(canRoastCategory('coffee', {})).toBe(true);
  });

  it('returns false when roasted within 24 hours', () => {
    const recentlyRoasted = { coffee: Date.now() - 12 * 60 * 60 * 1000 };
    expect(canRoastCategory('coffee', recentlyRoasted)).toBe(false);
  });

  it('returns true when roasted more than 24 hours ago', () => {
    const oldRoast = { coffee: Date.now() - 25 * 60 * 60 * 1000 };
    expect(canRoastCategory('coffee', oldRoast)).toBe(true);
  });
});

describe('isMidpointPraisedThisMonth', () => {
  it('returns false when not praised', () => {
    expect(isMidpointPraisedThisMonth(makeState())).toBe(false);
  });

  it('returns false when praised in a different month', () => {
    const state = makeState({ midpointPraised: true, midpointMonth: '2026-4' });
    expect(isMidpointPraisedThisMonth(state)).toBe(false);
  });

  it('returns true when praised this month', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const state = makeState({ midpointPraised: true, midpointMonth: thisMonth });
    expect(isMidpointPraisedThisMonth(state)).toBe(true);
  });
});
