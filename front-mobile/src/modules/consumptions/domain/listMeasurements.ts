import type { MeasurementFilter } from '../models/measurement';
import type { MeasurementRepository } from './measurementRepository';

export function listMeasurements(
  repository: MeasurementRepository,
  filter?: MeasurementFilter,
) {
  return repository.list(filter);
}
