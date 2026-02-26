import { ProductBrandCard, ProductCategoryCard } from '@core/interfaces/products.interface';

export const productCategoryCards: ProductCategoryCard[] = [
  {
    text: 'მობილურები',
    image: 'mobile-category',
    route: '',
  },
  {
    text: 'კაბელები',
    image: 'cable-category',
    route: '',
  },
  {
    text: 'ყურსასმენები',
    image: 'headphones-category',
    route: '',
  },
  {
    text: 'პლანშეტები',
    image: 'tablet-category',
    route: '',
  },
  {
    text: 'ჭკვიანი საათები',
    image: 'smart-watch-category',
    route: '',
  },
];

export const productBrandCards: ProductBrandCard[] = [
  {
    brand: 'logitech',
    brandId: 71,
    title: 'ხარისხი და კომფორტი',
    color: 'cream',
  },
  {
    brand: 'apple',
    brandId: 8,
    title: 'ხარისხი და კომფორტი',
    color: 'pear',
  },
  {
    brand: 'anker',
    brandId: 126,
    title: 'ხარისხი და კომფორტი',
    color: 'info',
  },
  {
    brand: 'logitech',
    brandId: 71,
    title: 'ხარისხი და კომფორტი',
    color: 'cream',
  },
];

export const productTopCategoryCards: ProductCategoryCard[] = [
  {
    text: 'მობილურები',
    image: 'mobile-category',
    route: '/search',
    categoryId: 217,
    color: 'green',
  },
  {
    text: 'ყურსასმენები',
    image: 'headphones-category',
    route: '/search',
    categoryId: 221,
    color: 'cream',
  },
  {
    text: 'პლანშეტები',
    image: 'tablet-category',
    route: '/search',
    categoryId: 222,
    color: 'blue',
  },
  {
    text: 'საათები',
    image: 'smart-watch-category',
    route: '/search',
    categoryId: 232,
    color: 'purple',
  },
];
