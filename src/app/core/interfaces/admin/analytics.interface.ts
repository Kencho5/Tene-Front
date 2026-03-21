export interface MostViewedProduct {
  product_id: string;
  product_name: string;
  views: number;
}

export interface TrendingProduct {
  product_id: string;
  product_name: string;
  views: number;
}

export interface UniqueViewersProduct {
  product_id: string;
  product_name: string;
  logged_in_viewers: number;
  anonymous_views: number;
  total_views: number;
}

export interface ViewsByHour {
  hour: number;
  views: number;
}

export interface HighViewsLowSales {
  product_id: string;
  product_name: string;
  views: number;
  sold: number;
}

export interface ConversionRate {
  product_id: string;
  product_name: string;
  viewers: number;
  purchases: number;
  conversion_pct: number;
}

export interface AnalyticsResponse {
  most_viewed: MostViewedProduct[];
  trending_this_week: TrendingProduct[];
  unique_viewers: UniqueViewersProduct[];
  views_by_hour: ViewsByHour[];
  high_views_low_sales: HighViewsLowSales[];
  conversion_rates: ConversionRate[];
}
