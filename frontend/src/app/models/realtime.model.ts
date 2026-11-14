export type ConnectionStatus = 'offline' | 'connecting' | 'online';

// Public: seat numbers of a published event
export interface EventCountsMessage {
  type: 'event:counts';
  data: { eventId: string; registeredCount: number; capacity: number };
}

// Private: only the organiser who owns the event receives these
export interface RegistrationActivity {
  _id: string;
  status: 'confirmed' | 'cancelled';
  registeredAt: string;
  cancelledAt?: string;
  user: { _id: string; name: string; email: string };
  event: { _id: string; title: string };
}

export interface RegistrationCreatedMessage {
  type: 'registration:created';
  data: RegistrationActivity;
}

export interface RegistrationCancelledMessage {
  type: 'registration:cancelled';
  data: RegistrationActivity;
}

export type RealtimeMessage =
  | EventCountsMessage
  | RegistrationCreatedMessage
  | RegistrationCancelledMessage;