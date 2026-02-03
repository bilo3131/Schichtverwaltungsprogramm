import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { SubscriptionService, Subscription, SubscriptionLimits } from '../../core/services/subscription.service';

@Component({
  selector: 'app-subscription-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    MatChipsModule
  ],
  templateUrl: './subscription-status.component.html',
  styleUrls: ['./subscription-status.component.scss']
})
export class SubscriptionStatusComponent implements OnInit {
  subscription: Subscription | null = null;
  limits: SubscriptionLimits | null = null;

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    this.subscriptionService.getCurrentSubscription().subscribe(sub => {
      this.subscription = sub;
    });

    this.subscriptionService.getLimits().subscribe(limits => {
      this.limits = limits;
    });
  }

  getEmployeePercentage(): number {
    if (!this.limits || this.limits.employees.unlimited) return 0;
    return (this.limits.employees.current / this.limits.employees.max) * 100;
  }

  getDepartmentPercentage(): number {
    if (!this.limits || this.limits.departments.unlimited) return 0;
    return (this.limits.departments.current / this.limits.departments.max) * 100;
  }

  getTierColor(tier: string): string {
    switch (tier) {
      case 'starter': return 'accent';
      case 'pro': return 'primary';
      case 'business': return 'warn';
      default: return '';
    }
  }

  refresh(): void {
    this.subscriptionService.loadSubscription();
  }
}
