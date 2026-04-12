import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  /** Logs general information. Suppressed in production. */
  log(...args: any[]): void {
    if (environment.enableLogging) console.log(...args);
  }

  /** Logs warnings. Suppressed in production. */
  warn(...args: any[]): void {
    if (environment.enableLogging) console.warn(...args);
  }

  /** Logs errors. Always active, even in production. */
  error(...args: any[]): void {
    console.error(...args);
  }

  /** Logs informational messages. Suppressed in production. */
  info(...args: any[]): void {
    if (environment.enableLogging) console.info(...args);
  }
}
