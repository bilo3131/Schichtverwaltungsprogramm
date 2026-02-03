import { Routes } from '@angular/router';

export const SHIFTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./shift-list/shift-list.component').then(m => m.ShiftListComponent)
  }
];
