import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../utils/http-error';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, FontAwesomeModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly faCalendarDays = faCalendarDays;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;

  email = '';
  password = '';

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    this.errorMessage.set('');

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Please enter your email address and password.');
      return;
    }

    this.submitting.set(true);

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.auth.redirectAfterLogin(
          this.route.snapshot.queryParamMap.get('returnUrl')
        );
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          getErrorMessage(error, 'Unable to log in. Please try again.')
        );
      }
    });
  }
}