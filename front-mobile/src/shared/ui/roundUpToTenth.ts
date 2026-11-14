export function roundUpToTenth(amount: number): number {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(amount)) * 2;
  return Math.ceil((amount - tolerance) * 10) / 10;
}
