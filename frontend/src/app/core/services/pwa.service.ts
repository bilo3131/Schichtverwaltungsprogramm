import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any;

  constructor(private swUpdate: SwUpdate) {
    this.checkForUpdates();
  }

  checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map(evt => ({
          type: 'UPDATE_AVAILABLE',
          current: evt.currentVersion,
          available: evt.latestVersion,
        }))
      )
      .subscribe(() => {
        if (confirm('Neue Version verfügbar. Jetzt aktualisieren?')) {
          window.location.reload();
        }
      });
  }

  checkForInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.promptEvent = e;
    });
  }

  showInstallPrompt(): void {
    if (this.promptEvent) {
      this.promptEvent.prompt();
      this.promptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA wurde installiert');
        }
        this.promptEvent = null;
      });
    }
  }

  get canInstall(): boolean {
    return !!this.promptEvent;
  }
}
