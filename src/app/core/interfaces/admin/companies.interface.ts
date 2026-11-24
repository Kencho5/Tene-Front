export type CompanyType = 'legal' | 'individual';
export type WasteType = 'plastic' | 'paper' | 'aluminum';
export type ActivityStatus = 'active' | 'less_active' | 'inactive';
export type ContractStatus = 'upcoming' | 'active' | 'expiring' | 'expired';
export type PickupStatus = 'pending' | 'confirmed';
export type InvoiceStatus = 'unpaid' | 'sent' | 'paid' | 'overdue';
export type ExportDataset =
  | 'companies'
  | 'addresses'
  | 'contacts'
  | 'contracts'
  | 'tariffs'
  | 'pickups'
  | 'waste_totals'
  | 'invoices';

export type Money = string;

export interface Company {
  id: number;
  name: string;
  identification_code: string;
  company_type: CompanyType;
  is_active: boolean;
  payment_terms_days: number;
  payment_terms: string | null;
  requires_confirmation: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanySummary extends Company {
  activity_status: ActivityStatus;
  last_pickup_date: string | null;
  pickups_recent: number;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_days_left: number | null;
  unpaid_invoices_count: number;
  unpaid_invoices_total: Money;
}

export interface CompanyAddress {
  id: number;
  company_id: number;
  label: string | null;
  city: string | null;
  address: string;
  created_at: string;
}

export interface CompanyContact {
  id: number;
  company_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  receives_invoices: boolean;
  created_at: string;
}

export interface CompanyContract {
  id: number;
  company_id: number;
  company_name: string;
  contract_number: string | null;
  start_date: string;
  end_date: string;
  terms: string | null;
  file_name: string | null;
  file_url: string | null;
  status: ContractStatus;
  days_left: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyTariff {
  id: number;
  company_id: number;
  waste_type: WasteType;
  price_per_kg: Money;
  fixed_fee: Money;
  effective_from: string;
  note: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CompanyDetail extends CompanySummary {
  addresses: CompanyAddress[];
  contacts: CompanyContact[];
  contracts: CompanyContract[];
  current_tariffs: CompanyTariff[];
  tariff_history: CompanyTariff[];
}

export interface CompanySearchResponse {
  companies: CompanySummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompanyListParams {
  query?: string;
  activity_status?: ActivityStatus;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface CompanyRequest {
  name: string;
  identification_code: string;
  company_type: CompanyType;
  is_active: boolean;
  payment_terms_days: number;
  payment_terms: string | null;
  requires_confirmation: boolean;
  notes: string | null;
}

export interface CompanyAddressRequest {
  label: string | null;
  city: string | null;
  address: string;
}

export interface CompanyContactRequest {
  full_name: string;
  phone: string | null;
  email: string | null;
  receives_invoices: boolean;
}

export interface CompanyContractRequest {
  contract_number: string | null;
  start_date: string;
  end_date: string;
  terms: string | null;
}

export interface CompanyTariffRequest {
  waste_type: WasteType;
  price_per_kg: number;
  fixed_fee: number;
  effective_from: string;
  note: string | null;
}

export interface ContractListParams {
  company_id?: number;
  status?: ContractStatus;
  current_only?: boolean;
}

export interface CompanyPickup {
  id: number;
  company_id: number;
  company_name: string;
  address_id: number | null;
  address_snapshot: string | null;
  pickup_date: string;
  waste_type: WasteType;
  quantity_kg: Money;
  tariff_id: number | null;
  unit_price: Money | null;
  fixed_fee: Money;
  amount: Money;
  amount_overridden: boolean;
  status: PickupStatus;
  notes: string | null;
  created_by_name: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  invoice_id: number | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface PickupRequest {
  company_id: number;
  address_id: number | null;
  pickup_date: string;
  waste_type: WasteType;
  quantity_kg: number;
  amount: number | null;
  notes: string | null;
}

export interface PickupListParams {
  company_id?: number;
  waste_type?: WasteType;
  status?: PickupStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PickupSearchResponse {
  pickups: CompanyPickup[];
  total: number;
  total_quantity_kg: Money;
  total_amount: Money;
  limit: number;
  offset: number;
}

export interface InvoiceDelivery {
  id: number;
  invoice_id: number;
  recipients: string[];
  success: boolean;
  error: string | null;
  sent_by_name: string | null;
  sent_at: string;
}

export interface CompanyInvoice {
  id: number;
  invoice_number: string;
  company_id: number;
  company_name: string;
  pickup_id: number;
  pickup_date: string;
  waste_type: WasteType;
  quantity_kg: Money;
  issue_date: string;
  due_date: string;
  total: Money;
  status: InvoiceStatus;
  paid_at: string | null;
  last_sent_at: string | null;
  created_at: string;
}

export interface CompanyInvoiceDetail extends CompanyInvoice {
  html: string;
  deliveries: InvoiceDelivery[];
}

export interface PickupConfirmResponse {
  pickup: CompanyPickup;
  invoice: CompanyInvoice | null;
  delivery: InvoiceDelivery | null;
}

export interface InvoiceListParams {
  company_id?: number;
  status?: InvoiceStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface InvoiceSearchResponse {
  invoices: CompanyInvoice[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompanyReportParams {
  company_id?: number;
  from?: string;
  to?: string;
}

export interface CompanyExportParams extends CompanyReportParams {
  dataset?: ExportDataset;
}

export interface WasteTotal {
  waste_type: WasteType;
  quantity_kg: Money;
  amount: Money;
  pickups_count: number;
}

export interface CompanyWasteTotal {
  company_id: number;
  company_name: string;
  plastic_kg: Money;
  paper_kg: Money;
  aluminum_kg: Money;
  total_kg: Money;
  amount: Money;
  pickups_count: number;
}

export interface InvoiceTotals {
  invoices_count: number;
  total_amount: Money;
  paid_count: number;
  paid_amount: Money;
  unpaid_count: number;
  unpaid_amount: Money;
  overdue_count: number;
  overdue_amount: Money;
}

export interface CompanyReport {
  companies_total: number;
  active: number;
  less_active: number;
  inactive: number;
  contracts_expired: number;
  contracts_expiring: number;
  pickups_count: number;
  pickups_pending: number;
  waste_totals: WasteTotal[];
  per_company: CompanyWasteTotal[];
  invoices: InvoiceTotals;
}
