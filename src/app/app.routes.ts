import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin.guard';
import { MainLayoutComponent } from '@shared/layouts/main-layout/main-layout.component';
import { productResolver } from '@core/resolvers/product.resolver';

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
        path: 'products/:slug/:product_id',
        loadComponent: () =>
          import('./pages/product/product.component').then(
            (m) => m.ProductComponent,
          ),
        resolve: { product: productResolver },
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search.component').then(
            (m) => m.SearchComponent,
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
    loadComponent: () =>
      import('./shared/layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
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

  {
    path: 'admin',
    loadComponent: () =>
      import('./shared/layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    canActivateChild: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'products',
        pathMatch: 'full',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin/products/admin-products.component').then(
            (m) => m.AdminProductsComponent,
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./pages/admin/product-form/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent,
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./pages/admin/product-form/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'users/:id/edit',
        loadComponent: () =>
          import('./pages/admin/user-form/admin-user-form.component').then(
            (m) => m.AdminUserFormComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '/404' },
];
