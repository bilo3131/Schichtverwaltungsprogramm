export interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  /** ID or label of the sidenav item to highlight during this step. */
  sidenavItem?: string;
}

/** Tutorial steps shown to admin and HR users. */
export const HR_STEPS: TutorialStep[] = [
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

/** Tutorial steps shown to department managers. */
export const DEPARTMENT_MANAGER_STEPS: TutorialStep[] = [
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

/** Tutorial steps shown to team leaders and group leaders. */
export const TEAM_LEADER_STEPS: TutorialStep[] = [
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

/** Tutorial steps shown to regular employees. */
export const EMPLOYEE_STEPS: TutorialStep[] = [
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

/** Maps a user role to its corresponding tutorial step list. */
export const TUTORIAL_STEPS_BY_ROLE: Record<string, TutorialStep[]> = {
  admin: HR_STEPS,
  hr: HR_STEPS,
  department_manager: DEPARTMENT_MANAGER_STEPS,
  team_leader: TEAM_LEADER_STEPS,
  group_leader: TEAM_LEADER_STEPS,
  employee: EMPLOYEE_STEPS
};
