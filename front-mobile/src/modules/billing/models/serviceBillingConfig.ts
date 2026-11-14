import type { UtilityService } from '../../consumptions/models/measurement';

export interface ExtraChargeConfig {
  id: string;
  description: string;
  totalAmount: string;
  taxable: boolean;
}

export interface ServiceBillingConfig {
  service: UtilityService;
  unit: 'kWh' | 'm³';
  unitPrice: string;
  currencyCode: string;
  taxName: 'IGV';
  taxRate: string;
  unitPriceIncludesTax: boolean;
  activeTenantCount: number;
  extraCharges: ExtraChargeConfig[];
  source: { sheet: 'Enel' | 'Sedapal'; unitPriceCell: string; taxRateCell: string };
}

export interface TenantServiceCalculation {
  service: UtilityService;
  consumedUnits: string;
  consumptionAmount: string;
  taxableExtraCharges: string;
  taxableBase: string;
  taxName: 'IGV';
  taxRate: string;
  taxAmount: string;
  nonTaxableExtraCharges: string;
  totalAmount: string;
  chargeBreakdown: Array<{ description: string; amount: string; taxable: boolean }>;
}

export interface AdditionalTenantCharge {
  description: string;
  amount: string;
  taxable: boolean;
}
