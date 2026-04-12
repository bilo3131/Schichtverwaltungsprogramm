import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
import { buildHttpParams } from '../utils/http-params.util';

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

  // ── Shift Types ───────────────────────────────────────────────────────────

  /** Fetches all shift types, with optional filter params. */
  getShiftTypes(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTypes, { params: buildHttpParams(params) });
  }

  /** Fetches a single shift type by ID. */
  getShiftType(id: number): Observable<ShiftType> {
    return this.http.get<ShiftType>(`${this.ENDPOINTS.shiftTypes}${id}/`);
  }

  /** Creates a new shift type. */
  createShiftType(shiftType: Partial<ShiftType>): Observable<ShiftType> {
    return this.http.post<ShiftType>(this.ENDPOINTS.shiftTypes, shiftType);
  }

  /** Partially updates an existing shift type. */
  updateShiftType(id: number, shiftType: Partial<ShiftType>): Observable<ShiftType> {
    return this.http.patch<ShiftType>(`${this.ENDPOINTS.shiftTypes}${id}/`, shiftType);
  }

  /** Deletes a shift type by ID. */
  deleteShiftType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTypes}${id}/`);
  }

  // ── Shifts ────────────────────────────────────────────────────────────────

  /** Fetches all shifts, with optional filter params (e.g. week, department). */
  getShifts(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shifts, { params: buildHttpParams(params) });
  }

  /** Fetches a single shift by ID. */
  getShift(id: number): Observable<Shift> {
    return this.http.get<Shift>(`${this.ENDPOINTS.shifts}${id}/`);
  }

  /** Creates a new shift. */
  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(this.ENDPOINTS.shifts, shift);
  }

  /** Partially updates an existing shift. */
  updateShift(id: number, shift: Partial<Shift>): Observable<Shift> {
    return this.http.patch<Shift>(`${this.ENDPOINTS.shifts}${id}/`, shift);
  }

  /** Deletes a shift by ID. */
  deleteShift(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shifts}${id}/`);
  }

  /** Publishes a single shift, making it visible to employees. */
  publishShift(id: number): Observable<Shift> {
    return this.http.post<Shift>(`${this.ENDPOINTS.shifts}${id}/publish/`, {});
  }

  /** Publishes all shifts within the given date range. */
  publishWeek(startDate: string, endDate: string): Observable<any> {
    return this.http.post(`${this.ENDPOINTS.shifts}publish_week/`, {
      start_date: startDate,
      end_date: endDate
    });
  }

  /** Checks whether assigning an employee to a shift on a date violates compliance rules. */
  validateCompliance(employeeId: number, date: string): Observable<ComplianceCheck> {
    return this.http.get<ComplianceCheck>(`${this.ENDPOINTS.shifts}validate_compliance/`, {
      params: { employee: employeeId.toString(), date }
    });
  }

  // ── Shift Swap Requests ───────────────────────────────────────────────────

  /** Fetches all shift-swap requests. */
  getShiftSwapRequests(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftSwapRequests);
  }

  /** Fetches a single shift-swap request by ID. */
  getShiftSwapRequest(id: number): Observable<ShiftSwapRequest> {
    return this.http.get<ShiftSwapRequest>(`${this.ENDPOINTS.shiftSwapRequests}${id}/`);
  }

  /** Creates a new shift-swap request. */
  createShiftSwapRequest(request: Partial<ShiftSwapRequest>): Observable<ShiftSwapRequest> {
    return this.http.post<ShiftSwapRequest>(this.ENDPOINTS.shiftSwapRequests, request);
  }

  /** Approves an existing shift-swap request. */
  approveShiftSwapRequest(id: number): Observable<ShiftSwapRequest> {
    return this.http.post<ShiftSwapRequest>(`${this.ENDPOINTS.shiftSwapRequests}${id}/approve/`, {});
  }

  // ── Shift Templates ───────────────────────────────────────────────────────

  /** Fetches all shift templates. */
  getShiftTemplates(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTemplates);
  }

  /** Fetches a single shift template by ID. */
  getShiftTemplate(id: number): Observable<ShiftTemplate> {
    return this.http.get<ShiftTemplate>(`${this.ENDPOINTS.shiftTemplates}${id}/`);
  }

  /** Creates a new shift template. */
  createShiftTemplate(template: Partial<ShiftTemplate>): Observable<ShiftTemplate> {
    return this.http.post<ShiftTemplate>(this.ENDPOINTS.shiftTemplates, template);
  }

  /** Partially updates an existing shift template. */
  updateShiftTemplate(id: number, template: Partial<ShiftTemplate>): Observable<ShiftTemplate> {
    return this.http.patch<ShiftTemplate>(`${this.ENDPOINTS.shiftTemplates}${id}/`, template);
  }

  /** Deletes a shift template by ID. */
  deleteShiftTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTemplates}${id}/`);
  }

  /** Applies a shift template to generate shifts within the given date range. */
  applyShiftTemplate(id: number, startDate: string, endDate: string): Observable<any> {
    return this.http.post(`${this.ENDPOINTS.shiftTemplates}${id}/apply_template/`, {
      start_date: startDate,
      end_date: endDate
    });
  }

  // ── Shift Template Entries ────────────────────────────────────────────────

  /** Fetches all shift template entries. */
  getShiftTemplateEntries(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.shiftTemplateEntries);
  }

  /** Creates a new entry within a shift template. */
  createShiftTemplateEntry(entry: Partial<ShiftTemplateEntry>): Observable<ShiftTemplateEntry> {
    return this.http.post<ShiftTemplateEntry>(this.ENDPOINTS.shiftTemplateEntries, entry);
  }

  /** Partially updates an existing shift template entry. */
  updateShiftTemplateEntry(id: number, entry: Partial<ShiftTemplateEntry>): Observable<ShiftTemplateEntry> {
    return this.http.patch<ShiftTemplateEntry>(`${this.ENDPOINTS.shiftTemplateEntries}${id}/`, entry);
  }

  /** Deletes a shift template entry by ID. */
  deleteShiftTemplateEntry(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ENDPOINTS.shiftTemplateEntries}${id}/`);
  }
}
