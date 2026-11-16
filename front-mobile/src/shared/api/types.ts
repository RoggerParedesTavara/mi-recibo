export type ServiceType = 'LUZ' | 'AGUA' | 'GAS';

export interface OwnerDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface PropertyDTO {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  created_at: string;
}

export interface UnitDTO {
  id: string;
  property_id: string;
  name: string;
  created_at: string;
}

export interface TenantDTO {
  id: string;
  property_id: string;
  unit_id?: string;
  name: string;
  email: string;
  phone: string;
  room_or_unit: string;
  is_active: boolean;
  created_at: string;
}

export interface ExtraChargeDTO {
  id?: string;
  description: string;
  original_amount: string | number;
}

export interface MasterBillDTO {
  id: string;
  property_id: string;
  service_type: ServiceType;
  billing_year: number;
  billing_month: number;
  total_consumption: string | number;
  unit_price: string | number;
  provider_total_amount?: string | number;
  total_charged_amount?: string | number;
  status: 'DRAFT' | 'CALCULATED';
  issue_date?: string;
  due_date?: string;
  extra_charges: ExtraChargeDTO[];
  created_at: string;
}

export interface ReadingInputDTO {
  tenant_id: string;
  consumed_units: string | number;
  previous_reading?: string | number;
  current_reading?: string | number;
}

export interface LatestTenantReadingDTO {
  tenant_id: string;
  unit_id?: string;
  master_bill_id: string;
  service_type: ServiceType;
  billing_year: number;
  billing_month: number;
  previous_reading?: string | number;
  current_reading: string | number;
  consumed_units: string | number;
  updated_at: string;
}

export interface RecordConsumptionsRequestDTO {
  readings: ReadingInputDTO[];
}

export interface ConsumptionRecordDTO {
  id: string;
  master_bill_id: string;
  tenant_id: string;
  consumed_units: string;
  created_at: string;
}

export interface RecordConsumptionsResponseDTO {
  message: string;
  consumptions: ConsumptionRecordDTO[];
}

export interface BreakdownDTO {
  description: string;
  original_amount: string;
  tenants_count: number;
  tenant_share: string;
}

export interface TenantBillDTO {
  id: string;
  master_bill_id: string;
  tenant_id: string;
  tenant_name: string;
  room_or_unit: string;
  property_name: string;
  service_type: ServiceType;
  billing_year: number;
  billing_month: number;
  consumed_units: string;
  unit_price: string;
  consumption_amount: string;
  extra_charges_total_share: string;
  total_amount: string;
  status: 'PENDING' | 'PAID';
  alert_spike: boolean;
  alert_message: string;
  previous_month_units?: string;
  breakdowns: BreakdownDTO[];
  created_at: string;
}

export interface CalculateMasterBillResponseDTO {
  provider_total_amount?: string;
  total_charged_amount: string;
  tenant_bills: TenantBillDTO[];
}
