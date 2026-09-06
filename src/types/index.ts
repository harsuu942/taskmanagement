export type Role = "ADMIN" | "EMPLOYEE";

export type RecurrenceType =
  | "ONE_TIME"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY";

export type PriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type EmployeeStatusType = "TODO" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED";

export type AdminStatusType =
  | "NOT_SUBMITTED"
  | "PENDING_REVIEW"
  | "FINAL_COMPLETED"
  | "REVISION_REQUESTED";

export type AttendanceStatusType = "PRESENT" | "CHECKED_OUT" | "ABSENT_LEAVE";

export interface User {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  role: Role;
  designation?: string | null;
  avatar?: string | null;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime?: string | null;
  durationSeconds: number;
  isRunning: boolean;
  note?: string | null;
  user?: User;
}

export interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  recurrence: RecurrenceType;
  monthlyDay?: number | null;
  weeklyDay?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: PriorityType;
  employeeStatus: EmployeeStatusType;
  adminStatus: AdminStatusType;
  totalDurationSeconds: number;
  isTimerRunning: boolean;
  currentTimerStartedAt?: string | null;
  isRecurringTemplate: boolean;
  parentRecurringId?: string | null;
  lastGeneratedDate?: string | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  clientId?: string | null;
  client?: Client | null;
  createdById: string;
  createdBy?: User | null;
  timeLogs?: TimeLog[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workDurationSeconds: number;
  status: AttendanceStatusType;
  notes?: string | null;
}

export interface AttendanceRosterItem {
  employee: User;
  record: AttendanceRecord | null;
  status: AttendanceStatusType;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workDurationSeconds: number;
}

export interface TaskReportItem {
  id: string;
  title: string;
  recurrence: string;
  priority: string;
  employeeStatus: string;
  adminStatus: string;
  durationSeconds: number;
}

export interface EmployeeDailyReportData {
  employee: {
    id: string;
    name: string;
    email: string;
    designation?: string | null;
  };
  date: string;
  attendance: {
    status: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    workDurationSeconds: number;
  };
  tasks: TaskReportItem[];
  totalActiveSeconds: number;
  totalTasksCompleted: number;
  totalTasksPending: number;
}

export type LeaveType = "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "HALF_DAY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: User;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string | null;
  reviewedBy?: User | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveStats {
  totalLeaves: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  onLeaveTodayCount: number;
}

