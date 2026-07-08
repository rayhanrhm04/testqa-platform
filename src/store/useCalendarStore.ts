import { create } from 'zustand';
import { CalendarEvent } from '@/lib/calendar-types';
import * as storage from '@/lib/calendar-storage';
import { useProjectMonitorStore } from './useProjectMonitorStore';

interface CalendarState {
  manualEvents: CalendarEvent[];
  allEvents: CalendarEvent[];
  isLoading: boolean;

  fetchData: () => void;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'source'>) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => CalendarEvent;
  deleteEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  manualEvents: [],
  allEvents: [],
  isLoading: true,

  fetchData: () => {
    set({ isLoading: true });
    
    // 1. Fetch manual events
    const manualEvents = storage.getCalendarEvents();
    
    // 2. Load latest projects/worklogs from the project monitor store
    const monitorStore = useProjectMonitorStore.getState();
    const projects = monitorStore.projects;
    const worklogs = monitorStore.worklogs;

    // 3. Generate auto events
    const projectEvents = storage.generateCalendarEventsFromProjects(projects);
    const worklogEvents = storage.generateCalendarEventsFromWorklogs(worklogs, projects);

    // 4. Combine all sources
    const allEvents = [...manualEvents, ...projectEvents, ...worklogEvents]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || 
                      (a.startTime || '').localeCompare(b.startTime || ''));

    set({ manualEvents, allEvents, isLoading: false });
  },

  addEvent: (event) => {
    const newEv = storage.createCalendarEvent(event);
    get().fetchData();
    return newEv;
  },

  updateEvent: (id, updates) => {
    const updated = storage.updateCalendarEvent(id, updates);
    get().fetchData();
    return updated;
  },

  deleteEvent: (id) => {
    storage.deleteCalendarEvent(id);
    get().fetchData();
  },
}));
