export interface EWasteRequest {
  id: string;
  userId: string;
  category?: string;
  weight: number;
  price?: number;
  status: 'pending' | 'approved' | 'rejected';
  pickupDate?: string;
  location?: string;
  imageUrl: string;
  createdAt: string;
}