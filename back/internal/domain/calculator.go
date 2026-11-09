package domain

import (
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// CalculationResult holds the calculated bills and itemized charge breakdowns for all active tenants
type CalculationResult struct {
	TenantBills []TenantBill
}

type ExtraChargeAllocation struct {
	ExtraChargeID  uuid.UUID       `json:"extra_charge_id"`
	TenantID       uuid.UUID       `json:"tenant_id"`
	AmountToCharge decimal.Decimal `json:"amount_to_charge"`
}

// CalculateBills executes the pure calculation logic:
// 1. Validates that N (number of active tenants) > 0.
// 2. Multiplies each tenant's consumed units strictly by the unit price.
// 3. For each extra charge in the master bill's dynamic list, calculates tenant_share = amount / N.
// 4. Sums consumption amount + total extra charges share for each tenant.
func CalculateBills(
	masterBill *MasterBill,
	activeTenants []Tenant,
	consumptions []TenantConsumption,
) (*CalculationResult, error) {
	return CalculateBillsWithAllocations(masterBill, activeTenants, consumptions, nil)
}

// CalculateBillsWithAllocations calculates each tenant's consumption cost and extra-charge allocation.
// Unspecified charges are split equally; explicitly supplied tenant amounts are preserved exactly.
func CalculateBillsWithAllocations(
	masterBill *MasterBill,
	activeTenants []Tenant,
	consumptions []TenantConsumption,
	allocations []ExtraChargeAllocation,
) (*CalculationResult, error) {
	n := len(activeTenants)
	if n == 0 {
		return nil, ErrNoActiveTenants
	}
	// Stable ordering makes leftover cents repeatable, even when names match.
	activeTenants = append([]Tenant(nil), activeTenants...)
	sort.Slice(activeTenants, func(i, j int) bool {
		if activeTenants[i].Name != activeTenants[j].Name {
			return activeTenants[i].Name < activeTenants[j].Name
		}
		return activeTenants[i].ID.String() < activeTenants[j].ID.String()
	})

	// Map consumptions by tenant ID
	consumptionMap := make(map[uuid.UUID]TenantConsumption, len(consumptions))
	for _, c := range consumptions {
		consumptionMap[c.TenantID] = c
	}
	activeTenantIDs := make(map[uuid.UUID]struct{}, len(activeTenants))
	for _, tenant := range activeTenants {
		activeTenantIDs[tenant.ID] = struct{}{}
	}

	// Verify every active tenant has a consumption record
	for _, tenant := range activeTenants {
		if _, ok := consumptionMap[tenant.ID]; !ok {
			return nil, fmt.Errorf("%w: inquilino '%s' (ID: %s)", ErrMissingConsumptions, tenant.Name, tenant.ID)
		}
	}

	allocationMap := make(map[uuid.UUID]map[uuid.UUID]decimal.Decimal)
	chargesByID := make(map[uuid.UUID]MasterBillExtraCharge, len(masterBill.ExtraCharges))
	for _, charge := range masterBill.ExtraCharges {
		chargesByID[charge.ID] = charge
	}
	for _, allocation := range allocations {
		_, ok := chargesByID[allocation.ExtraChargeID]
		if !ok || allocation.AmountToCharge.IsNegative() {
			return nil, ErrValidation
		}
		if _, ok := activeTenantIDs[allocation.TenantID]; !ok {
			return nil, ErrValidation
		}
		if allocationMap[allocation.ExtraChargeID] == nil {
			allocationMap[allocation.ExtraChargeID] = make(map[uuid.UUID]decimal.Decimal)
		}
		if _, exists := allocationMap[allocation.ExtraChargeID][allocation.TenantID]; exists {
			return nil, ErrValidation
		}
		allocationMap[allocation.ExtraChargeID][allocation.TenantID] = allocation.AmountToCharge.Round(2)
	}
	for chargeID, tenantAllocations := range allocationMap {
		charge := chargesByID[chargeID]
		if len(tenantAllocations) != n {
			return nil, fmt.Errorf("%w: debe indicar un monto para cada inquilino del cargo '%s'", ErrValidation, charge.Description)
		}
		allocated := decimal.Zero
		for _, amount := range tenantAllocations {
			allocated = allocated.Add(amount)
		}
		if allocated.GreaterThan(charge.Amount.Round(2)) {
			return nil, fmt.Errorf("%w: el total asignado al cargo '%s' supera su monto real", ErrValidation, charge.Description)
		}
	}
	bills := make([]TenantBill, 0, n)
	defaultShares := make(map[string]decimal.Decimal)
	for _, extra := range masterBill.ExtraCharges {
		cents := extra.Amount.Round(2).Mul(decimal.NewFromInt(100)).IntPart()
		baseCents, remainder := cents/int64(n), cents%int64(n)
		for index, tenant := range activeTenants {
			shareCents := baseCents
			if int64(index) < remainder {
				shareCents++
			}
			defaultShares[extra.ID.String()+tenant.ID.String()] = decimal.NewFromInt(shareCents).Div(decimal.NewFromInt(100))
		}
	}

	for _, tenant := range activeTenants {
		c := consumptionMap[tenant.ID]
		consumedUnits := c.ConsumedUnits

		// Variable consumption cost: units * unit_price
		consumptionCost := consumedUnits.Mul(masterBill.UnitPrice).Round(2)

		// Calculate share for each extra charge in the dynamic list
		breakdowns := make([]TenantBillChargeBreakdown, 0, len(masterBill.ExtraCharges))
		extraChargesTotalShare := decimal.Zero

		for _, extra := range masterBill.ExtraCharges {
			// Default to an equal split; explicit allocations override the amount per tenant.
			share := defaultShares[extra.ID.String()+tenant.ID.String()]
			if byTenant := allocationMap[extra.ID]; byTenant != nil {
				if custom, ok := byTenant[tenant.ID]; ok {
					share = custom
				}
			}
			extraChargesTotalShare = extraChargesTotalShare.Add(share)

			extraID := extra.ID
			breakdowns = append(breakdowns, TenantBillChargeBreakdown{
				ID:             uuid.New(),
				ExtraChargeID:  &extraID,
				Description:    extra.Description,
				OriginalAmount: extra.Amount,
				TenantsCount:   n,
				TenantShare:    share,
				AmountToCharge: share,
			})
		}

		totalBillAmount := consumptionCost.Add(extraChargesTotalShare)

		bills = append(bills, TenantBill{
			ID:                     uuid.New(),
			MasterBillID:           masterBill.ID,
			TenantID:               tenant.ID,
			ConsumedUnits:          consumedUnits,
			UnitPrice:              masterBill.UnitPrice,
			ConsumptionAmount:      consumptionCost,
			ExtraChargesTotalShare: extraChargesTotalShare,
			TotalAmount:            totalBillAmount,
			Status:                 TenantBillPending,
			Breakdowns:             breakdowns,
		})
	}

	return &CalculationResult{
		TenantBills: bills,
	}, nil
}

// CalculateConsumptionVariation compares the current consumption with the previous month's
// and sets alert flags if it exceeds the specified spike threshold percentage (e.g. 20%).
func CalculateConsumptionVariation(
	currentUnits decimal.Decimal,
	previousMonthUnits *decimal.Decimal,
	spikeThresholdPercent float64,
) (variation *decimal.Decimal, alertSpike bool, alertMessage string) {
	if previousMonthUnits == nil || previousMonthUnits.IsZero() {
		return nil, false, ""
	}

	prev := *previousMonthUnits
	// variation% = ((current - prev) / prev) * 100
	diff := currentUnits.Sub(prev)
	pct := diff.Div(prev).Mul(decimal.NewFromInt(100)).Round(2)
	variation = &pct

	threshold := decimal.NewFromFloat(spikeThresholdPercent)
	if pct.GreaterThan(threshold) {
		alertSpike = true
		alertMessage = fmt.Sprintf(
			"El consumo aumentó un %s%% respecto al mes anterior (de %s a %s unidades).",
			pct.StringFixed(2),
			prev.StringFixed(2),
			currentUnits.StringFixed(2),
		)
	}

	return variation, alertSpike, alertMessage
}
