export type UtilityService = 'LUZ' | 'AGUA';
export type MeasurementSyncState = 'pending' | 'synced' | 'example';

export interface ConsumptionMeasurement {
  id: string;
  service: UtilityService;
  propertyId: string;
  unitId: string;
  tenantId: string;
  billingYear: number;
  billingMonth: number;
  previousReading?: string;
  currentReading?: string;
  consumedUnits: string;
  createdAt: string;
  syncState: MeasurementSyncState;
  source: 'manual' | 'example';
  remoteId?: string;
}

export type Measurement = ConsumptionMeasurement;

export interface MeasurementFilter {
  service?: UtilityService;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  billingYear?: number;
  billingMonth?: number;
  syncState?: MeasurementSyncState;
  search?: string;
}

export interface RegisterMeasurementInput {
  service: UtilityService;
  propertyId: string;
  unitId: string;
  tenantId: string;
  billingYear: number;
  billingMonth: number;
  previousReading: string;
  currentReading: string;
}
