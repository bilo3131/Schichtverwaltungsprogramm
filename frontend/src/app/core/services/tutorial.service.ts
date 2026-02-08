import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  sidenavItem?: string; // ID oder Text des Sidenav-Items zum Highlighten
}

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private apiUrl = `${environment.apiUrl}/api/v1/accounts/users`;
  private tutorialCompletedSubject = new BehaviorSubject<boolean>(false);
  public tutorialCompleted$ = this.tutorialCompletedSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Markiert das Tutorial als abgeschlossen
   */
  completeTutorial(): Observable<any> {
    return this.http.post(`${this.apiUrl}/complete_tutorial/`, {}).pipe(
      tap(() => this.tutorialCompletedSubject.next(true))
    );
  }

  /**
   * Gibt die Tutorial-Schritte basierend auf der Rolle zurück
   */
  getTutorialSteps(role: string): TutorialStep[] {
    switch (role) {
      case 'hr':
      case 'admin':
        return this.getHRSteps();
      case 'department_manager':
        return this.getDepartmentManagerSteps();
      case 'team_leader':
      case 'group_leader':
        return this.getTeamLeaderSteps();
      case 'employee':
        return this.getEmployeeSteps();
      default:
        return [];
    }
  }

  private getHRSteps(): TutorialStep[] {
    return [
      {
        title: '1. Abteilung erstellen',
        description: 'Erstellen Sie zunächst eine Abteilung für Ihre Organisation. Dies ist der erste Schritt zur Strukturierung Ihres Unternehmens.',
        icon: 'business',
        sidenavItem: 'Abteilungen'
      },
      {
        title: '2. Qualifikationen erstellen',
        description: 'Legen Sie Qualifikationen an, die für verschiedene Schichttypen erforderlich sind. Diese werden später Mitarbeitern und Schichttypen zugewiesen, um automatische Vorschläge bei der Schichtplanung zu erhalten.',
        icon: 'school',
        sidenavItem: 'Qualifikationen'
      },
      {
        title: '3. Mitarbeiter anlegen',
        description: 'Fügen Sie Ihre Mitarbeiter hinzu und weisen Sie ihnen die entsprechenden Qualifikationen zu.',
        icon: 'people',
        sidenavItem: 'Personal'
      },
      {
        title: '4. Schichttypen hinzufügen',
        description: 'Erstellen Sie Schichttypen mit Start- und Endzeiten. Die gesetzlichen Pausenzeiten werden automatisch berechnet:\n• Ab 6 Stunden: 30 Minuten Pause\n• Ab 9 Stunden: 45 Minuten Pause\n\nTragen Sie die erforderlichen Qualifikationen ein.',
        icon: 'schedule',
        sidenavItem: 'Schichttypen'
      },
      {
        title: '5. Schichtplan erstellen',
        description: 'Erstellen Sie Ihren Schichtplan unter Berücksichtigung des Arbeitszeitgesetzes:\n• Mindestens 11 Stunden Pause zwischen Schichten\n• Grau = Mindestwochenstunden erreicht\n• Gelb = Maximalwochenstunden überschritten\n• Rot = Mitarbeiter hat Abwesenheit\n• Orange Hintergrund (voll) = Unterbesetzung\n• Orange Hintergrund (gestrichelt) = Qualifikationen fehlen',
        icon: 'calendar_today',
        sidenavItem: 'Schichtplan'
      },
      {
        title: '6. Urlaub verwalten',
        description: 'Verwalten Sie Urlaubsanträge von Mitarbeitern. Als Vorgesetzter können Sie Anträge genehmigen, ablehnen, bearbeiten oder löschen.',
        icon: 'beach_access',
        sidenavItem: 'Urlaub'
      },
      {
        title: '7. Abwesenheiten eintragen',
        description: 'Tragen Sie alle Arten von Abwesenheiten ein: Krank, Urlaubswunsch, Kurzarbeit oder Sonstiges. Diese werden automatisch im Schichtplan berücksichtigt.',
        icon: 'event_busy',
        sidenavItem: 'Abwesenheiten'
      }
    ];
  }

  private getDepartmentManagerSteps(): TutorialStep[] {
    return [
      {
        title: '1. Qualifikationen erstellen',
        description: 'Legen Sie Qualifikationen an, die für verschiedene Schichttypen erforderlich sind. Diese werden später Mitarbeitern und Schichttypen zugewiesen, um automatische Vorschläge bei der Schichtplanung zu erhalten.',
        icon: 'school',
        sidenavItem: 'Qualifikationen'
      },
      {
        title: '2. Mitarbeiter-Qualifikationen zuweisen',
        description: 'Weisen Sie den Mitarbeitern Ihrer Abteilung die entsprechenden Qualifikationen zu.',
        icon: 'people',
        sidenavItem: 'Personal'
      },
      {
        title: '3. Schichttypen hinzufügen',
        description: 'Erstellen Sie Schichttypen mit Start- und Endzeiten. Die gesetzlichen Pausenzeiten werden automatisch berechnet:\n• Ab 6 Stunden: 30 Minuten Pause\n• Ab 9 Stunden: 45 Minuten Pause\n\nTragen Sie die erforderlichen Qualifikationen ein.',
        icon: 'schedule',
        sidenavItem: 'Schichttypen'
      },
      {
        title: '4. Schichtplan erstellen',
        description: 'Erstellen Sie Ihren Schichtplan unter Berücksichtigung des Arbeitszeitgesetzes:\n• Mindestens 11 Stunden Pause zwischen Schichten\n• Grau = Mindestwochenstunden erreicht\n• Gelb = Maximalwochenstunden überschritten\n• Rot = Mitarbeiter hat Abwesenheit\n• Orange Hintergrund (voll) = Unterbesetzung\n• Orange Hintergrund (gestrichelt) = Qualifikationen fehlen',
        icon: 'calendar_today',
        sidenavItem: 'Schichtplan'
      },
      {
        title: '5. Urlaub verwalten',
        description: 'Verwalten Sie Urlaubsanträge von Mitarbeitern. Als Vorgesetzter können Sie Anträge genehmigen, ablehnen, bearbeiten oder löschen.',
        icon: 'beach_access',
        sidenavItem: 'Urlaub'
      },
      {
        title: '6. Abwesenheiten eintragen',
        description: 'Tragen Sie alle Arten von Abwesenheiten ein: Krank, Urlaubswunsch, Kurzarbeit oder Sonstiges. Diese werden automatisch im Schichtplan berücksichtigt.',
        icon: 'event_busy',
        sidenavItem: 'Abwesenheiten'
      }
    ];
  }

  private getTeamLeaderSteps(): TutorialStep[] {
    return [
      {
        title: '1. Qualifikationen erstellen',
        description: 'Legen Sie Qualifikationen an, die für verschiedene Schichttypen erforderlich sind. Diese werden später Mitarbeitern und Schichttypen zugewiesen, um automatische Vorschläge bei der Schichtplanung zu erhalten.',
        icon: 'school',
        sidenavItem: 'Qualifikationen'
      },
      {
        title: '2. Mitarbeiter-Qualifikationen zuweisen',
        description: 'Weisen Sie den Mitarbeitern Ihres Teams die entsprechenden Qualifikationen zu.',
        icon: 'people',
        sidenavItem: 'Personal'
      },
      {
        title: '3. Schichtplan erstellen',
        description: 'Erstellen Sie Ihren Schichtplan unter Berücksichtigung des Arbeitszeitgesetzes:\n• Mindestens 11 Stunden Pause zwischen Schichten\n• Grau = Mindestwochenstunden erreicht\n• Gelb = Maximalwochenstunden überschritten\n• Rot = Mitarbeiter hat Abwesenheit\n• Orange Hintergrund (voll) = Unterbesetzung\n• Orange Hintergrund (gestrichelt) = Qualifikationen fehlen',
        icon: 'calendar_today',
        sidenavItem: 'Schichtplan'
      },
      {
        title: '4. Urlaub verwalten',
        description: 'Verwalten Sie Urlaubsanträge von Mitarbeitern. Als Vorgesetzter können Sie Anträge genehmigen, ablehnen, bearbeiten oder löschen.',
        icon: 'beach_access',
        sidenavItem: 'Urlaub'
      },
      {
        title: '5. Abwesenheiten eintragen',
        description: 'Tragen Sie alle Arten von Abwesenheiten ein: Krank, Urlaubswunsch, Kurzarbeit oder Sonstiges. Diese werden automatisch im Schichtplan berücksichtigt.',
        icon: 'event_busy',
        sidenavItem: 'Abwesenheiten'
      }
    ];
  }

  private getEmployeeSteps(): TutorialStep[] {
    return [
      {
        title: '1. Schichtplan ansehen',
        description: 'Sehen Sie Ihren veröffentlichten Schichtplan ein und laden Sie ihn als PDF herunter.',
        icon: 'calendar_today',
        sidenavItem: 'Schichtplan'
      },
      {
        title: '2. Urlaub beantragen',
        description: 'Beantragen Sie Urlaub für einen bestimmten Zeitraum. Ihr Vorgesetzter wird den Antrag genehmigen oder ablehnen. Sie können den Antrag anpassen oder löschen, solange noch keine Entscheidung getroffen wurde.',
        icon: 'beach_access',
        sidenavItem: 'Urlaub'
      }
    ];
  }
}
