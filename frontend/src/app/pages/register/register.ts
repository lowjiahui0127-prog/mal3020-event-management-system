import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faEye,
  faEyeSlash,
  faUser,
  faCalendarPlus
} from '@fortawesome/free-solid-svg-icons';

export type UserRole = 'attendee' | 'organiser';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, FontAwesomeModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  readonly faCalendarDays = faCalendarDays;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faUser = faUser;
  readonly faCalendarPlus = faCalendarPlus;

  fullName = '';
  email = '';
  password = '';
  role: UserRole = 'attendee';

  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  selectRole(selectedRole: UserRole): void {
    this.role = selectedRole;
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.fullName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage.set('Please complete all required fields.');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set(
        'Your password must contain at least 8 characters.'
      );
      return;
    }

    // TODO: Connect to backend registration API with this.role included
    this.errorMessage.set(
      'Account registration is not connected yet. Please try again later.'
    );
  }
}