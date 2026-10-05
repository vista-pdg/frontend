/** Matches the backend's integer domain; no silent truncation or non-finite values. */
export function parseAlgorithmInteger(raw: string): number | null {
  const value = raw.trim();
  if (!/^[+-]?\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= -2147483648 && number <= 2147483647 ? number : null;
}

export function parseAlgorithmValues(raw: string, limit: number): number[] | null {
  const parts = raw.trim().split(/[\s,]+/).filter(Boolean);
  if (!parts.length || parts.length > limit) return null;
  const values = parts.map(parseAlgorithmInteger);
  return values.every((value): value is number => value !== null) ? values : null;
}
