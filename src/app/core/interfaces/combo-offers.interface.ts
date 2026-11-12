import { Product, ProductImage } from '@core/interfaces/products.interface';

export type ComboPricingType = 'addon_price' | 'bundle_price';

export interface ComboProduct {
  data: Product;
  images: ProductImage[];
}

export interface ComboOfferItem {
  product_id: string;
  combo_price: string | number | null;
  position: number;
  product: ComboProduct | null;
}

export interface ComboOffer {
  id: number;
  main_product_id: string;
  title: string;
  description: string | null;
  pricing_type: ComboPricingType;
  bundle_price: string | number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  main_product: ComboProduct | null;
  items: ComboOfferItem[];
}

export interface ComboOfferRequest {
  main_product_id: string;
  title: string;
  description: string | null;
  pricing_type: ComboPricingType;
  bundle_price: number | null;
  enabled: boolean;
  items: { product_id: string; combo_price: number | null }[];
}
