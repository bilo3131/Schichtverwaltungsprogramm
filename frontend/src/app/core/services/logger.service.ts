import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  log(...args: any[]): void {
    if (environment.enableLogging) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    if (environment.enableLogging) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    // Errors sollten immer geloggt werden
    console.error(...args);
  }

  info(...args: any[]): void {
    if (environment.enableLogging) {
      console.info(...args);
    }
  }
}
