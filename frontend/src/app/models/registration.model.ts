export type RegistrationStatus = 'confirmed' | 'cancelled';

export interface RegistrationEvent {
  _id: string;
  title: string;
  date: string;
  endDate: string;
  location: string;
  status: 'draft' | 'published' | 'cancelled';
  capacity: number;
  registeredCount: number;
}

export interface RegistrationItem {
  _id: string;
  user: string;
  event: RegistrationEvent;
  status: RegistrationStatus;
  registeredAt: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// What the user actually sees: combines the registration status with the event's state
export type RegistrationDisplayStatus =
  | 'confirmed'
  | 'completed'
  | 'event-cancelled'
  | 'cancelled';

export const STATUS_LABELS: Record<RegistrationDisplayStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  'event-cancelled': 'Event cancelled',
  cancelled: 'Cancelled'
};

export function getDisplayStatus(
  registration: RegistrationItem,
  now = Date.now()
): RegistrationDisplayStatus {
  if (registration.status === 'cancelled') return 'cancelled';
  if (registration.event.status === 'cancelled') return 'event-cancelled';
  if (new Date(registration.event.endDate).getTime() < now) return 'completed';
  return 'confirmed';
}

// Short, readable reference such as REG-A1B2C3
export function getReference(registration: RegistrationItem): string {
  return `REG-${registration._id.slice(-6).toUpperCase()}`;
}