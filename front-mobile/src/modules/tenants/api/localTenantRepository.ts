import { readJson, writeJson } from '../../../shared/storage/mmkv';
import type { LocalTenant } from '../models/localTenant';

const STORAGE_KEY = 'tenants.local.v1';

const initialTenants: LocalTenant[] = [
  { id: 'local-tenant-1', displayName: 'Inquilino 1', propertyId: 'local-property-1', unitId: 'local-unit-1', unitName: 'Piso 1 · Depto A', isActive: true },
  { id: 'local-tenant-2', displayName: 'Inquilino 2', propertyId: 'local-property-1', unitId: 'local-unit-2', unitName: 'Piso 2 · Depto B', isActive: true },
];

function readTenants(): LocalTenant[] {
  return readJson<LocalTenant[]>(STORAGE_KEY, []);
}

export class LocalTenantRepository {
  initialize(): void {
    if (readTenants().length === 0) writeJson(STORAGE_KEY, initialTenants);
  }

  async listActive(): Promise<LocalTenant[]> {
    this.initialize();
    return readTenants().filter(tenant => tenant.isActive);
  }
}

export const localTenantRepository = new LocalTenantRepository();
