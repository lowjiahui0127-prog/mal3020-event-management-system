import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

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

  fullName = '';
  email = '';
  password = '';

  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

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

    // TODO: Connect to backend registration API
    this.errorMessage.set(
      'Account registration is not connected yet. Please try again later.'
    );
  }
}