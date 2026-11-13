function decimalPlaces(value: string): number {
  return value.trim().replace(',', '.').split('.')[1]?.length ?? 0;
}

function parseReading(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Ingresa una lectura válida.');
  }
  return Number(normalized);
}

export function calculateConsumedUnits(previousReading: string, currentReading: string): string {
  const previous = parseReading(previousReading);
  const current = parseReading(currentReading);
  if (current < previous) {
    throw new Error('La lectura actual no puede ser menor que la anterior.');
  }

  const precision = Math.min(8, Math.max(decimalPlaces(previousReading), decimalPlaces(currentReading)));
  const scale = 10 ** precision;
  const difference = Math.round(current * scale) - Math.round(previous * scale);
  const result = (difference / scale).toFixed(precision);
  return result.includes('.') ? result.replace(/0+$/, '').replace(/\.$/, '') : result;
}
