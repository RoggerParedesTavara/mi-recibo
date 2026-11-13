import { readJson, writeJson } from '../../../shared/storage/mmkv';
import { defaultServiceBillingConfigs } from './defaultServiceBillingConfigs';
import type { ServiceBillingConfig } from '../models/serviceBillingConfig';
import type { UtilityService } from '../../consumptions/models/measurement';

const STORAGE_KEY = 'billing.service-configs.v1';

function getConfigs(): ServiceBillingConfig[] {
  return readJson<ServiceBillingConfig[]>(STORAGE_KEY, []);
}

export class LocalServiceBillingConfigRepository {
  initialize(): void {
    const stored = getConfigs();
    const configuredServices = new Set(stored.map(config => config.service));
    const missingDefaults = defaultServiceBillingConfigs.filter(
      config => !configuredServices.has(config.service),
    );
    if (missingDefaults.length) writeJson(STORAGE_KEY, [...stored, ...missingDefaults]);
  }

  async list(): Promise<ServiceBillingConfig[]> {
    this.initialize();
    return getConfigs();
  }

  async get(service: UtilityService): Promise<ServiceBillingConfig | undefined> {
    this.initialize();
    return getConfigs().find(config => config.service === service);
  }

  async save(config: ServiceBillingConfig): Promise<void> {
    if (!/^\d+(?:\.\d+)?$/.test(config.unitPrice) || Number(config.unitPrice) <= 0) {
      throw new Error('La tarifa por unidad debe ser mayor a cero.');
    }
    if (!/^\d+(?:\.\d+)?$/.test(config.taxRate) || Number(config.taxRate) < 0) {
      throw new Error('La tasa de IGV no es válida.');
    }
    if (config.activeTenantCount < 1) {
      throw new Error('Debe haber al menos un inquilino activo.');
    }
    const configs = getConfigs();
    writeJson(STORAGE_KEY, [...configs.filter(item => item.service !== config.service), config]);
  }
}

export const localServiceBillingConfigRepository = new LocalServiceBillingConfigRepository();
