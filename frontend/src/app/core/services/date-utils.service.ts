import { Injectable } from '@angular/core';

/**
 * Utility service for date and time formatting operations.
 * Centralizes all date formatting logic to follow DRY principle.
 */
@Injectable({
  providedIn: 'root'
})
export class DateUtilsService {
  
  /**
   * Formats a Date object to ISO format (YYYY-MM-DD).
   * Used for API requests and database storage.
   * @param date - The date to format
   * @returns Formatted date string in YYYY-MM-DD format
   */
  formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats a Date object to German format (DD.MM.YYYY).
   * Used for display purposes in the UI.
   * @param date - The date to format
   * @returns Formatted date string in DD.MM.YYYY format
   */
  formatDateDE(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Formats a Date object to time string for HTML time input (HH:MM).
   * @param date - The date object containing time
   * @returns Formatted time string in HH:MM format
   */
  formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Formats a date string from backend to German locale format.
   * @param dateStr - ISO date string from backend
   * @returns Formatted date string in German locale
   */
  formatDateFromString(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formats a date string from backend to German locale with time.
   * @param dateStr - ISO datetime string from backend
   * @returns Formatted datetime string in German locale
   */
  formatDateTimeFromString(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Combines a date and time string into an ISO datetime string.
   * @param date - The date component
   * @param time - The time string in HH:MM format
   * @returns ISO datetime string
   */
  combineDateAndTime(date: Date, time: string): string {
    const [hours, minutes] = time.split(':');
    const combined = new Date(date);
    combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return combined.toISOString();
  }

  /**
   * Extracts time string from an ISO datetime string.
   * @param datetime - ISO datetime string
   * @returns Time string in HH:MM format
   */
  extractTime(datetime: string): string {
    const date = new Date(datetime);
    return this.formatTimeForInput(date);
  }
}
