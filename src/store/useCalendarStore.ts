import { create } from 'zustand';
import { CalendarEvent } from '@/lib/calendar-types';
import * as storage from '@/lib/calendar-storage';
import { useProjectMonitorStore } from './useProjectMonitorStore';
import { useDataStore } from './useDataStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeWriteCache } from '@/lib/safe-cache';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

interface CalendarState {
  manualEvents: CalendarEvent[];
  allEvents: CalendarEvent[];
  isLoading: boolean;

  fetchData: () => void;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'source'>) => Promise<CalendarEvent>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  setManualWorkload: (date: string, workload: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  manualEvents: [],
  allEvents: [],
  isLoading: true,

  fetchData: () => {
    set({ isLoading: true });
    
    // 1. Fetch manual events from the central useDataStore state
    const manualEvents = useDataStore.getState().calendarEvents || [];
    const expandedManualEvents = storage.expandRecurringEvents(manualEvents);
    
    // 2. Load latest projects/worklogs from the project monitor store
    const monitorStore = useProjectMonitorStore.getState();
    const projects = monitorStore.projects;
    const worklogs = monitorStore.worklogs;

    // 3. Generate auto events
    const projectEvents = storage.generateCalendarEventsFromProjects(projects);
    const worklogEvents = storage.generateCalendarEventsFromWorklogs(worklogs, projects);

    // 4. Combine all sources
    const allEvents = [...expandedManualEvents, ...projectEvents, ...worklogEvents]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || 
                      (a.startTime || '').localeCompare(b.startTime || ''));

    set({ manualEvents, allEvents, isLoading: false });
  },

  addEvent: async (event) => {
    const newId = generateUUID();
    const newEv: CalendarEvent = {
      ...event,
      id: newId,
      source: 'Manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!.from('calendar_events').insert(newEv).select();
      if (error) throw new Error(error.message || 'Failed to add calendar event');
      
      const nextEvents = [data[0] || newEv, ...useDataStore.getState().calendarEvents];
      useDataStore.setState({ calendarEvents: nextEvents });
      safeWriteCache('calendarEvents', nextEvents);
      get().fetchData();
      return data[0] || newEv;
    } else {
      const fallback = [newEv, ...useDataStore.getState().calendarEvents];
      useDataStore.setState({ calendarEvents: fallback });
      safeWriteCache('calendarEvents', fallback);
      get().fetchData();
      return newEv;
    }
  },

  updateEvent: async (id, updates) => {
    const events = useDataStore.getState().calendarEvents;
    const index = events.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Calendar event with ID ${id} not found.`);
    }

    const updatedEvent: CalendarEvent = {
      ...events[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) throw new Error(error.message || 'Failed to update calendar event');
      
      const nextEvents = events.map(e => e.id === id ? (data[0] || updatedEvent) : e);
      useDataStore.setState({ calendarEvents: nextEvents });
      safeWriteCache('calendarEvents', nextEvents);
      get().fetchData();
      return data[0] || updatedEvent;
    } else {
      const nextEvents = events.map(e => e.id === id ? updatedEvent : e);
      useDataStore.setState({ calendarEvents: nextEvents });
      safeWriteCache('calendarEvents', nextEvents);
      get().fetchData();
      return updatedEvent;
    }
  },

  deleteEvent: async (id) => {
    const events = useDataStore.getState().calendarEvents;
    const nextEvents = events.filter(e => e.id !== id);

    if (isSupabaseConfigured()) {
      const { error } = await supabase!.from('calendar_events').delete().eq('id', id);
      if (error) throw new Error(error.message || 'Failed to delete calendar event');
    }
    
    useDataStore.setState({ calendarEvents: nextEvents });
    safeWriteCache('calendarEvents', nextEvents);
    get().fetchData();
  },

  setManualWorkload: async (date, workload) => {
    const workloads = useDataStore.getState().calendarWorkloads;
    const existing = workloads.find(w => w.date === date);

    if (isSupabaseConfigured()) {
      if (workload === 'Auto') {
        const { error } = await supabase!.from('calendar_workloads').delete().eq('date', date);
        if (error) throw new Error(error.message || 'Failed to reset workload');
        
        const nextWorkloads = workloads.filter(w => w.date !== date);
        useDataStore.setState({ calendarWorkloads: nextWorkloads });
        safeWriteCache('calendarWorkloads', nextWorkloads);
      } else {
        if (existing) {
          const { data, error } = await supabase!
            .from('calendar_workloads')
            .update({ workload })
            .eq('date', date)
            .select();
          if (error) throw new Error(error.message || 'Failed to update workload');
          
          const nextWorkloads = workloads.map(w => w.date === date ? data[0] : w);
          useDataStore.setState({ calendarWorkloads: nextWorkloads });
          safeWriteCache('calendarWorkloads', nextWorkloads);
        } else {
          const newWorkload = { id: generateUUID(), date, workload };
          const { data, error } = await supabase!.from('calendar_workloads').insert(newWorkload).select();
          if (error) throw new Error(error.message || 'Failed to insert workload');
          
          const nextWorkloads = [data[0], ...workloads];
          useDataStore.setState({ calendarWorkloads: nextWorkloads });
          safeWriteCache('calendarWorkloads', nextWorkloads);
        }
      }
    } else {
      if (workload === 'Auto') {
        const nextWorkloads = workloads.filter(w => w.date !== date);
        useDataStore.setState({ calendarWorkloads: nextWorkloads });
        safeWriteCache('calendarWorkloads', nextWorkloads);
      } else {
        if (existing) {
          const nextWorkloads = workloads.map(w => w.date === date ? { ...w, workload } : w);
          useDataStore.setState({ calendarWorkloads: nextWorkloads });
          safeWriteCache('calendarWorkloads', nextWorkloads);
        } else {
          const newW = { id: `wl-${Date.now()}`, date, workload };
          const nextWorkloads = [newW, ...workloads];
          useDataStore.setState({ calendarWorkloads: nextWorkloads });
          safeWriteCache('calendarWorkloads', nextWorkloads);
        }
      }
    }
    
    get().fetchData();
  },
}));

// Subscribe to useDataStore changes to re-calculate calendar events automatically
if (typeof window !== 'undefined') {
  useDataStore.subscribe((state) => {
    useCalendarStore.getState().fetchData();
  });
}
