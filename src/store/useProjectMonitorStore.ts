import { create } from 'zustand';
import { QAProject, QAWorklog } from '@/lib/project-monitor-types';
import * as storage from '@/lib/project-monitor-storage';

interface ProjectMonitorState {
  projects: QAProject[];
  worklogs: QAWorklog[];
  isLoading: boolean;

  fetchData: () => void;
  addProject: (project: Omit<QAProject, 'id' | 'createdAt' | 'lastUpdate'>) => QAProject;
  updateProject: (id: string, updates: Partial<QAProject>) => QAProject;
  deleteProject: (id: string) => void;
  
  addWorklog: (worklog: Omit<QAWorklog, 'id' | 'createdAt'>) => QAWorklog;
  updateWorklog: (id: string, updates: Partial<QAWorklog>) => QAWorklog;
  deleteWorklog: (id: string) => void;
}

export const useProjectMonitorStore = create<ProjectMonitorState>((set, get) => ({
  projects: [],
  worklogs: [],
  isLoading: true,

  fetchData: () => {
    set({ isLoading: true });
    const projects = storage.getProjects();
    const worklogs = storage.getWorklogs();
    set({ projects, worklogs, isLoading: false });
  },

  addProject: (project) => {
    const newProj = storage.createProject(project);
    get().fetchData();
    return newProj;
  },

  updateProject: (id, updates) => {
    const updated = storage.updateProject(id, updates);
    get().fetchData();
    return updated;
  },

  deleteProject: (id) => {
    storage.deleteProject(id);
    get().fetchData();
  },

  addWorklog: (worklog) => {
    const newLog = storage.createWorklog(worklog);
    get().fetchData();
    return newLog;
  },

  updateWorklog: (id, updates) => {
    const updated = storage.updateWorklog(id, updates);
    get().fetchData();
    return updated;
  },

  deleteWorklog: (id) => {
    storage.deleteWorklog(id);
    get().fetchData();
  },
}));
