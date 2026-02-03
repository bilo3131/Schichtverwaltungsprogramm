import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, Qualification, Availability, VacationRequest, AbsenceRecord } from '../models';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly API_BASE_URL = getApiUrl('SHIFTS');
  private readonly ENDPOINTS = {
    employees: `${this.API_BASE_URL}/employees/`,
    qualifications: `${this.API_BASE_URL}/qualifications/`,
    availabilities: `${this.API_BASE_URL}/availabilities/`,
    vacationRequests: `${this.API_BASE_URL}/vacation-requests/`,
    absences: `${this.API_BASE_URL}/absences/`
  } as const;

  constructor(private http: HttpClient) {}

  // Employees
  getEmployees(params?: any): Observable<any> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<any>(this.ENDPOINTS.employees, { params: httpParams });
  }

  getEmployee(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.ENDPOINTS.employees}${id}/`);
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.ENDPOINTS.employees, employee);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.ENDPOINTS.employees}${id}/`, employee);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.employees}${id}/`);
  }

  getEmployeeHoursSummary(id: number, startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.ENDPOINTS.employees}${id}/hours_summary/`, {
      params: { start_date: startDate, end_date: endDate }
    });
  }

  resetEmployeePassword(id: number): Observable<any> {
    return this.http.post<any>(`${this.ENDPOINTS.employees}${id}/reset_password/`, {});
  }

  // Qualifications
  getQualifications(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.qualifications);
  }

  getQualification(id: number): Observable<Qualification> {
    return this.http.get<Qualification>(`${this.ENDPOINTS.qualifications}${id}/`);
  }

  createQualification(qualification: Partial<Qualification>): Observable<Qualification> {
    return this.http.post<Qualification>(this.ENDPOINTS.qualifications, qualification);
  }

  updateQualification(id: number, qualification: Partial<Qualification>): Observable<Qualification> {
    return this.http.patch<Qualification>(`${this.ENDPOINTS.qualifications}${id}/`, qualification);
  }

  deleteQualification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.qualifications}${id}/`);
  }

  // Availabilities
  getAvailabilities(employeeId?: number): Observable<any> {
    const params = employeeId ? { employee: employeeId.toString() } : undefined;
    const httpParams = this.buildHttpParams(params);
    return this.http.get<any>(this.ENDPOINTS.availabilities, { params: httpParams });
  }

  getAvailability(id: number): Observable<Availability> {
    return this.http.get<Availability>(`${this.ENDPOINTS.availabilities}${id}/`);
  }

  createAvailability(availability: Partial<Availability>): Observable<Availability> {
    return this.http.post<Availability>(this.ENDPOINTS.availabilities, availability);
  }

  updateAvailability(id: number, availability: Partial<Availability>): Observable<Availability> {
    return this.http.patch<Availability>(`${this.ENDPOINTS.availabilities}${id}/`, availability);
  }

  deleteAvailability(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.availabilities}${id}/`);
  }

  // Vacation Requests
  getVacationRequests(status?: string, additionalParams?: any): Observable<any> {
    const params = { ...additionalParams };
    if (status) {
      params.status = status;
    }
    const httpParams = this.buildHttpParams(params);
    return this.http.get<any>(this.ENDPOINTS.vacationRequests, { params: httpParams });
  }

  getVacationRequest(id: number): Observable<VacationRequest> {
    return this.http.get<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/`);
  }

  createVacationRequest(request: Partial<VacationRequest>): Observable<VacationRequest> {
    return this.http.post<VacationRequest>(this.ENDPOINTS.vacationRequests, request);
  }

  updateVacationRequest(id: number, request: Partial<VacationRequest>): Observable<VacationRequest> {
    return this.http.patch<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/`, request);
  }

  approveVacationRequest(id: number): Observable<VacationRequest> {
    return this.http.post<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/approve/`, {});
  }

  rejectVacationRequest(id: number): Observable<VacationRequest> {
    return this.http.post<VacationRequest>(`${this.ENDPOINTS.vacationRequests}${id}/reject/`, {});
  }

  deleteVacationRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.vacationRequests}${id}/`);
  }

  // Absences
  getAbsences(params?: any): Observable<any> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<any>(this.ENDPOINTS.absences, { params: httpParams });
  }

  getAbsence(id: number): Observable<AbsenceRecord> {
    return this.http.get<AbsenceRecord>(`${this.ENDPOINTS.absences}${id}/`);
  }

  createAbsence(absence: Partial<AbsenceRecord>): Observable<AbsenceRecord> {
    return this.http.post<AbsenceRecord>(this.ENDPOINTS.absences, absence);
  }

  updateAbsence(id: number, absence: Partial<AbsenceRecord>): Observable<AbsenceRecord> {
    return this.http.patch<AbsenceRecord>(`${this.ENDPOINTS.absences}${id}/`, absence);
  }

  deleteAbsence(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.absences}${id}/`);
  }

  private buildHttpParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }
}
