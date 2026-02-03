import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Shift, 
  ShiftType, 
  ShiftSwapRequest, 
  ShiftTemplate, 
  ShiftTemplateEntry,
  ComplianceCheck 
} from '../models';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private readonly API_BASE_URL = getApiUrl('SHIFTS');
  private readonly ENDPOINTS = {
    shiftTypes: `${this.API_BASE_URL}/shift-types/`,
    shifts: `${this.API_BASE_URL}/shifts/`,
    shiftSwapRequests: `${this.API_BASE_URL}/shift-swap-requests/`,
    shiftTemplates: `${this.API_BASE_URL}/shift-templates/`,
    shiftTemplateEntries: `${this.API_BASE_URL}/shift-template-entries/`
  } as const;

  constructor(private http: HttpClient) {}

  // Shift Types
  getShiftTypes(params?: any): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTypes, { params });
  }

  getShiftType(id: number): Observable<ShiftType> {
    return this.http.get<ShiftType>(`${this.ENDPOINTS.shiftTypes}${id}/`);
  }

  createShiftType(shiftType: Partial<ShiftType>): Observable<ShiftType> {
    return this.http.post<ShiftType>(this.ENDPOINTS.shiftTypes, shiftType);
  }

  updateShiftType(id: number, shiftType: Partial<ShiftType>): Observable<ShiftType> {
    return this.http.patch<ShiftType>(`${this.ENDPOINTS.shiftTypes}${id}/`, shiftType);
  }

  deleteShiftType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTypes}${id}/`);
  }

  // Shifts
  getShifts(params?: any): Observable<any> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<any>(this.ENDPOINTS.shifts, { params: httpParams });
  }

  getShift(id: number): Observable<Shift> {
    return this.http.get<Shift>(`${this.ENDPOINTS.shifts}${id}/`);
  }

  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(this.ENDPOINTS.shifts, shift);
  }

  updateShift(id: number, shift: Partial<Shift>): Observable<Shift> {
    return this.http.patch<Shift>(`${this.ENDPOINTS.shifts}${id}/`, shift);
  }

  deleteShift(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shifts}${id}/`);
  }

  publishShift(id: number): Observable<Shift> {
    return this.http.post<Shift>(`${this.ENDPOINTS.shifts}${id}/publish/`, {});
  }

  publishWeek(startDate: string, endDate: string): Observable<any> {
    return this.http.post(`${this.ENDPOINTS.shifts}publish_week/`, {
      start_date: startDate,
      end_date: endDate
    });
  }

  validateCompliance(employeeId: number, date: string): Observable<ComplianceCheck> {
    return this.http.get<ComplianceCheck>(`${this.ENDPOINTS.shifts}validate_compliance/`, {
      params: { employee: employeeId.toString(), date }
    });
  }

  // Shift Swap Requests
  getShiftSwapRequests(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftSwapRequests);
  }

  getShiftSwapRequest(id: number): Observable<ShiftSwapRequest> {
    return this.http.get<ShiftSwapRequest>(`${this.ENDPOINTS.shiftSwapRequests}${id}/`);
  }

  createShiftSwapRequest(request: Partial<ShiftSwapRequest>): Observable<ShiftSwapRequest> {
    return this.http.post<ShiftSwapRequest>(this.ENDPOINTS.shiftSwapRequests, request);
  }

  approveShiftSwapRequest(id: number): Observable<ShiftSwapRequest> {
    return this.http.post<ShiftSwapRequest>(`${this.ENDPOINTS.shiftSwapRequests}${id}/approve/`, {});
  }

  // Shift Templates
  getShiftTemplates(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTemplates);
  }

  getShiftTemplate(id: number): Observable<ShiftTemplate> {
    return this.http.get<ShiftTemplate>(`${this.ENDPOINTS.shiftTemplates}${id}/`);
  }

  createShiftTemplate(template: Partial<ShiftTemplate>): Observable<ShiftTemplate> {
    return this.http.post<ShiftTemplate>(this.ENDPOINTS.shiftTemplates, template);
  }

  updateShiftTemplate(id: number, template: Partial<ShiftTemplate>): Observable<ShiftTemplate> {
    return this.http.patch<ShiftTemplate>(`${this.ENDPOINTS.shiftTemplates}${id}/`, template);
  }

  deleteShiftTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTemplates}${id}/`);
  }

  applyShiftTemplate(id: number, startDate: string, endDate: string): Observable<any> {
    return this.http.post(`${this.ENDPOINTS.shiftTemplates}${id}/apply_template/`, {
      start_date: startDate,
      end_date: endDate
    });
  }

  // Shift Template Entries
  getShiftTemplateEntries(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTemplateEntries);
  }

  createShiftTemplateEntry(entry: Partial<ShiftTemplateEntry>): Observable<ShiftTemplateEntry> {
    return this.http.post<ShiftTemplateEntry>(this.ENDPOINTS.shiftTemplateEntries, entry);
  }

  updateShiftTemplateEntry(id: number, entry: Partial<ShiftTemplateEntry>): Observable<ShiftTemplateEntry> {
    return this.http.patch<ShiftTemplateEntry>(`${this.ENDPOINTS.shiftTemplateEntries}${id}/`, entry);
  }

  deleteShiftTemplateEntry(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTemplateEntries}${id}/`);
  }

  private buildHttpParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }
}
