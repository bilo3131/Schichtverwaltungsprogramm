import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Department } from '../models/employee.model';
import { getApiUrl } from '../config/api.config';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly API_URL = `${getApiUrl('SHIFTS')}/departments` as const;

  constructor(private http: HttpClient) {}

  /** Fetches all departments, with optional filter params. */
  getDepartments(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/`, { params: buildHttpParams(params) });
  }

  /** Fetches a single department by ID. */
  getDepartment(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.API_URL}/${id}/`);
  }

  /** Creates a new department. */
  createDepartment(data: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.API_URL}/`, data);
  }

  /** Fully replaces an existing department. */
  updateDepartment(id: number, data: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.API_URL}/${id}/`, data);
  }

  /** Deletes a department by ID. */
  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}/`);
  }
}
