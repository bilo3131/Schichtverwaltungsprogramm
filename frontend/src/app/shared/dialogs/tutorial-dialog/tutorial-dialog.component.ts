import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TutorialService, TutorialStep } from '../../../core/services/tutorial.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-tutorial-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './tutorial-dialog.component.html',
  styleUrls: ['./tutorial-dialog.component.scss']
})
export class TutorialDialogComponent implements OnInit {
  steps: TutorialStep[] = [];
  currentStepIndex = 0;

  constructor(
    public dialogRef: MatDialogRef<TutorialDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { role: string },
    private tutorialService: TutorialService,
    private themeService: ThemeService
  ) { }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode;
  }

  ngOnInit(): void {
    this.steps = this.tutorialService.getTutorialSteps(this.data.role);
  }

  get currentStep(): TutorialStep {
    return this.steps[this.currentStepIndex];
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  get progress(): number {
    return ((this.currentStepIndex + 1) / this.steps.length) * 100;
  }

  nextStep(): void {
    if (!this.isLastStep) {
      this.currentStepIndex++;
    }
  }

  previousStep(): void {
    if (!this.isFirstStep) {
      this.currentStepIndex--;
    }
  }

  skipTutorial(): void {
    this.tutorialService.completeTutorial().subscribe(() => {
      this.dialogRef.close({ completed: false, shouldRefreshUser: true });
    });
  }

  completeTutorial(): void {
    this.tutorialService.completeTutorial().subscribe(() => {
      this.dialogRef.close({ completed: true, shouldRefreshUser: true });
    });
  }
}
