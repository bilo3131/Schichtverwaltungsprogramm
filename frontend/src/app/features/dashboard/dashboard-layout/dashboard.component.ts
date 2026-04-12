import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DepartmentService } from '../../../core/services/department.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { PwaService } from '../../../core/services/pwa.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { InactivityService } from '../../../core/services/inactivity.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { TutorialDialogComponent } from '../../../shared/dialogs/tutorial-dialog/tutorial-dialog.component';
import type { User, Department, Notification } from '../../../core/models';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  roles: string[];
  divider?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatSelectModule,
    MatBadgeModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isMobile = false;
  sidenavOpened = true;
  isDarkMode = false;
  departments: Department[] = [];
  notifications: Notification[] = [];
  unreadCount = 0;
  currentTier: string = '';
  showDemoBanner = false;
  currentYear = new Date().getFullYear();
  private lastUserId: number | null = null; // Tracke die aktuelle User-ID
  private breakpointSub?: Subscription;
  
  get selectedDepartmentId(): number | 'all' {
    return this.dashboardFilterService.selectedDepartmentId$.value;
  }
  
  set selectedDepartmentId(value: number | 'all') {
    this.dashboardFilterService.setDepartmentFilter(value);
  }

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
    {
      label: 'Kalender',
      icon: 'calendar_month',
      route: '/calendar',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
    {
      label: 'Schichtplan',
      icon: 'calendar_today',
      route: '/shifts',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
    {
      label: 'Schichten',
      icon: 'category',
      route: '/shift-types',
      roles: ['admin', 'hr', 'department_manager'],
      divider: true
    },
    {
      label: 'Personal',
      icon: 'people',
      route: '/employees',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader']
    },
    {
      label: 'Qualifikationen',
      icon: 'verified',
      route: '/qualifications',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'],
      divider: true
    },
    {
      label: 'Urlaub',
      icon: 'beach_access',
      route: '/vacations',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
    {
      label: 'Abwesenheiten',
      icon: 'sick',
      route: '/absences',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'],
      divider: true
    },
    {
      label: 'Abteilungen',
      icon: 'corporate_fare',
      route: '/departments',
      roles: ['admin', 'hr']
    },
    {
      label: 'AGB',
      icon: 'description',
      route: '/terms',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
    {
      label: 'Datenschutz',
      icon: 'policy',
      route: '/privacy-policy',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
    {
      label: 'Impressum',
      icon: 'gavel',
      route: '/imprint',
      roles: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee']
    },
  ];

  constructor(
    public authService: AuthService,
    private themeService: ThemeService,
    private router: Router,
    private departmentService: DepartmentService,
    private dashboardFilterService: DashboardFilterService,
    public pwaService: PwaService,
    private notificationService: NotificationService,
    private subscriptionService: SubscriptionService,
    private inactivityService: InactivityService,
    private tutorialService: TutorialService,
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.breakpointSub = this.breakpointObserver
      .observe(['(max-width: 767px)'])
      .subscribe(result => {
        this.isMobile = result.matches;
        this.sidenavOpened = !result.matches;
      });

    this.pwaService.checkForInstallPrompt();
    
    // Starte Inaktivitäts-Überwachung
    this.inactivityService.startMonitoring();
    
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Wenn sich die User-ID ändert (neuer Login), setze Tutorial-Flag zurück
      if (user && this.lastUserId !== null && this.lastUserId !== user.id) {
        this.tutorialService.resetSessionFlag();
      }
      
      // Aktualisiere die getrackte User-ID
      if (user) {
        this.lastUserId = user.id;
      } else {
        this.lastUserId = null;
        this.tutorialService.resetSessionFlag(); // Bei Logout auch zurücksetzen
      }
      
      // Prüfe, ob Tutorial angezeigt werden soll (nur einmal pro User-Session!)
      if (user && !user.tutorial_completed && !this.tutorialService.hasTutorialBeenShownInSession()) {
        this.tutorialService.markTutorialAsShownInSession();
        this.showTutorial(user.role);
      }
      
      // Lade Abteilungen für Admin/HR/Department Manager
      if (user && ['admin', 'hr', 'department_manager'].includes(user.role)) {
        this.loadDepartments();
      }
      
      // Lade Benachrichtigungen
      if (user) {
        this.loadNotifications();
        this.requestNotificationPermission();
      }
      
      // Lade Subscription-Info für Admins
      if (user && user.role === 'admin') {
        this.loadSubscriptionInfo();
      }

      // Subscription frisch laden (kein Cache) oder Banner sofort zurücksetzen
      if (user) {
        this.subscriptionService.loadSubscription();
      } else {
        this.showDemoBanner = false;
      }
    });

    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.subscriptionService.getCurrentSubscription().subscribe(subscription => {
      this.showDemoBanner = !!subscription?.company_name?.includes('(Demo)');
    });
  }

  showTutorial(role: string): void {
    // Kleiner Delay, damit der User die UI kurz sieht
    setTimeout(() => {
      // Doppelte Sicherheit: Prüfe nochmal, ob bereits ein Tutorial-Dialog geöffnet ist
      if (this.dialog.openDialogs.some(dialog => dialog.componentInstance instanceof TutorialDialogComponent)) {
        return;
      }
      
      const dialogRef = this.dialog.open(TutorialDialogComponent, {
        data: { role },
        width: '650px',
        maxWidth: '95vw',
        disableClose: false,
        panelClass: 'tutorial-dialog-container'
      });

      dialogRef.afterClosed().subscribe((result) => {
        // Tutorial wurde abgeschlossen oder übersprungen
        if (result?.shouldRefreshUser) {
          // Lade aktuelle User-Daten neu, damit tutorial_completed aktualisiert wird
          this.authService.getCurrentUser().subscribe();
        }
      });
    }, 500);
  }

  restartTutorial(): void {
    if (this.currentUser) {
      this.dialog.open(TutorialDialogComponent, {
        data: { role: this.currentUser.role },
        width: '650px',
        maxWidth: '95vw',
        disableClose: false,
        panelClass: 'tutorial-dialog-container'
      });
      // Kein User-Refresh nötig beim manuellen Neustart
    }
  }

  loadSubscriptionInfo(): void {
    this.subscriptionService.getLimits().subscribe(limits => {
      if (limits) {
        this.currentTier = limits.tier_display;
      }
    });
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
      }
    });
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = (data.results || data).slice(0, 10); // Zeige nur letzte 10
      }
    });
    
    this.notificationService.getUnreadCount().subscribe({
      next: (data) => {
        this.unreadCount = data.unread_count;
      }
    });
  }

  requestNotificationPermission(): void {
    this.notificationService.requestPushPermission();
  }

  markAsRead(notification: Notification): void {
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.is_read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
      }
    });
  }

  deleteNotification(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.is_read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        this.notifications = this.notifications.filter(n => n.id !== id);
      }
    });
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'shift_created': 'add_circle',
      'shift_updated': 'update',
      'shift_deleted': 'remove_circle',
      'vacation_approved': 'check_circle',
      'vacation_rejected': 'cancel',
      'vacation_request': 'inbox'
    };
    return icons[type] || 'notifications';
  }

  getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      'shift_created': 'primary',
      'shift_updated': 'accent',
      'shift_deleted': 'warn',
      'vacation_approved': 'primary',
      'vacation_rejected': 'warn',
      'vacation_request': 'accent'
    };
    return colors[type] || '';
  }

  hasAccess(roles: string[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }

  getRoleLabel(role: string | undefined): string {
    if (!role) return 'Mitarbeiter';
    const labels: Record<string, string> = {
      'admin': 'Administrator',
      'hr': 'Personalwesen',
      'department_manager': 'Abteilungsleiter',
      'team_leader': 'Teamleiter',
      'group_leader': 'Gruppenleiter',
      'employee': 'Mitarbeiter'
    };
    return labels[role] || 'Mitarbeiter';
  }

  logout(): void {
    this.inactivityService.stopMonitoring();
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  closeSidenavOnMobile(): void {
    if (this.isMobile) {
      this.sidenavOpened = false;
    }
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
  }
}
