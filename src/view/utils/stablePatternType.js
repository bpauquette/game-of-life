export function classifyStablePatternType({
  period = 0,
  popChanging = false,
  populationCount = 0
} = {}) {
  const safePeriod = Math.max(0, Math.floor(Number(period) || 0));
  const safePopulation = Math.max(0, Math.floor(Number(populationCount) || 0));

  if (safePopulation <= 0) return 'Extinct Pattern';
  if (safePeriod > 1) return `Oscillator (Period ${safePeriod})`;
  if (safePeriod === 1) return 'Still Life';
  if (!popChanging) return 'Stable Population (Unclassified)';
  return 'Stable Pattern';
}

export default classifyStablePatternType;
