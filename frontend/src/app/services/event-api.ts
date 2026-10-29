import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem } from '../models/event.model';

export interface EventListResponse {
  success: boolean;
  count: number;
  data: EventItem[];
}

export interface EventDetailsResponse {
  success: boolean;
  data: EventItem;
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

  getEventById(id: string): Observable<EventDetailsResponse> {
    return this.http.get<EventDetailsResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`
    );
  }
}
