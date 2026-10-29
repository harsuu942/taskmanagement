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

export type AttendanceStatusType = "PRESENT" | "ON_BREAK" | "CHECKED_OUT" | "ABSENT_LEAVE" | "ON_LEAVE" | "PUBLIC_HOLIDAY";

export interface User {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  role: Role;
  designation?: string | null;
  avatar?: string | null;
  phone?: string | null;
  panNumber?: string | null;
  address?: string | null;
  joiningDate?: string | null;
  salary?: number | null;
  hourlyRate?: number | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
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

export interface TaskAssigneeItem {
  id: string;
  taskId: string;
  userId: string;
  user?: User;
}

export interface TaskClientItem {
  id: string;
  taskId: string;
  clientId: string;
  client?: Client;
}

export interface TaskProof {
  id: string;
  taskId: string;
  userId: string;
  user?: User;
  imageUrl: string;
  caption?: string | null;
  source: string; // "WEB_CAPTURE" | "MANUAL_UPLOAD" | "DESKTOP_AGENT"
  createdAt: string;
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
  billableHours?: number | null;
  isRecurringTemplate: boolean;
  parentRecurringId?: string | null;
  lastGeneratedDate?: string | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  assignees?: TaskAssigneeItem[];
  clientId?: string | null;
  client?: Client | null;
  taskClients?: TaskClientItem[];
  createdById: string;
  createdBy?: User | null;
  timeLogs?: TimeLog[];
  proofs?: TaskProof[];
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
  breakDurationSeconds?: number;
  isOnBreak?: boolean;
  currentBreakStartedAt?: string | null;
  lastCheckInTime?: string | null;
  sessionBreakDurationSeconds?: number;
  status: AttendanceStatusType;
  notes?: string | null;
}

export interface AttendanceRosterItem {
  date?: string;
  employee: User;
  record: AttendanceRecord | null;
  status: AttendanceStatusType;
  holidayName?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workDurationSeconds: number;
  breakDurationSeconds?: number;
  isOnBreak?: boolean;
  currentBreakStartedAt?: string | null;
  lastCheckInTime?: string | null;
  sessionBreakDurationSeconds?: number;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskReportItem {
  id: string;
  title: string;
  recurrence: string;
  priority: string;
  employeeStatus: string;
  adminStatus: string;
  durationSeconds: number;
  billableHours?: number | null;
  clientName?: string | null;
  employeeName?: string | null;
  employeeEmail?: string | null;
  date?: string;
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
    breakDurationSeconds?: number;
    isOnBreak?: boolean;
  };
  tasks: TaskReportItem[];
  shiftDurationSeconds: number;
  totalActiveSeconds: number;
  totalTasksCompleted: number;
  totalTasksPending: number;
}

export type LeaveType = "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "HALF_DAY" | "HOURLY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: User;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  durationHours?: number | null;
  isHourly?: boolean;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string | null;
  reviewedBy?: User | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSummaryItem {
  leaveType: string;
  label: string;
  totalAvailable: number;
  accrualRate?: number;
  taken: number;
  balance: number;
}

export interface LeaveStats {
  totalLeaves: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  onLeaveTodayCount: number;
}

