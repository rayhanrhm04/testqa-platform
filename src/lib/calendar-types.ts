export type CalendarEventType =
  | 'Meeting'
  | 'Testing'
  | 'Retest'
  | 'Regression'
  | 'Smoke Test'
  | 'UAT'
  | 'Production Validation'
  | 'Release'
  | 'Documentation'
  | 'Bug Review'
  | 'Personal Focus'
  | 'Other';

export type CalendarWorkload = 'Low' | 'Medium' | 'High' | 'Critical';

export type CalendarEventStatus = 'Upcoming' | 'Done' | 'Cancelled';

export type CalendarEventSource = 'Manual' | 'Project' | 'Worklog';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  projectId?: string;
  projectName?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  workload: CalendarWorkload;
  description?: string;
  locationOrLink?: string;
  reminderNote?: string;
  colorLabel?: string; // hex color
  status: CalendarEventStatus;
  source: CalendarEventSource;
  isAllDay?: boolean;
  timeZone?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'monthly_weekday' | 'annually' | 'weekday' | 'custom';
  recurrenceEnd?: string; // YYYY-MM-DD
  recurrenceInterval?: number;
  recurrenceType?: 'day' | 'week' | 'month' | 'year';
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
  'Meeting',
  'Testing',
  'Retest',
  'Regression',
  'Smoke Test',
  'UAT',
  'Production Validation',
  'Release',
  'Documentation',
  'Bug Review',
  'Personal Focus',
  'Other',
];

export const EVENT_TYPE_COLORS: Record<CalendarEventType, { bg: string; text: string; dot: string }> = {
  Meeting: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
  Testing: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  Retest: { bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
  Regression: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
  'Smoke Test': { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
  UAT: { bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', dot: 'bg-pink-500' },
  'Production Validation': { bg: 'bg-violet-500/10 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
  Release: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  Documentation: { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },
  'Bug Review': { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  'Personal Focus': { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },
  Other: { bg: 'bg-zinc-500/10 dark:bg-zinc-500/20', text: 'text-zinc-600 dark:text-zinc-400', dot: 'bg-zinc-500' },
};
