import { CalendarEvent, CalendarWorkload } from './calendar-types';
import { QAProject, QAWorklog } from './project-monitor-types';

const EVENTS_KEY = 'qa_calendar_events';
const isBrowser = () => typeof window !== 'undefined';

// 1. Core CRUD for Manual Events
export function getCalendarEvents(): CalendarEvent[] {
  if (!isBrowser()) return [];
  const stored = localStorage.getItem(EVENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'source'>): CalendarEvent {
  const events = getCalendarEvents();
  const newEvent: CalendarEvent = {
    ...event,
    id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    source: 'Manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  events.push(newEvent);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return newEvent;
}

export function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent {
  const events = getCalendarEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error(`Calendar event with ID ${id} not found.`);
  }

  const updatedEvent: CalendarEvent = {
    ...events[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  events[index] = updatedEvent;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return updatedEvent;
}

export function deleteCalendarEvent(id: string): void {
  const events = getCalendarEvents();
  const filtered = events.filter(e => e.id !== id);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
}

// 2. Auto-generation from Projects (Release Target)
export function generateCalendarEventsFromProjects(projects: QAProject[]): CalendarEvent[] {
  return projects
    .filter(p => p.releaseTarget)
    .map(p => {
      const id = `ev-auto-proj-${p.id}`;
      return {
        id,
        title: `[Release Target] ${p.name}`,
        type: 'Release',
        projectId: p.id,
        projectName: p.name,
        date: p.releaseTarget,
        workload: p.workload,
        description: `Release Target for product ${p.product} (Client: ${p.client}).`,
        status: p.qaStatus === 'Released' ? 'Done' : 'Upcoming',
        source: 'Project',
        createdAt: p.createdAt,
        updatedAt: p.lastUpdate,
      };
    });
}

// 3. Auto-generation from Worklogs
export function generateCalendarEventsFromWorklogs(worklogs: QAWorklog[], projects: QAProject[]): CalendarEvent[] {
  return worklogs.map(log => {
    const project = projects.find(p => p.id === log.projectId);
    const projectName = project ? project.name : 'Unknown';
    const id = `ev-auto-log-${log.id}`;
    
    // Map log mood to workload level
    let workload: CalendarWorkload = 'Medium';
    if (log.mood === 'Smooth') workload = 'Low';
    else if (log.mood === 'Normal') workload = 'Medium';
    else if (log.mood === 'Busy' || log.mood === 'Very Busy') workload = 'High';
    else if (log.mood === 'Critical') workload = 'Critical';

    // Map log status to event type
    let type = 'Testing';
    if (log.qaStatus === 'Smoke Testing') type = 'Smoke Test';
    else if (log.qaStatus === 'Regression Testing') type = 'Regression';
    else if (log.qaStatus === 'Retest') type = 'Retest';
    else if (log.qaStatus === 'Ready Release' || log.qaStatus === 'Released') type = 'Release';

    return {
      id,
      title: `[Worklog] ${projectName} - ${log.qaStatus}`,
      type: type as any,
      projectId: log.projectId,
      projectName,
      date: log.date,
      workload,
      description: `Task: ${log.currentTask}\nAchievements: ${log.todayAchievement}${log.blocker ? `\nBlocker: ${log.blocker}` : ''}`,
      status: 'Done', // Worklogs represent completed/saved daily efforts
      source: 'Worklog',
      createdAt: log.createdAt,
      updatedAt: log.createdAt,
    };
  });
}

const WORKLOAD_OVERRIDE_KEY = 'qa_calendar_manual_workloads';

export function getManualWorkloads(): Record<string, string> {
  if (!isBrowser()) return {};
  const stored = localStorage.getItem(WORKLOAD_OVERRIDE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function saveManualWorkload(date: string, workload: string): void {
  if (!isBrowser()) return;
  const workloads = getManualWorkloads();
  if (workload === 'Auto') {
    delete workloads[date];
  } else {
    workloads[date] = workload;
  }
  localStorage.setItem(WORKLOAD_OVERRIDE_KEY, JSON.stringify(workloads));
}

// 4. Grouped querying helpers
export function getCalendarWorkloadByDate(
  date: string, 
  allEvents: CalendarEvent[],
  manualWorkloads: any[] = []
): 'Empty' | 'Normal' | 'Busy' | 'Very Busy' | 'Critical' {
  // Check manual overrides first
  const override = manualWorkloads.find(w => w.date === date);
  if (override && override.workload !== 'Auto') {
    return override.workload as any;
  }

  const dayEvents = allEvents.filter(e => e.date === date);
  if (dayEvents.length === 0) return 'Empty';

  const hasCritical = dayEvents.some(e => e.workload === 'Critical');
  if (hasCritical) return 'Critical';

  const count = dayEvents.length;
  if (count >= 5) return 'Very Busy';
  if (count >= 3) return 'Busy';
  return 'Normal';
}

function getNthDayOfWeek(year: number, month: number, dayOfWeek: number, n: number): Date {
  const d = new Date(year, month, 1);
  while (d.getDay() !== dayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  const targetDate = d.getDate() + (n - 1) * 7;
  d.setDate(targetDate);
  if (d.getMonth() !== month) {
    const last = new Date(year, month + 1, 0);
    while (last.getDay() !== dayOfWeek) {
      last.setDate(last.getDate() - 1);
    }
    return last;
  }
  return d;
}

export function expandRecurringEvents(events: CalendarEvent[]): CalendarEvent[] {
  const expanded: CalendarEvent[] = [];

  events.forEach(event => {
    if (!event.recurrence || event.recurrence === 'none') {
      expanded.push(event);
      return;
    }

    const start = new Date(event.date);
    let limit = new Date(start);
    if (event.recurrenceEnd) {
      limit = new Date(event.recurrenceEnd);
    } else {
      limit.setFullYear(limit.getFullYear() + 1); // 1 year limit by default
    }

    let curr = new Date(start);
    let index = 0;

    // Ordinal weekday parameters
    const startDay = start.getDay();
    const startOrdinal = Math.ceil(start.getDate() / 7);

    while (curr.getTime() <= limit.getTime()) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      expanded.push({
        ...event,
        id: index === 0 ? event.id : `${event.id}-occ-${index}`,
        date: dateStr,
      });

      index++;

      if (event.recurrence === 'daily') {
        curr.setDate(curr.getDate() + 1);
      } else if (event.recurrence === 'weekly') {
        curr.setDate(curr.getDate() + 7);
      } else if (event.recurrence === 'weekday') {
        do {
          curr.setDate(curr.getDate() + 1);
        } while ((curr.getDay() === 0 || curr.getDay() === 6) && curr.getTime() <= limit.getTime());
      } else if (event.recurrence === 'monthly') {
        curr.setMonth(curr.getMonth() + 1);
      } else if (event.recurrence === 'monthly_weekday') {
        // Go to next month, then find the corresponding ordinal day
        const targetYear = curr.getMonth() === 11 ? curr.getFullYear() + 1 : curr.getFullYear();
        const targetMonth = (curr.getMonth() + 1) % 12;
        curr = getNthDayOfWeek(targetYear, targetMonth, startDay, startOrdinal);
      } else if (event.recurrence === 'annually') {
        curr.setFullYear(curr.getFullYear() + 1);
      } else if (event.recurrence === 'custom' && event.recurrenceInterval) {
        const val = event.recurrenceInterval;
        if (event.recurrenceType === 'day') {
          curr.setDate(curr.getDate() + val);
        } else if (event.recurrenceType === 'week') {
          curr.setDate(curr.getDate() + val * 7);
        } else if (event.recurrenceType === 'month') {
          curr.setMonth(curr.getMonth() + val);
        } else if (event.recurrenceType === 'year') {
          curr.setFullYear(curr.getFullYear() + val);
        } else {
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        break;
      }
    }
  });

  return expanded;
}
