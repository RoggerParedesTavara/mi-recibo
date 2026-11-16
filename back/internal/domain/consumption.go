package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// TenantConsumption holds the monthly consumed units recorded for a tenant
type TenantConsumption struct {
	ID                       uuid.UUID        `json:"id"`
	MasterBillID             uuid.UUID        `json:"master_bill_id"`
	TenantID                 uuid.UUID        `json:"tenant_id"`
	ConsumedUnits            decimal.Decimal  `json:"consumed_units"`
	PreviousReading          *decimal.Decimal `json:"previous_reading,omitempty"`
	CurrentReading           *decimal.Decimal `json:"current_reading,omitempty"`
	PreviousMonthConsumption *decimal.Decimal `json:"previous_month_consumption,omitempty"`
	VariationPercentage      *decimal.Decimal `json:"variation_percentage,omitempty"`
	AlertSpike               bool             `json:"alert_spike"`
	AlertMessage             string           `json:"alert_message,omitempty"`
	CreatedAt                time.Time        `json:"created_at"`
	UpdatedAt                time.Time        `json:"updated_at"`
}

// LatestTenantReading is the most recent complete meter reading for one tenant
// and utility service. Billing period is included so clients can label it and
// use current_reading as the next period's previous_reading.
type LatestTenantReading struct {
	TenantID        uuid.UUID        `json:"tenant_id"`
	UnitID          *uuid.UUID       `json:"unit_id,omitempty"`
	MasterBillID    uuid.UUID        `json:"master_bill_id"`
	ServiceType     ServiceType      `json:"service_type"`
	BillingYear     int              `json:"billing_year"`
	BillingMonth    int              `json:"billing_month"`
	PreviousReading *decimal.Decimal `json:"previous_reading,omitempty"`
	CurrentReading  decimal.Decimal  `json:"current_reading"`
	ConsumedUnits   decimal.Decimal  `json:"consumed_units"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// TenantReading represents a tenant's meter reading for a billing period.
type TenantReading = LatestTenantReading

type ReadingInput struct {
	TenantID        uuid.UUID        `json:"tenant_id"`
	UnitID          *uuid.UUID       `json:"unit_id,omitempty"`
	ConsumedUnits   decimal.Decimal  `json:"consumed_units"`
	PreviousReading *decimal.Decimal `json:"previous_reading,omitempty"`
	CurrentReading  *decimal.Decimal `json:"current_reading,omitempty"`
}
