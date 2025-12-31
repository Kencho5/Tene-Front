import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '@shared/layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from '@shared/layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'bins',
        loadComponent: () =>
          import('./pages/bins/bins.component').then((m) => m.BinsComponent),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./pages/cart/cart.component').then((m) => m.CartComponent),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./pages/checkout/checkout.component').then(
            (m) => m.CheckoutComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products/products.component').then(
            (m) => m.ProductsComponent,
          ),
      },
      {
        path: 'products/:product_id',
        loadComponent: () =>
          import('./pages/product/product.component').then(
            (m) => m.ProductComponent,
          ),
      },
      {
        path: '404',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent,
          ),
      },
    ],
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '/404' },
];
