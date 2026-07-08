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

// 4. Grouped querying helpers
export function getCalendarWorkloadByDate(date: string, allEvents: CalendarEvent[]): 'Empty' | 'Normal' | 'Busy' | 'Very Busy' | 'Critical' {
  const dayEvents = allEvents.filter(e => e.date === date);
  if (dayEvents.length === 0) return 'Empty';

  const hasCritical = dayEvents.some(e => e.workload === 'Critical');
  if (hasCritical) return 'Critical';

  const count = dayEvents.length;
  if (count >= 5) return 'Very Busy';
  if (count >= 3) return 'Busy';
  return 'Normal';
}
