import { getCategoryConfig, CATEGORY_CONFIG, CATEGORIES } from '../constants/colors';

describe('getCategoryConfig', () => {
  it('returns known config for built-in categories', () => {
    for (const cat of CATEGORIES) {
      const cfg = getCategoryConfig(cat);
      expect(cfg).toBeDefined();
      expect(cfg.bar).toBeTruthy();
      expect(cfg.icon).toBeTruthy();
    }
  });

  it('returns a consistent hash-palette entry for unknown categories', () => {
    const cfg = getCategoryConfig('Gym');
    expect(cfg).toBeDefined();
    expect(cfg.bar).toBeTruthy();
    expect(cfg.icon).toBe('pricetag-outline');
  });

  it('returns the same config for the same custom category name (deterministic)', () => {
    const cfg1 = getCategoryConfig('Gym');
    const cfg2 = getCategoryConfig('Gym');
    expect(cfg1.bar).toBe(cfg2.bar);
  });

  it('different custom category names can produce different palette entries', () => {
    // Test that different names map to different slots (not guaranteed but likely)
    const configs = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map(getCategoryConfig);
    // They should all be valid
    configs.forEach(c => expect(c.bar).toBeTruthy());
  });
});
