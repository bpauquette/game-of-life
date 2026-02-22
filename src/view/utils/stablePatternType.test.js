import { classifyStablePatternType } from './stablePatternType.js';

describe('classifyStablePatternType', () => {
  it('returns Still Life for period 1', () => {
    expect(classifyStablePatternType({
      period: 1,
      popChanging: false,
      populationCount: 4
    })).toBe('Still Life');
  });

  it('returns oscillator label with period for period > 1', () => {
    expect(classifyStablePatternType({
      period: 2,
      popChanging: true,
      populationCount: 6
    })).toBe('Oscillator (Period 2)');
  });

  it('returns unclassified stable population when period is unknown but population is steady', () => {
    expect(classifyStablePatternType({
      period: 0,
      popChanging: false,
      populationCount: 5
    })).toBe('Stable Population (Unclassified)');
  });

  it('returns extinct pattern for zero population', () => {
    expect(classifyStablePatternType({
      period: 0,
      popChanging: false,
      populationCount: 0
    })).toBe('Extinct Pattern');
  });
});
