import { requireApiBaseUrl } from './env';

/**
 * Catálogo centralizado de endpoints de la API Backend (Go REST).
 * Esta es la FUENTE ÚNICA DE LA VERDAD para todas las rutas y llamadas HTTP.
 * Ningún componente o servicio debe construir URLs manualmente.
 */
export const apiRoutes = {
  auth: {
    register: (): string => `${requireApiBaseUrl()}/auth/register`,
    login: (): string => `${requireApiBaseUrl()}/auth/login`,
    refresh: (): string => `${requireApiBaseUrl()}/auth/refresh`,
    logout: (): string => `${requireApiBaseUrl()}/auth/logout`,
    me: (): string => `${requireApiBaseUrl()}/auth/me`,
  },

  health: (): string => {
    const base = requireApiBaseUrl().replace(/\/api\/v1\/?$/, '');
    return `${base}/health`;
  },

  owners: {
    create: (): string => `${requireApiBaseUrl()}/owners`,
    getById: (id: string): string =>
      `${requireApiBaseUrl()}/owners/${encodeURIComponent(id)}`,
    listProperties: (ownerId: string): string =>
      `${requireApiBaseUrl()}/owners/${encodeURIComponent(ownerId)}/properties`,
    createProperty: (ownerId: string): string =>
      `${requireApiBaseUrl()}/owners/${encodeURIComponent(ownerId)}/properties`,
  },

  properties: {
    getById: (id: string): string =>
      `${requireApiBaseUrl()}/properties/${encodeURIComponent(id)}`,
    listUnits: (propertyId: string): string =>
      `${requireApiBaseUrl()}/properties/${encodeURIComponent(
        propertyId,
      )}/units`,
    createUnit: (propertyId: string): string =>
      `${requireApiBaseUrl()}/properties/${encodeURIComponent(
        propertyId,
      )}/units`,
    listTenants: (propertyId: string): string =>
      `${requireApiBaseUrl()}/properties/${encodeURIComponent(
        propertyId,
      )}/tenants`,
    createTenant: (propertyId: string): string =>
      `${requireApiBaseUrl()}/properties/${encodeURIComponent(
        propertyId,
      )}/tenants`,
    listMasterBills: (
      propertyId: string,
      query?: { year?: number; month?: number; service?: string },
    ): string => {
      const url = new URL(
        `${requireApiBaseUrl()}/properties/${encodeURIComponent(
          propertyId,
        )}/master-bills`,
      );
      if (query?.year) url.searchParams.set('year', query.year.toString());
      if (query?.month) url.searchParams.set('month', query.month.toString());
      if (query?.service) url.searchParams.set('service', query.service);
      return url.toString();
    },
    createMasterBill: (propertyId: string): string =>
      `${requireApiBaseUrl()}/properties/${encodeURIComponent(
        propertyId,
      )}/master-bills`,
  },

  units: {
    update: (id: string): string =>
      `${requireApiBaseUrl()}/units/${encodeURIComponent(id)}`,
  },

  tenants: {
    update: (id: string): string =>
      `${requireApiBaseUrl()}/tenants/${encodeURIComponent(id)}`,
    listBills: (id: string): string =>
      `${requireApiBaseUrl()}/tenants/${encodeURIComponent(id)}/bills`,
    latestReading: (id: string, service: string): string => {
      const url = new URL(
        `${requireApiBaseUrl()}/tenants/${encodeURIComponent(id)}/readings/latest`,
      );
      url.searchParams.set('service', service);
      return url.toString();
    },
  },

  masterBills: {
    getById: (id: string): string =>
      `${requireApiBaseUrl()}/master-bills/${encodeURIComponent(id)}`,
    update: (id: string): string =>
      `${requireApiBaseUrl()}/master-bills/${encodeURIComponent(id)}`,
    recordConsumptions: (id: string): string =>
      `${requireApiBaseUrl()}/master-bills/${encodeURIComponent(
        id,
      )}/consumptions`,
    preview: (id: string): string =>
      `${requireApiBaseUrl()}/master-bills/${encodeURIComponent(id)}/preview`,
    calculate: (id: string): string =>
      `${requireApiBaseUrl()}/master-bills/${encodeURIComponent(id)}/calculate`,
    listTenantBills: (id: string): string =>
      `${requireApiBaseUrl()}/master-bills/${encodeURIComponent(
        id,
      )}/tenant-bills`,
  },

  tenantBills: {
    getById: (id: string): string =>
      `${requireApiBaseUrl()}/tenant-bills/${encodeURIComponent(id)}`,
    updatePayment: (id: string): string =>
      `${requireApiBaseUrl()}/tenant-bills/${encodeURIComponent(id)}/payment`,
  },
};
