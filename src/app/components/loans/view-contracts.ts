import type { SavedLoan, ScheduleResponse, AdminPagination } from '../../api';

// View models only. No endpoint or wire response is assumed here.
export type RemoteView<T> =
  | { state: 'unconnected' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; data: T };

export interface ScheduleEntry {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string;
  status: SavedLoan['status'];
  verification: 'unverified' | 'verified';
}
export interface BookingScheduleProps {
  source?: RemoteView<ScheduleEntry[]>;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  onRetry?: () => void;
  allocation?: RemoteView<ScheduleResponse>;
  month?:Date;
}
export interface AdminRequestRow {
  id: number;
  number: string;
  borrowerName: string;
  startsAt: string;
  endsAt: string;
  status: SavedLoan['status'];
  itemSummary: string;
  reason: string;
  createdAt?:string|null;
  totalTypes?:number;
  totalUnits?:number;
}
export interface AdminOverview {
  statistics: { total: number | null; waiting: number | null; active: number | null; completed: number | null;
    approved?: number | null; rejected?: number | null; cancelled?: number | null };
  requests: AdminRequestRow[];
  pagination?:AdminPagination;
  asOf?:string;
}
export interface AdminRequestsPanelProps {
  source?: RemoteView<AdminOverview>;
  onRetry?: () => void;
  filterStatus?:string;
  onStatusChange?:(status:string)=>void;
  onPageChange?:(offset:number)=>void;
  onDetail?:(id:number)=>void;
}
