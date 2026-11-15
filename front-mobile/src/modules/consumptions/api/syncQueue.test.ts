import { apiClient } from '../../../shared/api/apiClient';
import { localMeasurementRepository } from './localMeasurementRepository';
import { getPendingSyncCount, syncPendingMeasurements } from './syncQueue';

jest.mock('../../../shared/api/apiClient');
jest.mock('./localMeasurementRepository');

describe('syncQueue - Offline-First Outbox Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve cero si no hay mediciones pendientes', async () => {
    (localMeasurementRepository.list as jest.Mock).mockResolvedValue([]);
    const count = await getPendingSyncCount();
    expect(count).toBe(0);

    const result = await syncPendingMeasurements();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('reporta modo offline si el backend no responde al health check', async () => {
    (localMeasurementRepository.list as jest.Mock).mockResolvedValue([
      {
        id: 'local-1',
        service: 'LUZ',
        propertyId: '11111111-1111-1111-1111-111111111111',
        tenantId: '22222222-2222-2222-2222-222222222222',
        billingYear: 2026,
        billingMonth: 10,
        consumedUnits: '50',
        syncState: 'pending',
      },
    ]);

    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    const result = await syncPendingMeasurements();
    expect(result.isOffline).toBe(true);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(localMeasurementRepository.markSynced).not.toHaveBeenCalled();
  });

  it('sincroniza exitosamente mediciones pendientes cuando hay conexión', async () => {
    const validMeasurement = {
      id: 'local-m1',
      service: 'LUZ',
      propertyId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      billingYear: 2026,
      billingMonth: 10,
      consumedUnits: '80',
      syncState: 'pending',
    };

    (localMeasurementRepository.list as jest.Mock).mockResolvedValue([validMeasurement]);

    // Mock health check OK
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/health')) return Promise.resolve({ status: 'ok' });
      if (url.includes('/master-bills')) {
        return Promise.resolve([{ id: 'mb-uuid-123' }]);
      }
      return Promise.resolve({});
    });

    // Mock record consumptions OK
    (apiClient.post as jest.Mock).mockResolvedValue({
      consumptions: [{ id: 'remote-cons-456', tenant_id: validMeasurement.tenantId }],
    });

    const result = await syncPendingMeasurements();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(localMeasurementRepository.markSynced).toHaveBeenCalledWith('local-m1', 'remote-cons-456');
  });
});
