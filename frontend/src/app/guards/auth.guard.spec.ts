import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  ATTENDEE,
  ORGANISER,
  TEST_ROUTES,
  fakeToken,
  storeSession
} from '../testing/auth-fixtures';
import { authGuard, guestGuard, roleGuard } from './auth.guard';

const route = {} as never;
const stateFor = (url: string) => ({ url }) as never;

function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter(TEST_ROUTES), provideHttpClient(), provideHttpClientTesting()]
  });

  return TestBed.inject(Router);
}

const toUrl = (router: Router, result: unknown) => router.serializeUrl(result as UrlTree);

describe('route guards', () => {
  beforeEach(() => localStorage.clear());

  it('sends a visitor to the login page and remembers where they were going', () => {
    const router = setup();

    const result = TestBed.runInInjectionContext(() =>
      authGuard(route, stateFor('/my-registrations'))
    );

    expect(toUrl(router, result)).toBe('/login?returnUrl=%2Fmy-registrations');
  });

  it('lets a logged-in user through', () => {
    storeSession(fakeToken(3600), ATTENDEE);
    setup();

    expect(TestBed.runInInjectionContext(() => authGuard(route, stateFor('/x')))).toBe(true);
  });

  it('keeps an attendee out of organiser pages', () => {
    storeSession(fakeToken(3600), ATTENDEE);
    const router = setup();

    const result = TestBed.runInInjectionContext(() =>
      roleGuard('organiser')(route, stateFor('/organiser/dashboard'))
    );

    expect(toUrl(router, result)).toBe('/events');
  });

  it('lets an organiser into organiser pages', () => {
    storeSession(fakeToken(3600), ORGANISER);
    setup();

    const result = TestBed.runInInjectionContext(() =>
      roleGuard('organiser')(route, stateFor('/organiser/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('sends a visitor who asks for a role page to login', () => {
    const router = setup();

    const result = TestBed.runInInjectionContext(() =>
      roleGuard('organiser')(route, stateFor('/organiser/dashboard'))
    );

    expect(toUrl(router, result)).toBe('/login?returnUrl=%2Forganiser%2Fdashboard');
  });

  it('sends a logged-in organiser away from the login page', () => {
    storeSession(fakeToken(3600), ORGANISER);
    const router = setup();

    const result = TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login')));

    expect(toUrl(router, result)).toBe('/organiser/dashboard');
  });
});