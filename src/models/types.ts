export type Role = 'USER' | 'ADMIN';

export type EwasteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

export type TransactionStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';

export type ScheduleStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type PickupType = 'HOME' | 'DROP_POINT';

export type ContentType = 'ARTICLE' | 'TUTORIAL' | 'NEWS';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ewaste {
  id: string;
  userId: string;
  category: string;
  weight: number;
  status: EwasteStatus;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  ewasteId: string;
  userId: string;
  totalPrice: number;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  transactionId: string;
  userId: string;
  pickupDate: Date;
  pickupType: PickupType;
  status: ScheduleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Content {
  id: string;
  title: string;
  body: string;
  type: ContentType;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}