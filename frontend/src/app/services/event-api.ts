import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem } from '../models/event.model';

export interface EventListResponse {
  success: boolean;
  count: number;
  data: EventItem[];
}

@Injectable({ 
    providedIn: 'root' 
})
export class EventApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/events';

  getEvents(): Observable<EventListResponse> {
    return this.http.get<EventListResponse>(this.baseUrl);
  }
}