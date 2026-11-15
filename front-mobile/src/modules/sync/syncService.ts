import { apiRoutes } from '../../config/apiRoutes';
import { apiClient, isNetworkError } from '../../shared/api/apiClient';
import type {
  OwnerDTO,
  PropertyDTO,
  TenantDTO,
  UnitDTO,
} from '../../shared/api/types';
import { readJson, writeJson } from '../../shared/storage/mmkv';
import { syncPendingMeasurements, type SyncResult } from '../consumptions/api/syncQueue';
import type { LocalProperty } from '../properties/models/localProperty';
import type { LocalTenant } from '../tenants/models/localTenant';

const ACTIVE_OWNER_KEY = 'auth.active_owner.v1';
const PROPERTIES_STORAGE_KEY = 'properties.local.v1';
const TENANTS_STORAGE_KEY = 'tenants.local.v1';

export interface FullSyncResult {
  isOffline: boolean;
  propertiesSynced: boolean;
  measurementsResult: SyncResult;
  message: string;
}

/**
 * Obtiene o inicializa el propietario activo en el backend.
 */
export async function getOrInitRemoteOwner(ownerName: string = 'Coral'): Promise<OwnerDTO> {
  const cached = readJson<OwnerDTO | null>(ACTIVE_OWNER_KEY, null);
  if (cached) {
    try {
      const remote = await apiClient.get<OwnerDTO>(apiRoutes.owners.getById(cached.id), { timeoutMs: 3000 });
      writeJson(ACTIVE_OWNER_KEY, remote);
      return remote;
    } catch {
      return cached; // Si está offline, usar el almacenado localmente
    }
  }

  // Registrar el propietario en el backend
  const created = await apiClient.post<OwnerDTO>(apiRoutes.owners.create(), {
    name: ownerName,
    email: `${ownerName.toLowerCase()}@mirecibo.app`,
    phone: '+54911000000',
  });

  writeJson(ACTIVE_OWNER_KEY, created);
  return created;
}

/**
 * Sincroniza propiedades, unidades e inquilinos desde el backend hacia MMKV.
 * Si el backend está vacío, crea la estructura inicial de Casa Palermo.
 * Si está offline, preserva los datos existentes de MMKV.
 */
export async function syncPropertiesAndTenants(ownerName: string = 'Coral'): Promise<boolean> {
  try {
    const owner = await getOrInitRemoteOwner(ownerName);
    const propertiesUrl = apiRoutes.owners.listProperties(owner.id);
    let remoteProperties = await apiClient.get<PropertyDTO[]>(propertiesUrl);

    // Si no hay propiedades en el backend para este dueño, inicializamos Casa Palermo
    if (!remoteProperties || remoteProperties.length === 0) {
      const createdProp = await apiClient.post<PropertyDTO>(propertiesUrl, {
        name: 'Casa Palermo',
        address: 'Av. Santa Fe 2450',
      });

      const u1 = await apiClient.post<UnitDTO>(apiRoutes.properties.createUnit(createdProp.id), {
        name: 'Piso 1 · Depto A',
      });
      const u2 = await apiClient.post<UnitDTO>(apiRoutes.properties.createUnit(createdProp.id), {
        name: 'Piso 2 · Depto B',
      });

      await apiClient.post<TenantDTO>(apiRoutes.properties.createTenant(createdProp.id), {
        name: 'Inquilino 1',
        email: 'inquilino1@ejemplo.com',
        phone: '+54911111111',
        room_or_unit: 'Piso 1 · Depto A',
        unit_id: u1.id,
      });

      await apiClient.post<TenantDTO>(apiRoutes.properties.createTenant(createdProp.id), {
        name: 'Inquilino 2',
        email: 'inquilino2@ejemplo.com',
        phone: '+54911222222',
        room_or_unit: 'Piso 2 · Depto B',
        unit_id: u2.id,
      });

      remoteProperties = [createdProp];
    }

    // Para cada propiedad, obtenemos sus unidades e inquilinos
    const localProps: LocalProperty[] = [];
    const allLocalTenants: LocalTenant[] = [];

    for (const prop of remoteProperties) {
      const units = await apiClient.get<UnitDTO[]>(apiRoutes.properties.listUnits(prop.id));
      const tenants = await apiClient.get<TenantDTO[]>(apiRoutes.properties.listTenants(prop.id));

      localProps.push({
        id: prop.id,
        ownerName: owner.name,
        name: prop.name,
        address: prop.address,
        units: units.map(u => ({ id: u.id, name: u.name })),
      });

      for (const t of tenants) {
        const unit = units.find(u => u.id === t.unit_id);
        allLocalTenants.push({
          id: t.id,
          propertyId: prop.id,
          unitId: t.unit_id ?? '',
          unitName: unit?.name ?? t.room_or_unit,
          displayName: t.name,
          isActive: t.is_active,
        });
      }
    }

    // Persistimos en MMKV como fuente de datos rápida y offline
    writeJson(PROPERTIES_STORAGE_KEY, localProps);
    writeJson(TENANTS_STORAGE_KEY, allLocalTenants);
    return true;
  } catch (error) {
    if (isNetworkError(error)) {
      return false; // Modo offline: se preserva la caché de MMKV intacta
    }
    return false;
  }
}

/**
 * Orquestador de sincronización completa: entidades + lecturas pendientes.
 */
export async function executeFullSync(ownerName: string = 'Coral'): Promise<FullSyncResult> {
  const propertiesSynced = await syncPropertiesAndTenants(ownerName);
  const measurementsResult = await syncPendingMeasurements();

  const isOffline = !propertiesSynced || measurementsResult.isOffline;
  let message = 'Sincronización completada exitosamente.';
  if (isOffline) {
    message = 'Modo sin conexión: operando con datos locales.';
  } else if (measurementsResult.synced > 0) {
    message = `Se sincronizaron ${measurementsResult.synced} lecturas con el servidor.`;
  }

  return {
    isOffline,
    propertiesSynced,
    measurementsResult,
    message,
  };
}
