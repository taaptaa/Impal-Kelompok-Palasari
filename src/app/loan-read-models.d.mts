import type { AdminLoan, AdminLoanList, AdminLoanStats, DecisionReadiness, ScheduleResponse, ScheduleResource, SchedulePeriod, RecordedSegment } from './api';
export const readStatuses: readonly string[];
export function checkedDecisions(value:unknown): DecisionReadiness;
export function checkedAdminLoan(value:unknown): AdminLoan;
export function checkedAdminList(value:unknown): AdminLoanList;
export function checkedStats(value:unknown): AdminLoanStats;
export function checkedSchedule(value:unknown, resource:ScheduleResource, period:SchedulePeriod): ScheduleResponse;
export function scheduleChunks(startsAt:string,endsAt:string): SchedulePeriod[];
export function mergeSegments(parts:ScheduleResponse[]): RecordedSegment[];
