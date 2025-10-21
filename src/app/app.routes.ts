import { Routes } from '@angular/router';
import { HomeComponent } from '@pages/home/home.component';
import { MainLayoutComponent } from '@shared/layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [{ path: '', component: HomeComponent }],
  },
];
