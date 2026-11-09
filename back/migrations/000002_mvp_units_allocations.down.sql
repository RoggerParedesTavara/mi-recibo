DROP INDEX IF EXISTS uq_active_primary_tenant_per_unit;
DROP INDEX IF EXISTS idx_tenants_unit_id;
DROP INDEX IF EXISTS idx_units_property_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS unit_id;
ALTER TABLE master_bills DROP COLUMN IF EXISTS provider_total_amount;
ALTER TABLE master_bills DROP COLUMN IF EXISTS total_charged_amount;
ALTER TABLE tenant_bill_charge_breakdowns DROP COLUMN IF EXISTS amount_to_charge;
DROP TABLE IF EXISTS units CASCADE;
