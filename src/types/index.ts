export type UserRole = 'student' | 'parent' | 'admin';
export type PassType = 'lunch' | 'late' | 'nightout';
export type PassStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'violated';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type StudentStatus = 'IN' | 'OUT' | 'LATE';
export type ComplaintCategory = 'maintenance' | 'food' | 'safety' | 'cleanliness' | 'other';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface StudentData {
  uid: string;
  parentId: string | null;
  roomNo: string;
  currentStatus: StudentStatus;
  lastExitTime?: string;
  lastEntryTime?: string;
  activePassId?: string | null;
}

export interface PassRequest {
  id: string;
  studentId: string;
  studentName?: string;
  type: PassType;
  reason: string;
  /** ISO timestamp of the expected return time set at pass creation */
  expectedReturnTime: string;
  /** ISO timestamp of when the student actually returned (set on entry scan) */
  actualReturnTime?: string;
  /** ISO timestamp of when the student physically exited the gate */
  actualExitTime?: string;
  parentApproval: ApprovalStatus;
  adminApproval: ApprovalStatus;
  status: PassStatus;
  /** ISO timestamp of when the pass request was submitted */
  createdAt: string;
}

export interface Complaint {
  id: string;
  studentId: string;
  studentName?: string;
  issue: string;
  category: ComplaintCategory;
  status: 'pending' | 'resolved';
  createdAt: string;
}
