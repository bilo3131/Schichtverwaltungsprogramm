import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SubscriptionService, Subscription, SubscriptionLimits } from '../../core/services/subscription.service';
import { SubscriptionStatusComponent } from './subscription-status.component';

@Component({
  selector: 'app-subscription-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    SubscriptionStatusComponent
  ],
  templateUrl: './subscription-management.component.html',
  styleUrls: ['./subscription-management.component.scss']
})
export class SubscriptionManagementComponent implements OnInit {
  subscription: Subscription | null = null;
  limits: SubscriptionLimits | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSubscription();
  }

  loadSubscription(): void {
    this.subscriptionService.getCurrentSubscription().subscribe(sub => {
      this.subscription = sub;
    });
    
    this.subscriptionService.getLimits().subscribe(limits => {
      this.limits = limits;
    });
  }

  upgradeTo(tier: 'starter' | 'pro' | 'business'): void {
    if (!this.subscription) return;

    // Für Starter-Downgrade: direkte API-Anfrage ohne Stripe
    if (tier === 'starter') {
      this.subscriptionService.upgrade(this.subscription.id, tier).subscribe({
        next: () => {
          this.snackBar.open('Abonnement erfolgreich aktualisiert!', 'Schließen', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadSubscription();
        },
        error: (error) => {
          this.snackBar.open(
            error.error?.detail || 'Fehler beim Downgrade',
            'Schließen',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      });
      return;
    }

    // Für Pro und Business: Stripe Checkout starten
    this.subscriptionService.createCheckoutSession(tier).subscribe({
      next: (response) => {
        window.location.href = response.checkout_url;
      },
      error: (error) => {
        const message = error.error?.detail || 'Fehler beim Starten der Zahlung. Bitte versuche es erneut.';
        this.snackBar.open(message, 'Schließen', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  getTierInfo(tier: 'starter' | 'pro' | 'business') {
    return this.subscriptionService.getTierInfo(tier);
  }

  canUpgrade(targetTier: 'starter' | 'pro' | 'business'): boolean {
    if (!this.subscription) return false;
    
    const tierOrder = { starter: 1, pro: 2, business: 3 };
    return tierOrder[targetTier] > tierOrder[this.subscription.tier];
  }

  canDowngrade(targetTier: 'starter' | 'pro' | 'business'): boolean {
    if (!this.subscription) return false;
    
    const tierOrder = { starter: 1, pro: 2, business: 3 };
    return tierOrder[targetTier] < tierOrder[this.subscription.tier];
  }
}
