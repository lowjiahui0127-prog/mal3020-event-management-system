
import { Routes } from '@angular/router';

import { EventList } from './pages/event-list/event-list';
import { EventDetails } from './pages/event-details/event-details';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { MyRegistrations } from './pages/my-registrations/my-registrations';
import { RegistrationDetails } from './pages/registration-details/registration-details';
import { OrganiserDashboard } from './pages/organiser-dashboard/organiser-dashboard';
import { EventManagement } from './pages/event-management/event-management';
import { CreateEvent } from './pages/create-event/create-event';
import { EditEvent } from './pages/edit-event/edit-event';
import { EventRegistrations } from './pages/event-registrations/event-registrations';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'events',
    pathMatch: 'full'
  },
  {
    path: 'events',
    component: EventList
  },
  {
    path: 'events/:id',
    component: EventDetails
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'my-registrations',
    component: MyRegistrations
  },
  {
    path: 'my-registrations/:id',
    component: RegistrationDetails
  },
  {
    path: 'organiser/dashboard',
    component: OrganiserDashboard
  },
  {
    path: 'organiser/events',
    component: EventManagement
  },
  {
    path: 'organiser/events/create',
    component: CreateEvent
  },
  {
    path: 'organiser/events/:id/edit',
    component: EditEvent
  },
  {
    path: 'organiser/events/:id/registrations',
    component: EventRegistrations
  },
  {
    path: '**',
    redirectTo: 'events'
  }
];
