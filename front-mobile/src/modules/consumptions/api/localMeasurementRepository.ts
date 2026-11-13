import { localStorage, readJson, writeJson } from '../../../shared/storage/mmkv';
import type {
  ConsumptionMeasurement,
  Measurement,
  MeasurementFilter,
  RegisterMeasurementInput,
  UtilityService,
} from '../models/measurement';
import type { MeasurementRepository } from '../domain/measurementRepository';
import { calculateConsumedUnits } from '../domain/calculateConsumedUnits';

const STORAGE_KEY = 'consumptions.measurements.v2';
const LEGACY_STORAGE_KEY = 'consumptions.measurements.v1';
const EXAMPLES_SEEDED_KEY = 'consumptions.examples.seeded.v1';

const exampleConsumptions = [
  { service: 'LUZ', tenantId: 'local-tenant-1', unitId: 'local-unit-1', previousReading: '909.4', currentReading: '1292.5', consumedUnits: '383.1' },
  { service: 'LUZ', tenantId: 'local-tenant-2', unitId: 'local-unit-2', previousReading: '1292.5', currentReading: '1558.4', consumedUnits: '265.9' },
  { service: 'AGUA', tenantId: 'local-tenant-1', unitId: 'local-unit-1', previousReading: '140.589', currentReading: '149.959', consumedUnits: '9.37' },
  { service: 'AGUA', tenantId: 'local-tenant-2', unitId: 'local-unit-2', previousReading: '149.959', currentReading: '166.19', consumedUnits: '16.231' },
] as const;

function getRecords(): Measurement[] {
  return readJson<Measurement[]>(STORAGE_KEY, []);
}

function saveRecords(records: Measurement[]): void {
  writeJson(STORAGE_KEY, records);
}

function isManualMeasurement(value: unknown): value is ConsumptionMeasurement {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ConsumptionMeasurement>;
  return record.source === 'manual' && typeof record.id === 'string';
}

function isValidAmount(value: string): boolean {
  return /^\d+(?:[.,]\d+)?$/.test(value.trim());
}

function makeLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class LocalMeasurementRepository implements MeasurementRepository {
  initialize(): void {
    if (!localStorage.contains(STORAGE_KEY)) {
      const legacy = readJson<unknown[]>(LEGACY_STORAGE_KEY, []);
      const localReadings = legacy.filter(isManualMeasurement);
      writeJson(STORAGE_KEY, localReadings);
      localStorage.remove(LEGACY_STORAGE_KEY);
    }

    if (localStorage.contains(EXAMPLES_SEEDED_KEY)) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const records = getRecords();
    const examples: ConsumptionMeasurement[] = exampleConsumptions
      .filter(example => !records.some(record =>
        record.propertyId === 'local-property-1' &&
        record.unitId === example.unitId &&
        record.tenantId === example.tenantId &&
        record.service === example.service &&
        record.billingYear === year &&
        record.billingMonth === month,
      ))
      .map(example => ({
        ...example,
        propertyId: 'local-property-1',
        billingYear: year,
        billingMonth: month,
        id: `example-${example.service.toLowerCase()}-${example.tenantId}-${year}-${month}`,
        createdAt: now.toISOString(),
        syncState: 'example',
        source: 'example',
      }));
    if (examples.length) saveRecords([...examples, ...records]);
    localStorage.set(EXAMPLES_SEEDED_KEY, 'true');
  }

  async list(filter: MeasurementFilter = {}): Promise<Measurement[]> {
    this.initialize();
    const query = filter.search?.trim().toLocaleLowerCase();

    return getRecords().filter(record => {
      if (filter.service && record.service !== filter.service) return false;
      if (filter.propertyId && record.propertyId !== filter.propertyId) return false;
      if (filter.unitId && record.unitId !== filter.unitId) return false;
      if (filter.tenantId && record.tenantId !== filter.tenantId) return false;
      if (filter.billingYear && record.billingYear !== filter.billingYear) return false;
      if (filter.billingMonth && record.billingMonth !== filter.billingMonth) return false;
      if (filter.syncState && record.syncState !== filter.syncState) return false;
      if (query) {
        const haystack = [
          record.service,
          record.tenantId,
          record.unitId,
          record.consumedUnits,
        ].join(' ').toLocaleLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  async register(input: RegisterMeasurementInput): Promise<ConsumptionMeasurement> {
    this.initialize();
    if (!input.propertyId || !input.unitId || !input.tenantId) {
      throw new Error('La vivienda, unidad y persona son obligatorias.');
    }
    if (input.billingYear < 2000 || input.billingMonth < 1 || input.billingMonth > 12) {
      throw new Error('El período de consumo no es válido.');
    }
    const previousReading = input.previousReading.trim().replace(',', '.');
    const currentReading = input.currentReading.trim().replace(',', '.');
    if (!isValidAmount(previousReading)) {
      throw new Error('La lectura anterior no es válida.');
    }
    if (!isValidAmount(currentReading)) {
      throw new Error('La lectura actual no es válida.');
    }
    const consumedUnits = calculateConsumedUnits(previousReading, currentReading);

    const measurement: ConsumptionMeasurement = {
      ...input,
      previousReading,
      currentReading,
      consumedUnits,
      id: makeLocalId(),
      createdAt: new Date().toISOString(),
      syncState: 'pending',
      source: 'manual',
    };
    const records = getRecords();
    const existingIndex = records.findIndex(record =>
      record.propertyId === measurement.propertyId &&
      record.unitId === measurement.unitId &&
      record.tenantId === measurement.tenantId &&
      record.service === measurement.service &&
      record.billingYear === measurement.billingYear &&
      record.billingMonth === measurement.billingMonth,
    );
    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      const updated = { ...existing, ...measurement, id: existing.id, remoteId: undefined };
      saveRecords(records.map((record, index) => index === existingIndex ? updated : record));
      return updated;
    }
    saveRecords([measurement, ...records]);
    return measurement;
  }

  async markSynced(id: string, remoteId: string): Promise<void> {
    const records = getRecords();
    const updated = records.map(record => {
      if (record.id !== id) return record;
      return { ...record, remoteId, syncState: 'synced' as const };
    });
    saveRecords(updated);
  }
}

export const localMeasurementRepository: MeasurementRepository =
  new LocalMeasurementRepository();

export function getMeasurementsByService(service: UtilityService) {
  return localMeasurementRepository.list({ service });
}
