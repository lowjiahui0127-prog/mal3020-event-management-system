import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem } from '../models/event.model';
import {
  AttendeeRegistration,
  RecentRegistration
} from '../models/registration.model';

export interface EventListResponse {
  success: boolean;
  count: number;
  data: EventItem[];
}

export interface EventDetailsResponse {
  success: boolean;
  data: EventItem;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface EventRegistrationsResponse {
  success: boolean;
  event: EventItem;
  count: number;
  data: AttendeeRegistration[];
}

export interface RecentRegistrationsResponse {
  success: boolean;
  count: number;
  data: RecentRegistration[];
}

// Fields an organiser can send when creating or editing an event
export interface EventPayload {
  title: string;
  description: string;
  date: string;
  endDate: string;
  location: string;
  imageUrl: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class EventApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/events';

  // Public
  getEvents(): Observable<EventListResponse> {
    return this.http.get<EventListResponse>(this.baseUrl);
  }

  getEventById(id: string): Observable<EventDetailsResponse> {
    return this.http.get<EventDetailsResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`
    );
  }

  // Organiser only
  getMyEvents(): Observable<EventListResponse> {
    return this.http.get<EventListResponse>(`${this.baseUrl}/mine`);
  }

  getRecentRegistrations(): Observable<RecentRegistrationsResponse> {
    return this.http.get<RecentRegistrationsResponse>(
      `${this.baseUrl}/mine/recent-registrations`
    );
  }

  getEventRegistrations(id: string): Observable<EventRegistrationsResponse> {
    return this.http.get<EventRegistrationsResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}/registrations`
    );
  }

  createEvent(payload: EventPayload): Observable<EventDetailsResponse> {
    return this.http.post<EventDetailsResponse>(this.baseUrl, payload);
  }

  updateEvent(
    id: string,
    changes: Partial<EventPayload>
  ): Observable<EventDetailsResponse> {
    return this.http.put<EventDetailsResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      changes
    );
  }

  deleteEvent(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`
    );
  }
}