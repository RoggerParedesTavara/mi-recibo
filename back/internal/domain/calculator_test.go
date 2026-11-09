package domain_test

import (
	"testing"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

func TestCalculateBills_ThreeTenantsWithMultipleExtraCharges(t *testing.T) {
	masterBillID := uuid.New()
	tenant1ID := uuid.New()
	tenant2ID := uuid.New()
	tenant3ID := uuid.New()

	masterBill := &domain.MasterBill{
		ID:          masterBillID,
		ServiceType: domain.ServiceLuz,
		UnitPrice:   decimal.NewFromFloat(0.50),
		ExtraCharges: []domain.MasterBillExtraCharge{
			{
				ID:          uuid.New(),
				Description: "Mantenimiento de red",
				Amount:      decimal.NewFromFloat(300.00),
			},
			{
				ID:          uuid.New(),
				Description: "Alumbrado público",
				Amount:      decimal.NewFromFloat(45.00),
			},
			{
				ID:          uuid.New(),
				Description: "Cargo fijo",
				Amount:      decimal.NewFromFloat(12.00),
			},
		},
	}

	activeTenants := []domain.Tenant{
		{ID: tenant1ID, Name: "Juan", IsActive: true},
		{ID: tenant2ID, Name: "Pedro", IsActive: true},
		{ID: tenant3ID, Name: "Maria", IsActive: true},
	}

	consumptions := []domain.TenantConsumption{
		{MasterBillID: masterBillID, TenantID: tenant1ID, ConsumedUnits: decimal.NewFromFloat(80.0)},
		{MasterBillID: masterBillID, TenantID: tenant2ID, ConsumedUnits: decimal.NewFromFloat(120.0)},
		{MasterBillID: masterBillID, TenantID: tenant3ID, ConsumedUnits: decimal.NewFromFloat(100.0)},
	}

	result, err := domain.CalculateBills(masterBill, activeTenants, consumptions)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.TenantBills) != 3 {
		t.Fatalf("expected 3 tenant bills, got %d", len(result.TenantBills))
	}

	// Verify Tenant 1: (80 * 0.50) + (100 + 15 + 4) = 40 + 119 = 159.00
	var bill1 *domain.TenantBill
	for i := range result.TenantBills {
		if result.TenantBills[i].TenantID == tenant1ID {
			bill1 = &result.TenantBills[i]
			break
		}
	}
	if bill1 == nil {
		t.Fatal("bill for tenant 1 not found")
	}

	expectedConsumption1 := decimal.NewFromFloat(40.00)
	if !bill1.ConsumptionAmount.Equal(expectedConsumption1) {
		t.Errorf("expected consumption amount %s, got %s", expectedConsumption1, bill1.ConsumptionAmount)
	}

	expectedExtraShare := decimal.NewFromFloat(119.00)
	if !bill1.ExtraChargesTotalShare.Equal(expectedExtraShare) {
		t.Errorf("expected extra charges share %s, got %s", expectedExtraShare, bill1.ExtraChargesTotalShare)
	}

	expectedTotal1 := decimal.NewFromFloat(159.00)
	if !bill1.TotalAmount.Equal(expectedTotal1) {
		t.Errorf("expected total amount %s, got %s", expectedTotal1, bill1.TotalAmount)
	}

	// Check breakdowns
	if len(bill1.Breakdowns) != 3 {
		t.Fatalf("expected 3 breakdown items, got %d", len(bill1.Breakdowns))
	}
	if !bill1.Breakdowns[0].TenantShare.Equal(decimal.NewFromFloat(100.00)) {
		t.Errorf("expected 100.00 for mantenimiento de red, got %s", bill1.Breakdowns[0].TenantShare)
	}
	if !bill1.Breakdowns[1].TenantShare.Equal(decimal.NewFromFloat(15.00)) {
		t.Errorf("expected 15.00 for alumbrado, got %s", bill1.Breakdowns[1].TenantShare)
	}
	if !bill1.Breakdowns[2].TenantShare.Equal(decimal.NewFromFloat(4.00)) {
		t.Errorf("expected 4.00 for cargo fijo, got %s", bill1.Breakdowns[2].TenantShare)
	}
}

func TestCalculateBills_NoActiveTenants(t *testing.T) {
	masterBill := &domain.MasterBill{
		ID:        uuid.New(),
		UnitPrice: decimal.NewFromFloat(0.50),
	}

	_, err := domain.CalculateBills(masterBill, []domain.Tenant{}, nil)
	if err != domain.ErrNoActiveTenants {
		t.Fatalf("expected ErrNoActiveTenants, got %v", err)
	}
}

