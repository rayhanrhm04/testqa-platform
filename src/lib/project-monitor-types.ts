export type QAStatus =
  | 'Planning'
  | 'Testcase Preparation'
  | 'Smoke Testing'
  | 'Functional Testing'
  | 'Regression Testing'
  | 'Waiting Fix'
  | 'Retest'
  | 'Ready Release'
  | 'Released'
  | 'On Hold';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type Workload = 'Low' | 'Medium' | 'High' | 'Critical';

export type WorklogMode = 'Daily' | 'Weekly';

export type WorklogMood = 'Smooth' | 'Normal' | 'Busy' | 'Very Busy' | 'Critical';

export interface QAProject {
  id: string;
  name: string;
  client: string;
  product: string;
  description: string;
  qaStatus: QAStatus;
  priority: Priority;
  workload: Workload;
  progress: number; // 0 to 100
  releaseTarget: string; // YYYY-MM-DD
  colorLabel: string; // hex or Tailwind color value (e.g. '#3b82f6')
  notes: string;
  createdAt: string; // ISO String
  lastUpdate: string; // ISO String
}

export interface QAWorklog {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  mode: WorklogMode;
  progress: number; // 0 to 100
  qaStatus: QAStatus;
  currentTask: string;
  blocker: string;
  needSupport: string;
  todayAchievement: string;
  nextPlan: string;
  notes: string;
  mood: WorklogMood;
  createdAt: string; // ISO String
}

export const QA_STATUS_LIST: QAStatus[] = [
  'Planning',
  'Testcase Preparation',
  'Smoke Testing',
  'Functional Testing',
  'Regression Testing',
  'Waiting Fix',
  'Retest',
  'Ready Release',
  'Released',
  'On Hold',
];

export const PRIORITY_LIST: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export const WORKLOAD_LIST: Workload[] = ['Low', 'Medium', 'High', 'Critical'];

export const MOODS: { type: WorklogMood; emoji: string; label: string; bgClass: string; textClass: string }[] = [
  { type: 'Smooth', emoji: '😀', label: 'Smooth', bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20', textClass: 'text-emerald-600 dark:text-emerald-400' },
  { type: 'Normal', emoji: '🙂', label: 'Normal', bgClass: 'bg-blue-500/10 dark:bg-blue-500/20', textClass: 'text-blue-600 dark:text-blue-400' },
  { type: 'Busy', emoji: '😓', label: 'Busy', bgClass: 'bg-amber-500/10 dark:bg-amber-500/20', textClass: 'text-amber-600 dark:text-amber-400' },
  { type: 'Very Busy', emoji: '🔥', label: 'Very Busy', bgClass: 'bg-orange-500/10 dark:bg-orange-500/20', textClass: 'text-orange-600 dark:text-orange-400' },
  { type: 'Critical', emoji: '🚨', label: 'Critical', bgClass: 'bg-red-500/10 dark:bg-red-500/20', textClass: 'text-red-600 dark:text-red-400' },
];

export const COLOR_LABELS = [
  { name: 'Blue', value: '#3b82f6', borderClass: 'border-blue-500', bgClass: 'bg-blue-500' },
  { name: 'Emerald', value: '#10b981', borderClass: 'border-emerald-500', bgClass: 'bg-emerald-500' },
  { name: 'Indigo', value: '#6366f1', borderClass: 'border-indigo-500', bgClass: 'bg-indigo-500' },
  { name: 'Violet', value: '#8b5cf6', borderClass: 'border-violet-500', bgClass: 'bg-violet-500' },
  { name: 'Orange', value: '#f97316', borderClass: 'border-orange-500', bgClass: 'bg-orange-500' },
  { name: 'Red', value: '#ef4444', borderClass: 'border-red-500', bgClass: 'bg-red-500' },
  { name: 'Rose', value: '#f43f5e', borderClass: 'border-rose-500', bgClass: 'bg-rose-500' },
  { name: 'Amber', value: '#f59e0b', borderClass: 'border-amber-500', bgClass: 'bg-amber-500' },
];
