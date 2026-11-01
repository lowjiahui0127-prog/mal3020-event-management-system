export type UserRole = 'attendee' | 'organiser';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}