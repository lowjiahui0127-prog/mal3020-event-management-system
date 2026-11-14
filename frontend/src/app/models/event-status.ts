import { EventItem } from './event.model';

// What the organiser sees: the stored status combined with the event's dates
export type EventDisplayStatus = 'draft' | 'published' | 'ended' | 'cancelled';

export const EVENT_STATUS_LABELS: Record<EventDisplayStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  ended: 'Ended',
  cancelled: 'Cancelled'
};

export function getEventDisplayStatus(
  event: EventItem,
  now = Date.now()
): EventDisplayStatus {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'draft') return 'draft';

  const end = new Date(event.endDate || event.date).getTime();
  return end < now ? 'ended' : 'published';
}