func TestCalculateConsumptionVariation(t *testing.T) {
	prev := decimal.NewFromFloat(60.0)
	current := decimal.NewFromFloat(80.0)

	variation, alertSpike, msg := domain.CalculateConsumptionVariation(current, &prev, 20.0)
	if variation == nil {
		t.Fatal("expected variation not to be nil")
	}

	// 80 - 60 = 20 / 60 = 33.33%
	expectedVar := decimal.NewFromFloat(33.33)
	if !variation.Equal(expectedVar) {
		t.Errorf("expected variation %s, got %s", expectedVar, variation)
	}

	if !alertSpike {
		t.Errorf("expected alertSpike to be true, got false")
	}
	if msg == "" {
		t.Errorf("expected alert message to be non-empty")
	}
}

func TestCalculateBillsCustomExtraAllocationAndCentRemainder(t *testing.T) {
	masterBillID := uuid.New()
	chargeID := uuid.New()
	tenants := []domain.Tenant{{ID: uuid.New(), Name: "Ana"}, {ID: uuid.New(), Name: "Bruno"}, {ID: uuid.New(), Name: "Carla"}}
	masterBill := &domain.MasterBill{ID: masterBillID, UnitPrice: decimal.NewFromInt(1), ProviderTotalAmount: decimalPtr("9999"), ExtraCharges: []domain.MasterBillExtraCharge{{ID: chargeID, Description: "Impuesto", Amount: decimal.NewFromInt(2)}}}
	consumptions := []domain.TenantConsumption{
		{MasterBillID: masterBillID, TenantID: tenants[0].ID, ConsumedUnits: decimal.NewFromInt(1)},
		{MasterBillID: masterBillID, TenantID: tenants[1].ID, ConsumedUnits: decimal.NewFromInt(2)},
		{MasterBillID: masterBillID, TenantID: tenants[2].ID, ConsumedUnits: decimal.NewFromInt(3)},
	}
	result, err := domain.CalculateBills(masterBill, tenants, consumptions)
	if err != nil {
		t.Fatal(err)
	}
	defaultTotal := decimal.Zero
	for _, bill := range result.TenantBills {
		defaultTotal = defaultTotal.Add(bill.Breakdowns[0].AmountToCharge)
	}
	if !defaultTotal.Equal(decimal.NewFromInt(2)) {
		t.Fatalf("default cent split should equal original amount, got %s", defaultTotal)
	}
	if !result.TenantBills[0].Breakdowns[0].AmountToCharge.Equal(decimal.NewFromFloat(0.67)) || !result.TenantBills[2].Breakdowns[0].AmountToCharge.Equal(decimal.NewFromFloat(0.66)) {
		t.Fatalf("unexpected deterministic remainder split: %+v", result.TenantBills)
	}

	allocations := []domain.ExtraChargeAllocation{
		{ExtraChargeID: chargeID, TenantID: tenants[0].ID, AmountToCharge: decimal.NewFromFloat(0.25)},
		{ExtraChargeID: chargeID, TenantID: tenants[1].ID, AmountToCharge: decimal.NewFromFloat(0.50)},
		{ExtraChargeID: chargeID, TenantID: tenants[2].ID, AmountToCharge: decimal.Zero},
	}
	custom, err := domain.CalculateBillsWithAllocations(masterBill, tenants, consumptions, allocations)
	if err != nil {
		t.Fatal(err)
	}
	if !custom.TenantBills[0].Breakdowns[0].AmountToCharge.Equal(decimal.NewFromFloat(0.25)) || !custom.TenantBills[2].Breakdowns[0].AmountToCharge.IsZero() {
		t.Fatalf("custom amounts not preserved: %+v", custom.TenantBills)
	}
	if !custom.TenantBills[2].TotalAmount.Equal(decimal.NewFromInt(3)) {
		t.Fatalf("provider total must not influence tenant bill: %s", custom.TenantBills[2].TotalAmount)
	}

	allocations[2].AmountToCharge = decimal.NewFromInt(2)
	if _, err := domain.CalculateBillsWithAllocations(masterBill, tenants, consumptions, allocations); err == nil {
		t.Fatal("expected validation error when allocations exceed original amount")
	}
}

func decimalPtr(value string) *decimal.Decimal {
	d := decimal.RequireFromString(value)
	return &d
}
