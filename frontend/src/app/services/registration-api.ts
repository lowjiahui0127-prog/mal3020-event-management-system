import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegistrationItem } from '../models/registration.model';

export interface RegistrationListResponse {
  success: boolean;
  count: number;
  data: RegistrationItem[];
}

export interface RegistrationResponse {
  success: boolean;
  message?: string;
  data: RegistrationItem;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/registrations';

  getMine(): Observable<RegistrationListResponse> {
    return this.http.get<RegistrationListResponse>(`${this.baseUrl}/mine`);
  }

  getById(id: string): Observable<RegistrationResponse> {
    return this.http.get<RegistrationResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`
    );
  }

  register(eventId: string): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(this.baseUrl, { eventId });
  }

  cancel(id: string): Observable<RegistrationResponse> {
    return this.http.patch<RegistrationResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}/cancel`,
      {}
    );
  }
}