/**
 * Drizzle's `numeric` columns come back as strings to preserve precision. The
 * UI works with numbers, so we normalize at the API boundary.
 */
export function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Same as `num` but errors instead of returning null — for required columns. */
export function requireNum(value: string | number): number {
  const n = num(value);
  if (n === null) throw new Error(`Invalid numeric value: ${value}`);
  return n;
}
