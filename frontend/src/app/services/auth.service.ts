import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, UserRole } from '../models/user.model';

interface LoginResponse {
  success: boolean;
  data: { token: string; user: User };
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: User;
}

interface StoredSession {
  token: string;
  user: User;
}

const TOKEN_KEY = 'eventhub.token';
const USER_KEY = 'eventhub.user';

// Reads the "exp" claim so an expired token is treated as logged out
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function loadSession(): StoredSession | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);

    if (!token || !rawUser || isTokenExpired(token)) {
      return null;
    }

    return { token, user: JSON.parse(rawUser) as User };
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = '/api/auth';

  private readonly session = signal<StoredSession | null>(loadSession());

  readonly token = computed(() => this.session()?.token ?? null);
  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly role = computed<UserRole | null>(
    () => this.currentUser()?.role ?? null
  );
  readonly isOrganiser = computed(() => this.role() === 'organiser');

  register(
    name: string,
    email: string,
    password: string
  ): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, {
      name,
      email,
      password
    });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this.setSession(res.data.token, res.data.user)));
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/events');
  }

  // Called by the interceptor when the server rejects our token
  handleUnauthorized(): void {
    this.clearSession();

    if (!this.router.url.startsWith('/login')) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
    }
  }

  // After login: go back to where the user came from, or to their home page
  redirectAfterLogin(returnUrl: string | null): void {
    // Only allow in-app paths (prevents open redirects)
    const safeUrl =
      returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : null;

    const home = this.isOrganiser() ? '/organiser/dashboard' : '/events';

    void this.router.navigateByUrl(safeUrl ?? home);
  }

  private setSession(token: string, user: User): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Storage unavailable: the session still works until the page reloads
    }

    this.session.set({ token, user });
  }

  private clearSession(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }

    this.session.set(null);
  }
}