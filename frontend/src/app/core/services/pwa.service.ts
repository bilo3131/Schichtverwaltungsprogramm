import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any;

  constructor(
    private swUpdate: SwUpdate,
    private logger: LoggerService
  ) {
    this.checkForUpdates();
  }

  /** Returns true if the PWA install prompt is available. */
  get canInstall(): boolean {
    return !!this.promptEvent;
  }

  /**
   * Subscribes to service worker version events.
   * Prompts the user to reload when a new version is ready.
   */
  checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map(evt => ({ current: evt.currentVersion, available: evt.latestVersion }))
      )
      .subscribe(() => {
        if (confirm('Neue Version verfügbar. Jetzt aktualisieren?')) {
          window.location.reload();
        }
      });
  }

  /** Captures the browser's `beforeinstallprompt` event for later use. */
  checkForInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.promptEvent = e;
    });
  }

  /** Shows the PWA install prompt if one has been captured. */
  showInstallPrompt(): void {
    if (!this.promptEvent) return;
    this.promptEvent.prompt();
    this.promptEvent.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') this.logger.info('PWA installed');
      this.promptEvent = null;
    });
  }
}
