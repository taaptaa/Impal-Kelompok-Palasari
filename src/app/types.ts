// User roles
export type UserRole = 'student' | 'admin' | 'warehouse';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
}

// Item status types
export type ItemStatus = 'available' | 'low-stock' | 'out-of-stock' | 'borrowed';
export type ItemCategory = 'electronics' | 'furniture' | 'decoration' | 'other';

export interface Item {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  imageUrl: string;
  totalStock: number;
  availableStock: number;
  status: ItemStatus;
  condition: string;
  specifications?: string[];
}

// Loan request status
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'returned';

export interface LoanRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  reason: string;
  status: LoanStatus;
  requestDate: string;
  qrCode?: string;
  approvedBy?: string;
  approvedDate?: string;
  pickedUpDate?: string;
  actualReturnDate?: string;
  returnCondition?: 'good' | 'damaged' | 'lost';
  notes?: string;
  rejectReason?: string;
}

export interface DashboardStats {
  totalLoans: number;
  activeLoans: number;
  itemsOut: number;
  criticalStock: number;
}