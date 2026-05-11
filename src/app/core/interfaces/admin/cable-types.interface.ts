export interface CableVariant {
  id: number;
  cable_type_id: number;
  watts: number;
  length_cm: number;
  price: string;
  warranty_months: number;
  created_at: string;
  updated_at: string;
}

export interface CableType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  variants: CableVariant[];
}

export interface CableTypeRequest {
  name: string;
}

export interface CableVariantRequest {
  watts: number;
  length_cm: number;
  price: string;
  warranty_months: number;
}

export interface CableVariantUpdate {
  watts?: number;
  length_cm?: number;
  price?: string;
  warranty_months?: number;
}
