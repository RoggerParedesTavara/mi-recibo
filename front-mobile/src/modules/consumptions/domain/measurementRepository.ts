import type {
  Measurement,
  MeasurementFilter,
  RegisterMeasurementInput,
} from '../models/measurement';

export interface MeasurementRepository {
  initialize(): void;
  list(filter?: MeasurementFilter): Promise<Measurement[]>;
  register(input: RegisterMeasurementInput): Promise<Measurement>;
  markSynced(id: string, remoteId: string): Promise<void>;
}
