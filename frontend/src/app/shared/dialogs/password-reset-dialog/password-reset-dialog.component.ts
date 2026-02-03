import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-password-reset-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="primary">vpn_key</mat-icon>
      Passwort zurückgesetzt
    </h2>
    
    <mat-dialog-content>
      <div class="success-message">
        <mat-icon>check_circle</mat-icon>
        <p>Das Passwort wurde erfolgreich zurückgesetzt!</p>
      </div>
      
      <div class="employee-info">
        <h3>{{ data.employee_name }}</h3>
        <p class="username">Benutzername: <strong>{{ data.username }}</strong></p>
      </div>
      
      <div class="password-box">
        <label>Neues Passwort:</label>
        <div class="password-display">
          <span class="password">{{ data.new_password }}</span>
          <button mat-icon-button (click)="copyPassword()" matTooltip="Kopieren">
            <mat-icon>content_copy</mat-icon>
          </button>
        </div>
      </div>
      
      <div class="info-box">
        <mat-icon>info</mat-icon>
        <div>
          <strong>Wichtig:</strong>
          <p>Teilen Sie dem Mitarbeiter dieses Passwort mit. Er kann es nach dem Login unter "Passwort ändern" im User-Menü ändern.</p>
        </div>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="dialogRef.close()">
        Verstanden
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    
    .success-message {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background-color: #e8f5e9;
      border-radius: 4px;
      margin-bottom: 1.5rem;
      
      mat-icon {
        color: #4caf50;
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
      
      p {
        margin: 0;
        color: #2e7d32;
        font-weight: 500;
      }
    }
    
    .employee-info {
      margin-bottom: 1.5rem;
      
      h3 {
        margin: 0 0 0.5rem 0;
        color: #333;
      }
      
      .username {
        margin: 0;
        color: #666;
        
        strong {
          color: #1976d2;
        }
      }
    }
    
    .password-box {
      margin-bottom: 1.5rem;
      
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #666;
      }
      
      .password-display {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background-color: #f5f5f5;
        border: 2px solid #1976d2;
        border-radius: 4px;
        
        .password {
          flex: 1;
          font-family: 'Courier New', monospace;
          font-size: 1.5rem;
          font-weight: bold;
          color: #1976d2;
          letter-spacing: 2px;
        }
        
        button {
          flex-shrink: 0;
        }
      }
    }
    
    .info-box {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background-color: #e3f2fd;
      border-left: 4px solid #1976d2;
      border-radius: 4px;
      
      mat-icon {
        color: #1976d2;
        flex-shrink: 0;
      }
      
      div {
        flex: 1;
        
        strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #1565c0;
        }
        
        p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: #666;
        }
      }
    }
    
    mat-dialog-actions {
      padding: 1rem 1.5rem;
    }
    
    @media (prefers-color-scheme: dark) {
      .success-message {
        background-color: rgba(76, 175, 80, 0.1) !important;
        
        p {
          color: #81c784 !important;
        }
      }
      
      .employee-info {
        h3 {
          color: rgba(255, 255, 255, 0.87) !important;
        }
        
        .username {
          color: rgba(255, 255, 255, 0.6) !important;
          
          strong {
            color: #64b5f6 !important;
          }
        }
      }
      
      .password-box {
        label {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .password-display {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: #64b5f6 !important;
          
          .password {
            color: #64b5f6 !important;
          }
        }
      }
      
      .info-box {
        background-color: rgba(33, 150, 243, 0.1) !important;
        border-left-color: #64b5f6 !important;
        
        mat-icon {
          color: #64b5f6 !important;
        }
        
        div strong {
          color: #64b5f6 !important;
        }
        
        div p {
          color: rgba(255, 255, 255, 0.7) !important;
        }
      }
    }
  `]
})
export class PasswordResetDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PasswordResetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      employee_name: string;
      username: string;
      new_password: string;
    },
    private snackBar: MatSnackBar
  ) {}

  copyPassword(): void {
    navigator.clipboard.writeText(this.data.new_password).then(() => {
      this.snackBar.open('Passwort in Zwischenablage kopiert', 'OK', {
        duration: UI_CONSTANTS.SNACKBAR.DURATION,
        panelClass: ['success-snackbar']
      });
    });
  }
}
