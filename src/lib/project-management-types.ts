export type PMProjectRole = 'Project Lead' | 'Member' | 'Viewer';
export type PMProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed';
export type PMTaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type PMLinkType = 'Issue' | 'Feedback' | 'Test Case' | 'Test Run' | 'Release' | 'Exploratory Finding';

export interface PMUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

export interface PMProject {
  id: string;
  name: string;
  description: string;
  lead_user_id: string;
  lead_name: string;
  start_date: string | null;
  target_date: string | null;
  status: PMProjectStatus;
  role: PMProjectRole;
  member_count: number;
  task_count: number;
  completed_count: number;
  created_at: string;
}

export interface PMMember extends PMUser {
  role: PMProjectRole;
}

export interface PMColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
}

export interface PMTaskLink {
  id: string;
  link_type: PMLinkType;
  linked_id: string;
  linked_code: string;
}

export interface PMTask {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description: string;
  reporter_id: string;
  reporter_name: string;
  priority: PMTaskPriority;
  due_date: string | null;
  labels: string[];
  attachment_url: string | null;
  attachment_name: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignees: PMUser[];
  links: PMTaskLink[];
  comment_count: number;
  checklist_total: number;
  checklist_done: number;
}

export interface PMActivity {
  id: string;
  action: string;
  details: string;
  actor_name: string;
  created_at: string;
}

export interface PMComment {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  image_url: string | null;
  image_name: string | null;
  mentions: PMUser[];
  created_at: string;
}

export interface PMChecklistItem {
  id: string;
  text: string;
  is_done: boolean;
  position: number;
}

export interface PMBoardData {
  project: PMProject;
  members: PMMember[];
  columns: PMColumn[];
  tasks: PMTask[];
  activities: PMActivity[];
}

