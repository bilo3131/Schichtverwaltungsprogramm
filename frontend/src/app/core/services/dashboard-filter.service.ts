import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardFilterService {
  /** Emits the currently selected department ID, or 'all' when no filter is active. */
  selectedDepartmentId$ = new BehaviorSubject<number | 'all'>('all');

  /** Updates the active department filter. Pass 'all' to remove the filter. */
  setDepartmentFilter(departmentId: number | 'all'): void {
    this.selectedDepartmentId$.next(departmentId);
  }

  /** Returns the current department filter value synchronously. */
  getDepartmentFilter(): number | 'all' {
    return this.selectedDepartmentId$.value;
  }
}
