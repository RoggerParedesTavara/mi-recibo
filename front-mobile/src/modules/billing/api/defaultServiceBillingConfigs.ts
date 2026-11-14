import type { ServiceBillingConfig } from '../models/serviceBillingConfig';

// Exact source cell values are retained, including the full unit-rate precision.
// Extras are stored at the property level and split equally among active tenants.
export const defaultServiceBillingConfigs: ServiceBillingConfig[] = [
  {
    service: 'LUZ',
    unit: 'kWh',
    unitPrice: '0.6192',
    currencyCode: 'PEN',
    taxName: 'IGV',
    taxRate: '0.18',
    unitPriceIncludesTax: false,
    activeTenantCount: 2,
    extraCharges: [
      { id: 'light-public-lighting', description: 'Alumbrado Público', totalAmount: '17.50', taxable: true },
      { id: 'light-compensatory-interest', description: 'Interés Compensatorio', totalAmount: '0.36', taxable: true },
      { id: 'light-fixed-charge', description: 'Cargo Fijo', totalAmount: '2.37', taxable: true },
      { id: 'light-law-contribution', description: 'Aporte Ley', totalAmount: '3.74', taxable: false },
    ],
    source: { sheet: 'Enel', unitPriceCell: 'E2', taxRateCell: 'H2' },
  },
  {
    service: 'AGUA',
    unit: 'm³',
    unitPrice: '2.01571428571428',
    currencyCode: 'PEN',
    taxName: 'IGV',
    taxRate: '0.18',
    unitPriceIncludesTax: false,
    activeTenantCount: 2,
    extraCharges: [
      { id: 'water-fixed-charge', description: 'Cargo Fijo', totalAmount: '6.26', taxable: true },
      { id: 'water-sewer-service', description: 'Servicio de Alcantarillado', totalAmount: '10.06', taxable: true },
      { id: 'water-previous-rounding', description: 'Redondeo Anterior', totalAmount: '0.08', taxable: false },
    ],
    source: { sheet: 'Sedapal', unitPriceCell: 'E3', taxRateCell: 'H3' },
  },
];
