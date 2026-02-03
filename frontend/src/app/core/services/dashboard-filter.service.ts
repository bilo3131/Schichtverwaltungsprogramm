import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardFilterService {
  selectedDepartmentId$ = new BehaviorSubject<number | 'all'>('all');

  setDepartmentFilter(departmentId: number | 'all'): void {
    this.selectedDepartmentId$.next(departmentId);
  }

  getDepartmentFilter(): number | 'all' {
    return this.selectedDepartmentId$.value;
  }
}
