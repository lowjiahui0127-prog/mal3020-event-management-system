import { Routes } from '@angular/router';

import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard, guestGuard, roleGuard } from './guards/auth.guard';

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
  // Authentication pages: independent layout, visitors only
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    component: Register,
    canActivate: [guestGuard]
  },

  // Main application pages: shared Header and Footer
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        redirectTo: 'events',
        pathMatch: 'full'
      },

      // Public
      { path: 'events', component: EventList },
      { path: 'events/:id', component: EventDetails },

      // Attendee only
      {
        path: 'my-registrations',
        component: MyRegistrations,
        canActivate: [roleGuard('attendee')]
      },
      {
        path: 'my-registrations/:id',
        component: RegistrationDetails,
        canActivate: [roleGuard('attendee')]
      },

      // Organiser only (one guard for the whole group)
      {
        path: '',
        canActivate: [roleGuard('organiser')],
        children: [
          { path: 'organiser/dashboard', component: OrganiserDashboard },
          { path: 'organiser/events', component: EventManagement },
          { path: 'organiser/events/create', component: CreateEvent },
          { path: 'organiser/events/:id/edit', component: EditEvent },
          {
            path: 'organiser/events/:id/registrations',
            component: EventRegistrations
          }
        ]
      }
    ]
  },

  // Unknown URLs redirect to the event listing
  {
    path: '**',
    redirectTo: 'events'
  }
];