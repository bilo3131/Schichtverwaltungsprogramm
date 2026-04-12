import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Holiday } from '../models';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly holidaysUrl = `${getApiUrl('SHIFTS')}/holidays/`;

  constructor(private http: HttpClient) {}

  /** Fetches all holidays, optionally filtered by date range. */
  getHolidays(startDate?: string, endDate?: string): Observable<any> {
    const params: Record<string, string> = {};
    if (startDate) params['start_date'] = startDate;
    if (endDate) params['end_date'] = endDate;
    return this.http.get<any>(this.holidaysUrl, { params });
  }

  /** Creates a new public holiday. */
  createHoliday(holiday: Partial<Holiday>): Observable<Holiday> {
    return this.http.post<Holiday>(this.holidaysUrl, holiday);
  }

  /** Fully replaces an existing holiday. */
  updateHoliday(id: number, holiday: Partial<Holiday>): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.holidaysUrl}${id}/`, holiday);
  }

  /** Deletes a holiday by ID. */
  deleteHoliday(id: number): Observable<any> {
    return this.http.delete(`${this.holidaysUrl}${id}/`);
  }
}
