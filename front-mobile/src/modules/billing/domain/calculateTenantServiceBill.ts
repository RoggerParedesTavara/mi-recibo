import type {
  AdditionalTenantCharge,
  ServiceBillingConfig,
  TenantServiceCalculation,
} from '../models/serviceBillingConfig';

function parseDecimal(value: string): number {
  const parsed = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new Error('El importe no es válido.');
  return parsed;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function calculateTenantServiceBill(
  config: ServiceBillingConfig,
  consumedUnits: string,
  tenantIndex: number,
  additionalCharges: AdditionalTenantCharge[] = [],
): TenantServiceCalculation {
  const tenantCount = config.activeTenantCount;
  if (tenantCount < 1 || tenantIndex < 0 || tenantIndex >= tenantCount) {
    throw new Error('El inquilino indicado no pertenece a esta liquidación.');
  }
  const units = parseDecimal(consumedUnits);
  if (units < 0) throw new Error('El consumo no puede ser negativo.');

  const consumptionExact = units * parseDecimal(config.unitPrice);
  const rate = parseDecimal(config.taxRate);
  const preTaxConsumption = config.unitPriceIncludesTax
    ? consumptionExact / (1 + rate)
    : consumptionExact;
  const includedConsumptionTax = config.unitPriceIncludesTax
    ? consumptionExact - preTaxConsumption
    : 0;
  let taxableExtrasExact = 0;
  let nonTaxableExtrasExact = 0;
  const chargeBreakdown = config.extraCharges.map(charge => {
    const share = parseDecimal(charge.totalAmount) / tenantCount;
    if (charge.taxable) taxableExtrasExact += share;
    else nonTaxableExtrasExact += share;
    return { description: charge.description, amount: money(toCents(share)), taxable: charge.taxable };
  });

  for (const charge of additionalCharges) {
    const amount = parseDecimal(charge.amount);
    if (charge.taxable) taxableExtrasExact += amount;
    else nonTaxableExtrasExact += amount;
    chargeBreakdown.push({
      description: charge.description,
      amount: money(toCents(amount)),
      taxable: charge.taxable,
    });
  }

  const taxableBaseCents = toCents(preTaxConsumption + taxableExtrasExact);
  const taxOnExtrasCents = toCents(taxableExtrasExact * rate);
  const taxCents = config.unitPriceIncludesTax
    ? toCents(includedConsumptionTax) + taxOnExtrasCents
    : toCents((taxableBaseCents / 100) * rate);
  const nonTaxableCents = toCents(nonTaxableExtrasExact);
  const totalCents = config.unitPriceIncludesTax
    ? toCents(consumptionExact) + toCents(taxableExtrasExact) + nonTaxableCents + taxOnExtrasCents
    : taxableBaseCents + taxCents + nonTaxableCents;

  return {
    service: config.service,
    consumedUnits: units.toString(),
    consumptionAmount: money(toCents(consumptionExact)),
    taxableExtraCharges: money(toCents(taxableExtrasExact)),
    taxableBase: money(taxableBaseCents),
    taxName: config.taxName,
    taxRate: config.taxRate,
    taxAmount: money(taxCents),
    nonTaxableExtraCharges: money(toCents(nonTaxableExtrasExact)),
    totalAmount: money(totalCents),
    chargeBreakdown,
  };
}
