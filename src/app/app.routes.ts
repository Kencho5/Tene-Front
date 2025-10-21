import { Routes } from '@angular/router';
import { BinsComponent } from '@pages/bins/bins.component';
import { HomeComponent } from '@pages/home/home.component';
import { MainLayoutComponent } from '@shared/layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'bins', component: BinsComponent },
    ],
  },
];
