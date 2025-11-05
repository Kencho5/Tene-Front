import { Routes } from '@angular/router';
import { BinsComponent } from '@pages/bins/bins.component';
import { HomeComponent } from '@pages/home/home.component';
import { AuthLayoutComponent } from '@shared/layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from '@shared/layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'bins', component: BinsComponent },
      { path: 'product/:id', component: BinsComponent },
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
    ],
  },
  { path: '**', redirectTo: '/404' },
];
