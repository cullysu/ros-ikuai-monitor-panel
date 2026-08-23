export function timeSeriesPointX(
  timestamp: number,
  start: number,
  end: number,
  left: number,
  right: number,
): number {
  if (end <= start) return left;
  return left + Math.min(1, Math.max(0, (timestamp - start) / (end - start))) * Math.max(0, right - left);
}

export function percentagePointY(value: number, top: number, bottom: number, min = 0, max = 100): number {
  const ratio = max <= min ? 0 : (value - min) / (max - min);
  return bottom - Math.min(1, Math.max(0, ratio)) * Math.max(0, bottom - top);
}

export function resourcePercentDomain(values: number[]): { min: number; max: number } {
  return { min: Math.max(0, Math.floor((Math.min(...values) - 5) / 10) * 10), max: 100 };
}
