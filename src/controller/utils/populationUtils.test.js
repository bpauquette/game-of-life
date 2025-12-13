import isPopulationStable from './populationUtils';

describe('isPopulationStable', () => {
  it('returns true for stable population', () => {
    const history = [10, 10, 10, 10, 10];
    expect(isPopulationStable(history, 5, 0)).toBe(true);
  });

  it('returns false for unstable population', () => {
    const history = [10, 11, 10, 12, 10];
    expect(isPopulationStable(history, 5, 0)).toBe(false);
  });

  it('respects tolerance', () => {
    const history = [10, 11, 10, 12, 10];
    expect(isPopulationStable(history, 5, 2)).toBe(true);
  });

  it('returns false if not enough history', () => {
    const history = [10];
    expect(isPopulationStable(history, 5, 0)).toBe(false);
  });
});
