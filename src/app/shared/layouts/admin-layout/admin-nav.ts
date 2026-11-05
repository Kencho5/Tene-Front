export type AdminNavIcon =
  | 'analytics'
  | 'orders'
  | 'users'
  | 'payment-link'
  | 'checkout'
  | 'products'
  | 'top-products'
  | 'brands'
  | 'categories'
  | 'cable-specs'
  | 'blogs'
  | 'sliders'
  | 'tasks'
  | 'store';

export interface AdminNavItem {
  label: string;
  route: string;
  icon: AdminNavIcon;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    items: [
      { label: 'შეკვეთები', route: '/admin/orders', icon: 'orders' },
      { label: 'მომხმარებლები', route: '/admin/users', icon: 'users' },
      { label: 'ტასკები', route: '/admin/tasks', icon: 'tasks' },
    ],
  },
  {
    title: 'გაყიდვები',
    items: [
      { label: 'ანალიტიკა', route: '/admin/analytics', icon: 'analytics' },
      { label: 'გადახდის ბმული', route: '/admin/payment-link', icon: 'payment-link' },
      { label: 'ჩექაუთის სესიები', route: '/admin/checkout-sessions', icon: 'checkout' },
    ],
  },
  {
    title: 'კატალოგი',
    items: [
      { label: 'პროდუქტები', route: '/admin/products', icon: 'products' },
      { label: 'ტოპ პროდუქტები', route: '/admin/top-products', icon: 'top-products' },
      { label: 'კატეგორიები', route: '/admin/categories', icon: 'categories' },
      { label: 'ბრენდები', route: '/admin/brands', icon: 'brands' },
      { label: 'კაბელის ტიპები', route: '/admin/cable-types', icon: 'cable-specs' },
    ],
  },
  {
    title: 'კონტენტი',
    items: [
      { label: 'ბლოგი', route: '/admin/blogs', icon: 'blogs' },
      { label: 'სლაიდერები', route: '/admin/sliders', icon: 'sliders' },
    ],
  },
];

export const OPERATOR_ROUTES: ReadonlySet<string> = new Set(['/admin/orders', '/admin/payment-link']);
