import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'category/:category',
    loadComponent: () =>
      import('./pages/category-detail/category-detail.component').then(
        (m) => m.CategoryDetailComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
