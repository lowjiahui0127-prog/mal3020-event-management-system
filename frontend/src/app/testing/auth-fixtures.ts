import { Component } from '@angular/core';
import { Routes } from '@angular/router';

import { User } from '../models/user.model';

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// A fake JWT that expires "secondsFromNow" seconds from now (the browser never checks the signature)
export function fakeToken(secondsFromNow: number): string {
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${base64Url({ alg: 'HS256' })}.${base64Url({ exp })}.signature`;
}

export const ATTENDEE: User = {
  _id: 'user-attendee',
  name: 'Demo Attendee',
  email: 'attendee@eventhub.test',
  role: 'attendee'
};

export const ORGANISER: User = {
  _id: 'user-organiser',
  name: 'Demo Organiser',
  email: 'organiser@eventhub.test',
  role: 'organiser'
};

// Put a logged-in session in storage before the AuthService is created
export function storeSession(token: string, user: User): void {
  localStorage.setItem('eventhub.token', token);
  localStorage.setItem('eventhub.user', JSON.stringify(user));
}

@Component({ template: '' })
export class BlankComponent {}

// Routes the guards and the service navigate to, so no navigation fails in a test
export const TEST_ROUTES: Routes = [
  { path: 'login', component: BlankComponent },
  { path: 'events', component: BlankComponent },
  { path: 'organiser/dashboard', component: BlankComponent }
];