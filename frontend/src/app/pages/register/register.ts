import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { switchMap, tap } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../../utils/http-error';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, FontAwesomeModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly faCalendarDays = faCalendarDays;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;

  fullName = '';
  email = '';
  password = '';

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.fullName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage.set('Please complete all required fields.');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('Your password must contain at least 8 characters.');
      return;
    }

    const email = this.email.trim();
    const password = this.password;

    this.submitting.set(true);

    // The role is never sent: the server always creates an attendee.
    this.auth
      .register(this.fullName.trim(), email, password)
      .pipe(
        tap(() => this.successMessage.set('Account created. Signing you in...')),
        switchMap(() => this.auth.login(email, password))
      )
      .subscribe({
        next: () => {
          this.auth.redirectAfterLogin(
            this.route.snapshot.queryParamMap.get('returnUrl')
          );
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.successMessage.set('');
          this.errorMessage.set(
            getErrorMessage(error, 'Unable to create your account. Please try again.')
          );
        }
      });
  }
}