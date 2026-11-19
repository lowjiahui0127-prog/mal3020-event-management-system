import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ATTENDEE,
  ORGANISER,
  TEST_ROUTES,
  fakeToken,
  storeSession
} from '../testing/auth-fixtures';
import { AuthService } from './auth.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter(TEST_ROUTES), provideHttpClient(), provideHttpClientTesting()]
  });

  return {
    auth: TestBed.inject(AuthService),
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());

  it('starts logged out when nothing is stored', () => {
    const { auth } = setup();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.role()).toBeNull();
  });

  it('stores the session after a successful login', () => {
    const { auth, http } = setup();
    const token = fakeToken(3600);

    auth.login('attendee@eventhub.test', 'password123').subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'attendee@eventhub.test',
      password: 'password123'
    });
    request.flush({ success: true, data: { token, user: ATTENDEE } });

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.role()).toBe('attendee');
    expect(auth.token()).toBe(token);
    expect(localStorage.getItem('eventhub.token')).toBe(token);
    http.verify();
  });

  it('never sends a role when registering (the server decides)', () => {
    const { auth, http } = setup();

    auth.register('Alice Tan', 'alice@example.test', 'password123').subscribe();

    const request = http.expectOne('/api/auth/register');
    expect(request.request.body).toEqual({
      name: 'Alice Tan',
      email: 'alice@example.test',
      password: 'password123'
    });
    http.verify();
  });

  it('restores a valid session from storage', () => {
    storeSession(fakeToken(3600), ORGANISER);

    const { auth } = setup();

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isOrganiser()).toBe(true);
  });

  it('ignores an expired token', () => {
    storeSession(fakeToken(-60), ATTENDEE);

    const { auth } = setup();

    expect(auth.isLoggedIn()).toBe(false);
  });

  it('clears the session on logout', () => {
    storeSession(fakeToken(3600), ATTENDEE);
    const { auth } = setup();

    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('eventhub.token')).toBeNull();
  });

  it('sends an organiser home to the dashboard and blocks unsafe return URLs', () => {
    storeSession(fakeToken(3600), ORGANISER);
    const { auth, router } = setup();
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    auth.redirectAfterLogin('//evil.example/phish');
    expect(navigate).toHaveBeenLastCalledWith('/organiser/dashboard');

    auth.redirectAfterLogin('/events/abc123');
    expect(navigate).toHaveBeenLastCalledWith('/events/abc123');
  });
});