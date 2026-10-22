import { Routes } from '@angular/router';
import { EventList } from './pages/event-list/event-list';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'events',
    pathMatch: 'full'
  },
  {
    path: 'events',
    component: EventList
  }
];