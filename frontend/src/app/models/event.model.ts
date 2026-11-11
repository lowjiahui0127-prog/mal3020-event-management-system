export interface EventItem {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  location: string;
  imageUrl?: string;
  capacity: number;
  registeredCount: number;
  status: 'draft' | 'published' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}