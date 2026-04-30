import { Product } from '@core/interfaces/products.interface';

export interface CableConfig {
  watts: number;
  lengthCm: number;
  price: number;
  warranty: string;
}

export const CABLE_LENGTHS_CM = [
  20, 50, 70, 100, 130, 150, 200, 250, 300, 350, 400, 450, 500,
] as const;

export const CABLE_WATTS = [67, 120] as const;

const PRICES_67W = [15, 20, 22, 25, 30, 35, 37, 40, 45, 50, 55, 60, 65];
const PRICES_120W = [25, 35, 40, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
const WARRANTY_MONTHS = [1, 1, 1, 3, 12, 12, 12, 12, 12, 12, 12, 12, 12];

export function isTypeCCable(product: Product): boolean {
  const specs = product.specifications;
  if (!specs || typeof specs !== 'object') return false;
  for (const group of Object.values(specs)) {
    for (const item of group) {
      if (item.name.includes('კონექტორები')) {
        const v = item.value;
        const occurrences = (v.match(/type\s*-?\s*c/gi) ?? []).length;
        if (occurrences >= 2) return true;
      }
    }
  }
  return false;
}

export function getCableConfig(watts: number, lengthCm: number): CableConfig {
  const idx = CABLE_LENGTHS_CM.indexOf(lengthCm as (typeof CABLE_LENGTHS_CM)[number]);
  if (idx === -1) {
    return { watts, lengthCm, price: 0, warranty: '1 month' };
  }
  const price = watts === 120 ? PRICES_120W[idx] : PRICES_67W[idx];
  const months = WARRANTY_MONTHS[idx];
  const warranty = months === 1 ? '1 month' : `${months} months`;
  return { watts, lengthCm, price, warranty };
}

export function formatCableConfig(c: CableConfig): string {
  return `${c.watts}W · ${c.lengthCm}სმ`;
}
