export interface EventItem {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  location: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}