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
  selector: 'app-login',
  imports: [FormsModule, RouterLink, FontAwesomeModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  readonly faCalendarDays = faCalendarDays;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;

  email = '';
  password = '';

  readonly showPassword = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    this.errorMessage.set('');

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set(
        'Please enter your email address and password.'
      );
      return;
    }

    // TODO: Connect to the backend login API.
    this.errorMessage.set(
      'Login authentication has not been connected yet.'
    );
  }
}
