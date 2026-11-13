import { calculateConsumedUnits } from './calculateConsumedUnits';

describe('calculateConsumedUnits', () => {
  it('calculates current minus previous with decimal meter readings', () => {
    expect(calculateConsumedUnits('140.589', '149.959')).toBe('9.37');
  });

  it('accepts comma decimals and zero consumption', () => {
    expect(calculateConsumedUnits('10,5', '10,5')).toBe('0');
  });

  it('rejects a lower current reading unless the previous reading is reset', () => {
    expect(() => calculateConsumedUnits('120', '7')).toThrow('La lectura actual no puede ser menor que la anterior.');
    expect(calculateConsumedUnits('0', '7')).toBe('7');
  });
});
