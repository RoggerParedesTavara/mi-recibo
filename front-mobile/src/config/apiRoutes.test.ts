import { apiRoutes } from './apiRoutes';

describe('apiRoutes - Catálogo de endpoints centralizado', () => {
  it('genera correctamente las URLs de health y owners', () => {
    expect(apiRoutes.health()).toContain('/health');
    expect(apiRoutes.owners.create()).toContain('/owners');
    expect(apiRoutes.owners.getById('123')).toContain('/owners/123');
    expect(apiRoutes.owners.listProperties('owner-abc')).toContain('/owners/owner-abc/properties');
  });

  it('genera correctamente las URLs de properties y subrecursos', () => {
    expect(apiRoutes.properties.getById('prop-1')).toContain('/properties/prop-1');
    expect(apiRoutes.properties.listUnits('prop-1')).toContain('/properties/prop-1/units');
    expect(apiRoutes.properties.listTenants('prop-1')).toContain('/properties/prop-1/tenants');
    expect(apiRoutes.properties.createMasterBill('prop-1')).toContain('/properties/prop-1/master-bills');

    const filteredUrl = apiRoutes.properties.listMasterBills('prop-1', {
      year: 2026,
      month: 10,
      service: 'LUZ',
    });
    expect(filteredUrl).toContain('/properties/prop-1/master-bills?year=2026&month=10&service=LUZ');
  });

  it('genera correctamente las URLs de masterBills y consumos', () => {
    expect(apiRoutes.masterBills.getById('mb-1')).toContain('/master-bills/mb-1');
    expect(apiRoutes.masterBills.recordConsumptions('mb-1')).toContain('/master-bills/mb-1/consumptions');
    expect(apiRoutes.masterBills.preview('mb-1')).toContain('/master-bills/mb-1/preview');
    expect(apiRoutes.masterBills.calculate('mb-1')).toContain('/master-bills/mb-1/calculate');
    expect(apiRoutes.masterBills.listTenantBills('mb-1')).toContain('/master-bills/mb-1/tenant-bills');
  });

  it('genera correctamente las URLs de tenantBills', () => {
    expect(apiRoutes.tenantBills.getById('tb-1')).toContain('/tenant-bills/tb-1');
    expect(apiRoutes.tenantBills.updatePayment('tb-1')).toContain('/tenant-bills/tb-1/payment');
  });

  it('genera la URL de última lectura del medidor con el servicio', () => {
    expect(apiRoutes.tenants.latestReading('tenant-1', 'LUZ')).toContain(
      '/tenants/tenant-1/readings/latest?service=LUZ',
    );
  });
});
