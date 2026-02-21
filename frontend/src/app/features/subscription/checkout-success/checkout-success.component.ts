import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionService } from '../../../core/services/subscription.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="success-container">
      <mat-card class="success-card">
        <mat-card-content>

          <div *ngIf="loading" class="loading-state">
            <mat-spinner diameter="48"></mat-spinner>
            <p>Zahlung wird überprüft...</p>
          </div>

          <div *ngIf="!loading && success" class="success-state">
            <mat-icon class="success-icon">check_circle</mat-icon>
            <h2>Zahlung erfolgreich!</h2>
            <p>Ihr Abonnement wurde aktiviert. Vielen Dank!</p>
            <p class="tier-info" *ngIf="tierName">Aktives Paket: <strong>{{ tierName }}</strong></p>
            <button mat-raised-button color="primary" routerLink="/dashboard" class="cta-button">
              <mat-icon>dashboard</mat-icon>
              Zum Dashboard
            </button>
          </div>

          <div *ngIf="!loading && !success" class="error-state">
            <mat-icon class="error-icon">error</mat-icon>
            <h2>Zahlung konnte nicht bestätigt werden</h2>
            <p>{{ errorMessage }}</p>
            <button mat-raised-button color="primary" routerLink="/subscription" class="cta-button">
              Zurück zur Abonnement-Verwaltung
            </button>
          </div>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: -2rem;
    }

    .success-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: calc(100vh - 64px);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
      box-sizing: border-box;
      overflow: hidden;
    }

    .success-card {
      max-width: 480px;
      width: 100%;
      padding: 2rem;
      text-align: center;
    }

    .loading-state, .success-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .success-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #4caf50;
    }

    .error-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
    }

    h2 { margin: 0; }

    .tier-info {
      color: rgba(0,0,0,0.6);
      font-size: 0.9rem;
    }

    .cta-button {
      margin-top: 8px;
    }
  `]
})
export class CheckoutSuccessComponent implements OnInit {
  loading = true;
  success = false;
  tierName = '';
  errorMessage = 'Bitte kontaktiere den Support, falls das Problem weiterhin besteht.';

  private tierLabels: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!sessionId) {
      this.loading = false;
      this.errorMessage = 'Ungültige Sitzung. Bitte versuche es erneut.';
      return;
    }

    this.subscriptionService.verifyCheckoutSuccess(sessionId).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = true;
        this.tierName = this.tierLabels[response.tier] || response.tier;
        // Subscription-Daten neu laden
        this.subscriptionService.loadSubscription();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.detail || this.errorMessage;
      }
    });
  }
}
