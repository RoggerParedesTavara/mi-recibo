import { apiRoutes } from '../../../config/apiRoutes';
import { apiClient, isNetworkError } from '../../../shared/api/apiClient';
import type { MasterBillDTO, RecordConsumptionsResponseDTO } from '../../../shared/api/types';
import { localMeasurementRepository } from './localMeasurementRepository';
import type { UtilityService } from '../models/measurement';

export interface SyncResult {
  synced: number;
  failed: number;
  isOffline: boolean;
  errors: string[];
}

export async function getPendingSyncCount(): Promise<number> {
  const pending = await localMeasurementRepository.list({ syncState: 'pending' });
  return pending.length;
}

/**
 * Busca o crea un Master Bill en el backend para un servicio y período dado.
 */
async function ensureMasterBill(
  propertyId: string,
  service: UtilityService,
  year: number,
  month: number,
): Promise<string> {
  const listUrl = apiRoutes.properties.listMasterBills(propertyId, {
    year,
    month,
    service,
  });

  const existingBills = await apiClient.get<MasterBillDTO[]>(listUrl);
  if (existingBills && existingBills.length > 0) {
    return existingBills[0].id;
  }

  // Si no existe, creamos un borrador básico con precio base de referencia
  const defaultUnitPrice = service === 'LUZ' ? 0.6192 : 2.0157;
  const createUrl = apiRoutes.properties.createMasterBill(propertyId);
  const newBill = await apiClient.post<MasterBillDTO>(createUrl, {
    service_type: service,
    billing_year: year,
    billing_month: month,
    total_consumption: 0,
    unit_price: defaultUnitPrice,
    extra_charges: [],
  });

  return newBill.id;
}

/**
 * Cola de sincronización Offline-First (Outbox Pattern).
 * Procesa todas las lecturas guardadas localmente en MMKV con estado 'pending'
 * y las envía al backend en Go.
 */
export async function syncPendingMeasurements(): Promise<SyncResult> {
  const pendingList = await localMeasurementRepository.list({ syncState: 'pending' });
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    isOffline: false,
    errors: [],
  };

  if (pendingList.length === 0) {
    return result;
  }

  // Verificamos conectividad rápida con health check
  try {
    await apiClient.get(apiRoutes.health(), { timeoutMs: 3000 });
  } catch {
    result.isOffline = true;
    result.failed = pendingList.length;
    result.errors.push('El servidor backend no está disponible o el dispositivo no tiene conexión.');
    return result;
  }

  for (const measurement of pendingList) {
    try {
      // Si la propiedad o inquilino son IDs locales no mapeados aún a UUIDs del backend,
      // omitimos el envío directo al master bill hasta que exista el mapeo correspondiente
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!isUuid.test(measurement.propertyId) || !isUuid.test(measurement.tenantId)) {
        // Marcado como pendiente para resolución tras sincronización de entidades
        continue;
      }

      const masterBillId = await ensureMasterBill(
        measurement.propertyId,
        measurement.service,
        measurement.billingYear,
        measurement.billingMonth,
      );

      const recordUrl = apiRoutes.masterBills.recordConsumptions(masterBillId);
      const response = await apiClient.post<RecordConsumptionsResponseDTO>(recordUrl, {
        readings: [
          {
            tenant_id: measurement.tenantId,
            consumed_units: measurement.consumedUnits,
            previous_reading: measurement.previousReading,
            current_reading: measurement.currentReading,
          },
        ],
      });

      const matchedRemote = response.consumptions?.find(c => c.tenant_id === measurement.tenantId);
      const remoteId = matchedRemote ? matchedRemote.id : `synced-${Date.now()}`;

      await localMeasurementRepository.markSynced(measurement.id, remoteId);
      result.synced += 1;
    } catch (error) {
      result.failed += 1;
      if (isNetworkError(error)) {
        result.isOffline = true;
        result.errors.push(`Error de conexión al sincronizar lectura ${measurement.id}`);
        break; // Detenemos la cola si se perdió la red a mitad del proceso
      } else {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        result.errors.push(`Error en lectura ${measurement.id}: ${msg}`);
      }
    }
  }

  return result;
}
