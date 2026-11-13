import type { RegisterMeasurementInput } from '../models/measurement';
import type { MeasurementRepository } from './measurementRepository';

export function registerMeasurement(
  repository: MeasurementRepository,
  input: RegisterMeasurementInput,
) {
  return repository.register(input);
}
