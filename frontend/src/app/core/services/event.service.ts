import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import type { Event, EventFormData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = `${getApiUrl('SHIFTS')}/events/`;

  constructor(private http: HttpClient) {}

  getEvents(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  getEvent(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}${id}/`);
  }

  createEvent(eventData: EventFormData): Observable<Event> {
    return this.http.post<Event>(this.apiUrl, eventData);
  }

  updateEvent(id: number, eventData: Partial<EventFormData>): Observable<Event> {
    return this.http.patch<Event>(`${this.apiUrl}${id}/`, eventData);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
