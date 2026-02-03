import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, interval } from 'rxjs';
import { switchMap, startWith, filter } from 'rxjs/operators';
import type { Notification, Holiday } from '../models';
import { getApiUrl } from '../config/api.config';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = getApiUrl('SHIFTS');
  private readonly ENDPOINTS = {
    notifications: `${this.API_URL}/notifications/`,
    holidays: `${this.API_URL}/holidays/`,
  };

  private newNotificationSubject = new Subject<any>();
  public newNotification$ = this.newNotificationSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Polling nur starten wenn User authentifiziert ist
    this.startNotificationPolling();
  }

  private startNotificationPolling(): void {
    interval(30000) // 30 Sekunden
      .pipe(
        startWith(0),
        filter(() => this.authService.isAuthenticated), // Nur wenn authentifiziert
        switchMap(() => this.getUnreadCount())
      )
      .subscribe();
  }

  getNotifications(): Observable<any> {
    return this.http.get<any>(this.ENDPOINTS.notifications);
  }

  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.ENDPOINTS.notifications}unread_count/`);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.post<Notification>(`${this.ENDPOINTS.notifications}${id}/mark_read/`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.post<any>(`${this.ENDPOINTS.notifications}mark_all_read/`, {});
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.ENDPOINTS.notifications}${id}/`);
  }

  // Holiday Methods
  getHolidays(startDate?: string, endDate?: string): Observable<any> {
    let params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    return this.http.get<any>(this.ENDPOINTS.holidays, { params });
  }

  createHoliday(holiday: Partial<Holiday>): Observable<Holiday> {
    return this.http.post<Holiday>(this.ENDPOINTS.holidays, holiday);
  }

  updateHoliday(id: number, holiday: Partial<Holiday>): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.ENDPOINTS.holidays}${id}/`, holiday);
  }

  deleteHoliday(id: number): Observable<any> {
    return this.http.delete(`${this.ENDPOINTS.holidays}${id}/`);
  }

  // Push Notification Permission
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Dieser Browser unterstützt keine Benachrichtigungen');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  showLocalNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png',
        ...options
      });
    }
  }
}
