-- Floors/units are first-class concepts for sub-billing.
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_property_unit_name UNIQUE(property_id, name)
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_primary_tenant_per_unit
    ON tenants(unit_id) WHERE unit_id IS NOT NULL AND is_active = true;

ALTER TABLE master_bills ADD COLUMN IF NOT EXISTS provider_total_amount NUMERIC(12, 2);
ALTER TABLE master_bills ADD COLUMN IF NOT EXISTS total_charged_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
-- The old computed total is retained for API/data compatibility; provider_total_amount is authoritative
-- for the optional actual provider amount, and total_charged_amount is the sum billed to tenants.

ALTER TABLE tenant_bill_charge_breakdowns ADD COLUMN IF NOT EXISTS amount_to_charge NUMERIC(12, 2);
UPDATE tenant_bill_charge_breakdowns SET amount_to_charge = tenant_share WHERE amount_to_charge IS NULL;
ALTER TABLE tenant_bill_charge_breakdowns ALTER COLUMN amount_to_charge SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
