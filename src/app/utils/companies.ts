import { ComboboxItems } from '@core/interfaces/combobox.interface';
import {
  ActivityStatus,
  CompanyType,
  ContractStatus,
  InvoiceStatus,
  PickupStatus,
  WasteType,
} from '@core/interfaces/admin/companies.interface';

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  legal: 'იურიდიული პირი',
  individual: 'ფიზიკური პირი',
};

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  plastic: 'პლასტმასი',
  paper: 'ქაღალდი',
  aluminum: 'ალუმინი',
};

export const ACTIVITY_LABELS: Record<ActivityStatus, string> = {
  active: 'აქტიური',
  less_active: 'ნაკლებად აქტიური',
  inactive: 'არააქტიური',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  upcoming: 'დასაწყები',
  active: 'მოქმედი',
  expiring: 'იწურება',
  expired: 'ვადაგასული',
};

export const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  pending: 'დასადასტურებელი',
  confirmed: 'დადასტურებული',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: 'გადაუხდელი',
  sent: 'გაგზავნილი',
  paid: 'გადახდილი',
  overdue: 'ვადაგადაცილებული',
};

const toItems = <T extends string>(labels: Record<T, string>): ComboboxItems[] =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export const COMPANY_TYPE_ITEMS = toItems(COMPANY_TYPE_LABELS);
export const WASTE_TYPE_ITEMS = toItems(WASTE_TYPE_LABELS);
export const ACTIVITY_ITEMS = toItems(ACTIVITY_LABELS);
export const CONTRACT_STATUS_ITEMS = toItems(CONTRACT_STATUS_LABELS);
export const PICKUP_STATUS_ITEMS = toItems(PICKUP_STATUS_LABELS);
export const INVOICE_STATUS_ITEMS = toItems(INVOICE_STATUS_LABELS);

const BADGE_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const BADGE_GREEN = `${BADGE_BASE} bg-green-10 text-green-80`;
const BADGE_AMBER = `${BADGE_BASE} bg-amber-50 text-amber-800`;
const BADGE_RED = `${BADGE_BASE} bg-valencia-10 text-valencia-70`;
const BADGE_GRAY = `${BADGE_BASE} bg-neutral-100 text-platinum-70`;
const BADGE_BLUE = `${BADGE_BASE} bg-sky-50 text-sky-800`;

export const ACTIVITY_BADGE: Record<ActivityStatus, string> = {
  active: BADGE_GREEN,
  less_active: BADGE_AMBER,
  inactive: BADGE_GRAY,
};

export const CONTRACT_BADGE: Record<ContractStatus, string> = {
  upcoming: BADGE_BLUE,
  active: BADGE_GREEN,
  expiring: BADGE_AMBER,
  expired: BADGE_RED,
};

export const PICKUP_BADGE: Record<PickupStatus, string> = {
  pending: BADGE_AMBER,
  confirmed: BADGE_GREEN,
};

export const INVOICE_BADGE: Record<InvoiceStatus, string> = {
  unpaid: BADGE_GRAY,
  sent: BADGE_BLUE,
  paid: BADGE_GREEN,
  overdue: BADGE_RED,
};

export const BADGE_NEUTRAL = BADGE_GRAY;

export const EXPIRY_WARNING_DAYS = 30;

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [datePart] = value.split('T');
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return value;
  return `${d}.${m}.${y}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const moneyFormatter = new Intl.NumberFormat('ka-GE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kgFormatter = new Intl.NumberFormat('ka-GE', { maximumFractionDigits: 2 });

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return `${moneyFormatter.format(Number(value))} ₾`;
}

export function formatKg(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return `${kgFormatter.format(Number(value))} კგ`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { error?: { message?: string } })?.error?.message;
  return message || fallback;
}
