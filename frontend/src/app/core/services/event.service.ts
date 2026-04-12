import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import { buildHttpParams } from '../utils/http-params.util';
import type { Event, EventFormData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly apiUrl = `${getApiUrl('SHIFTS')}/events/`;

  constructor(private http: HttpClient) {}

  /** Fetches all events, with optional filter params (e.g. date range). */
  getEvents(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(this.apiUrl, { params: buildHttpParams(params) });
  }

  /** Fetches a single event by ID. */
  getEvent(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}${id}/`);
  }

  /** Creates a new event. */
  createEvent(eventData: EventFormData): Observable<Event> {
    return this.http.post<Event>(this.apiUrl, eventData);
  }

  /** Partially updates an existing event. */
  updateEvent(id: number, eventData: Partial<EventFormData>): Observable<Event> {
    return this.http.patch<Event>(`${this.apiUrl}${id}/`, eventData);
  }

  /** Deletes an event by ID. */
  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
