import { readJson, writeJson } from '../../../shared/storage/mmkv';
import type { LocalProperty } from '../models/localProperty';

const STORAGE_KEY = 'properties.local.v1';

const initialProperties: LocalProperty[] = [
  {
    id: 'local-property-1',
    ownerName: 'Coral',
    name: 'Casa Palermo',
    address: 'Av. Santa Fe 2450',
    units: [
      { id: 'local-unit-1', name: 'Piso 1 · Depto A' },
      { id: 'local-unit-2', name: 'Piso 2 · Depto B' },
    ],
  },
];

function readProperties(): LocalProperty[] {
  return readJson<LocalProperty[]>(STORAGE_KEY, []);
}

export class LocalPropertyRepository {
  initialize(): void {
    if (readProperties().length === 0) writeJson(STORAGE_KEY, initialProperties);
  }

  async list(): Promise<LocalProperty[]> {
    this.initialize();
    return readProperties();
  }

  async getById(id: string): Promise<LocalProperty | undefined> {
    this.initialize();
    return readProperties().find(property => property.id === id);
  }
}

export const localPropertyRepository = new LocalPropertyRepository();
