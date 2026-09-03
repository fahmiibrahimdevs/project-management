export type UserRole = 'owner' | 'pm' | 'karyawan' | 'magang';
export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'revision' | 'completed' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type BOMStatus = 'belum_checkout' | 'sudah_checkout' | 'ditolak' | 'dibatalkan';
export type BOMPriority = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ActiveTab = 'kanban' | 'list' | 'bom' | 'issues' | 'team' | 'attachments';
export type FileCategory = 'all' | 'document' | 'image' | 'design' | 'cad' | 'spreadsheet' | 'archive' | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  job_title: string;
  avatar_color: string;
  is_active?: number;
  phone?: string;
  address?: string;
  gender?: string;
  department?: string;
  join_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_color: string;
  project_role?: string;
  job_title?: string;
  phone?: string;
  address?: string;
  gender?: string;
  department?: string;
  join_date?: string;
  end_date?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  total_tasks?: number;
  active_tasks?: number;
  completed_tasks?: number;
  backlog_tasks?: number;
  total_criteria?: number;
  completed_criteria?: number;
  total_bom_cost?: number;
  open_issues_count?: number;
  member_count?: number;
  members?: Member[];
}

export interface AcceptanceCriterion {
  id: string;
  task_id: string;
  text: string;
  is_completed: number;
  completed_by_id?: string;
  completed_by_name?: string;
  completed_at?: string;
  order_index: number;
  created_at?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  member_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_role?: string;
  author_job_title?: string;
  author_avatar_color?: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type?: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees?: Member[];
  assignee_ids?: string[];
  deadline?: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  
  // Joins / Aggregations
  total_criteria?: number;
  completed_criteria?: number;
  total_comments?: number;
  total_attachments?: number;

  // Creator Metadata
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  created_by_job_title?: string | null;
  created_by_avatar_color?: string | null;

  // Full Details
  project_name?: string;
  project_code?: string;
  acceptance_criteria?: AcceptanceCriterion[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export interface BOMCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  order_index: number;
  item_count?: number;
  total_cost?: number;
  created_at: string;
}

export interface BOMItem {
  id: string;
  project_id: string;
  item_name: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  store_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  priority: BOMPriority;
  status: BOMStatus;
  purchase_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BOMResponse {
  items: BOMItem[];
  summary: {
    total_cost: number;
    total_items: number;
    total_sudah_checkout_cost: number;
    total_belum_checkout_cost: number;
    by_status: {
      belum_checkout: number;
      sudah_checkout: number;
      ditolak: number;
      dibatalkan: number;
    };
    by_priority: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface IssueLog {
  id: string;
  project_id: string;
  task_id?: string | null;
  log_date: string;
  problem: string;
  indication: string;
  root_cause: string;
  solution: string;
  status: IssueStatus;
  severity: IssueSeverity;
  reported_by_id: string;
  created_at: string;
  updated_at: string;

  // Joined fields
  reported_by_name?: string;
  reported_by_email?: string;
  reported_by_role?: string;
  reported_by_avatar_color?: string;
  task_title?: string;
  task_status?: string;
  project_name?: string;
  project_code?: string;
}

export interface IssueLogsResponse {
  issues: IssueLog[];
  summary: {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    closed: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  task_id?: string | null;
  uploaded_by_id?: string | null;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type?: string;
  category?: string;
  created_at: string;
  source: 'project' | 'task';
  uploaded_by_name?: string;
  uploaded_by_avatar_color?: string;
  task_title?: string;
  task_status?: TaskStatus;
  task_priority?: TaskPriority;
}

export interface ProjectAttachmentsResponse {
  items: ProjectAttachment[];
  summary: {
    total_files: number;
    total_bytes: number;
    by_category: {
      document: number;
      image: number;
      design: number;
      cad: number;
      spreadsheet: number;
      archive: number;
      other: number;
    };
  };
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  project_id: string;
  task_id?: string | null;
  type: "task_comment" | "task_assigned" | "task_created" | string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
  actor_name?: string;
  actor_avatar_color?: string;
  actor_role?: string;
  project_name?: string;
  project_code?: string;
  task_title?: string;
}

export interface NotificationsResponse {
  unread_count: number;
  notifications: NotificationItem[];
}
