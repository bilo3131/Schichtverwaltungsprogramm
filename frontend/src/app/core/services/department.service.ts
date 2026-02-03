import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Department } from '../models/employee.model';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private readonly API_URL = `${getApiUrl('SHIFTS')}/departments` as const;

  constructor(private http: HttpClient) {}

  getDepartments(params?: any): Observable<any> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<any>(`${this.API_URL}/`, { params: httpParams });
  }

  getDepartment(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.API_URL}/${id}/`);
  }

  createDepartment(data: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.API_URL}/`, data);
  }

  updateDepartment(id: number, data: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.API_URL}/${id}/`, data);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}/`);
  }

  private buildHttpParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return httpParams;
  }
}
