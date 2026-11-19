import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../services/auth.service';
import { ATTENDEE, TEST_ROUTES, fakeToken, storeSession } from '../testing/auth-fixtures';
import { authInterceptor } from './auth.interceptor';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(TEST_ROUTES),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting()
    ]
  });

  return {
    client: TestBed.inject(HttpClient),
    http: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService)
  };
}

describe('authInterceptor', () => {
  beforeEach(() => localStorage.clear());

  it('adds the token to requests for our own API', () => {
    const token = fakeToken(3600);
    storeSession(token, ATTENDEE);
    const { client, http } = setup();

    client.get('/api/events').subscribe();

    const request = http.expectOne('/api/events');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush({});
  });

  it('does not leak the token to other websites', () => {
    storeSession(fakeToken(3600), ATTENDEE);
    const { client, http } = setup();

    client.get('https://example.com/data').subscribe();

    const request = http.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('sends no header when nobody is logged in', () => {
    const { client, http } = setup();

    client.get('/api/events').subscribe();

    const request = http.expectOne('/api/events');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('logs the user out when the server rejects the token', () => {
    storeSession(fakeToken(3600), ATTENDEE);
    const { client, http, auth } = setup();

    client.get('/api/registrations/mine').subscribe({ error: () => undefined });
    http
      .expectOne('/api/registrations/mine')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
  });

  it('keeps the session when a login attempt is rejected', () => {
    storeSession(fakeToken(3600), ATTENDEE);
    const { client, http, auth } = setup();

    client.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    http
      .expectOne('/api/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(true);
  });
});