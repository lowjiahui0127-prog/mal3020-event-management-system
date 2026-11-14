import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { AuthService } from './auth.service';
import { ConnectionStatus, RealtimeMessage } from '../models/realtime.model';

const KNOWN_TYPES = new Set([
  'event:counts',
  'registration:created',
  'registration:cancelled'
]);

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private readonly auth = inject(AuthService);

  readonly status = signal<ConnectionStatus>('offline');

  private readonly incoming = new Subject<RealtimeMessage>();
  private readonly reopened = new Subject<void>();

  private socket: WebSocket | null = null;
  private listeners = 0;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private hasConnectedBefore = false;
  private lastToken: string | null = this.auth.token();

  /**
   * Live messages from the server. The connection opens when the first page
   * subscribes and closes when the last one unsubscribes.
   */
  readonly messages$ = new Observable<RealtimeMessage>((subscriber) => {
    const subscription = this.incoming.subscribe(subscriber);
    this.retain();

    return () => {
      subscription.unsubscribe();
      this.release();
    };
  });

  /** Fires when the connection comes back after a drop: re-fetch data to catch up. */
  readonly reconnected$ = this.reopened.asObservable();

  constructor() {
    // Logging in or out changes who the server should think we are
    effect(() => {
      const token = this.auth.token();

      if (token === this.lastToken) return;
      this.lastToken = token;

      untracked(() => {
        if (this.socket) this.restart();
      });
    });
  }

  private retain(): void {
    this.listeners++;

    if (this.listeners === 1) {
      this.open();
    }
  }

  private release(): void {
    this.listeners = Math.max(0, this.listeners - 1);

    if (this.listeners === 0) {
      this.shutdown();
    }
  }

  private open(): void {
    if (this.socket || typeof WebSocket === 'undefined') return;

    this.clearRetry();
    this.status.set('connecting');

    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${scheme}://${location.host}/ws`);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;

      this.attempts = 0;
      this.status.set('online');

      // Identify ourselves in a message (never in the URL, which ends up in logs)
      const token = this.auth.token();
      if (token) {
        socket.send(JSON.stringify({ type: 'auth', token }));
      }

      if (this.hasConnectedBefore) {
        this.reopened.next();
      }
      this.hasConnectedBefore = true;
    };

    socket.onmessage = (event: MessageEvent) => {
      const message = this.parse(event.data);

      if (message) {
        this.incoming.next(message);
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;

      this.socket = null;
      this.status.set('offline');

      if (this.listeners > 0) {
        this.scheduleReconnect();
      }
    };

    socket.onerror = () => socket.close();
  }

  private restart(): void {
    const socket = this.socket;

    this.socket = null;
    this.status.set('offline');
    socket?.close();

    if (this.listeners > 0) {
      this.open();
    }
  }

  private shutdown(): void {
    const socket = this.socket;

    this.clearRetry();
    this.socket = null;
    this.attempts = 0;
    this.hasConnectedBefore = false;
    this.status.set('offline');
    socket?.close();
  }

  // 1s, 2s, 4s ... up to 15s, plus a little randomness so clients do not all return at once
  private scheduleReconnect(): void {
    this.clearRetry();

    const delay = Math.min(1000 * 2 ** this.attempts, 15000) + Math.random() * 500;
    this.attempts++;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.open();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private parse(raw: unknown): RealtimeMessage | null {
    if (typeof raw !== 'string') return null;

    try {
      const message = JSON.parse(raw);
      return KNOWN_TYPES.has(message?.type) ? (message as RealtimeMessage) : null;
    } catch {
      return null;
    }
  }
}