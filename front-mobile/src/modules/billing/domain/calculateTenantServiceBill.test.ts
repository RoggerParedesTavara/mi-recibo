import { defaultServiceBillingConfigs } from '../api/defaultServiceBillingConfigs';
import { calculateTenantServiceBill } from './calculateTenantServiceBill';

describe('calculateTenantServiceBill', () => {
  it('reproduces the Enel spreadsheet example for one tenant', () => {
    const lightConfig = defaultServiceBillingConfigs.find(config => config.service === 'LUZ');
    if (!lightConfig) throw new Error('Falta la configuración local de luz.');

    // Enel!row 5: 383.1 kWh; mora and rounding values from the same row.
    const result = calculateTenantServiceBill(lightConfig, '383.1', 0, [
      { description: 'Mora', amount: '0.01', taxable: false },
      { description: 'Redondeo Anterior', amount: '0.16', taxable: false },
      { description: 'Redondeo Mes Actual', amount: '-0.37', taxable: false },
    ]);

    expect(result.consumptionAmount).toBe('237.22');
    expect(result.taxableBase).toBe('247.33');
    expect(result.taxAmount).toBe('44.52');
    expect(result.totalAmount).toBe('293.52');
  });

  it('rejects a tenant index outside the two active tenants', () => {
    const waterConfig = defaultServiceBillingConfigs.find(config => config.service === 'AGUA');
    if (!waterConfig) throw new Error('Falta la configuración local de agua.');

    expect(() => calculateTenantServiceBill(waterConfig, '10', 2)).toThrow(
      'El inquilino indicado no pertenece a esta liquidación.',
    );
  });

  it('reproduces the Sedapal spreadsheet example for one tenant', () => {
    const waterConfig = defaultServiceBillingConfigs.find(config => config.service === 'AGUA');
    if (!waterConfig) throw new Error('Falta la configuración local de agua.');

    // Sedapal!row 6: 9.37 m³; the configured S/0.08 rounding charge is split in two.
    const result = calculateTenantServiceBill(waterConfig, '9.37', 0);

    expect(result.consumptionAmount).toBe('18.89');
    expect(result.taxableBase).toBe('27.05');
    expect(result.taxAmount).toBe('4.87');
    expect(result.totalAmount).toBe('31.96');
  });
});
