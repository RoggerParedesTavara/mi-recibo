jest.mock('react-native-mmkv', () => {
  const values = new Map<string, string>();
  return {
    createMMKV: () => ({
      contains: (key: string) => values.has(key),
      getString: (key: string) => values.get(key),
      set: (key: string, value: string) => values.set(key, value),
      remove: (key: string) => values.delete(key),
    }),
  };
});

import { localMeasurementRepository } from './localMeasurementRepository';

describe('local example measurements', () => {
  const now = new Date();
  const period = { billingYear: now.getFullYear(), billingMonth: now.getMonth() + 1 };

  it('preloads the spreadsheet examples for light and water for both tenants', async () => {
    const readings = await localMeasurementRepository.list({
      propertyId: 'local-property-1',
      ...period,
    });

    expect(readings).toHaveLength(4);
    expect(readings.map(reading => [reading.tenantId, reading.service, reading.consumedUnits])).toEqual(expect.arrayContaining([
      ['local-tenant-1', 'LUZ', '383.1'],
      ['local-tenant-1', 'AGUA', '9.37'],
      ['local-tenant-2', 'LUZ', '265.9'],
      ['local-tenant-2', 'AGUA', '16.231'],
    ]));
    expect(readings.every(reading => reading.source === 'example' && reading.syncState === 'example')).toBe(true);
  });

  it('replaces the matching example when a real reading is registered', async () => {
    const updated = await localMeasurementRepository.register({
      service: 'AGUA',
      propertyId: 'local-property-1',
      unitId: 'local-unit-1',
      tenantId: 'local-tenant-1',
      ...period,
      previousReading: '140.589',
      currentReading: '152.989',
    });

    expect(updated.source).toBe('manual');
    expect(updated.syncState).toBe('pending');
    expect(updated.consumedUnits).toBe('12.4');
    const readings = await localMeasurementRepository.list({
      propertyId: 'local-property-1',
      service: 'AGUA',
      tenantId: 'local-tenant-1',
      ...period,
    });
    expect(readings).toHaveLength(1);
    expect(readings[0].consumedUnits).toBe('12.4');
  });
});
