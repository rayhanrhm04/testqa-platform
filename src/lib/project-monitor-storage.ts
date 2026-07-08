import { QAProject, QAWorklog, QAStatus } from './project-monitor-types';

const PROJECTS_KEY = 'qa_monitor_projects';
const WORKLOGS_KEY = 'qa_monitor_worklogs';

// Helper to check if window is defined (browser environment)
const isBrowser = () => typeof window !== 'undefined';

// ISO Week calculation helper
export function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

// 1. Projects Storage API
export function getProjects(): QAProject[] {
  if (!isBrowser()) return [];
  const stored = localStorage.getItem(PROJECTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getProject(id: string): QAProject | null {
  const projects = getProjects();
  return projects.find((p) => p.id === id) || null;
}

export function createProject(project: Omit<QAProject, 'id' | 'createdAt' | 'lastUpdate'>): QAProject {
  const projects = getProjects();
  const newProject: QAProject = {
    ...project,
    id: `qap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  };
  projects.push(newProject);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return newProject;
}

export function updateProject(id: string, updates: Partial<QAProject>): QAProject {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Project with ID ${id} not found.`);
  }

  const updatedProject: QAProject = {
    ...projects[index],
    ...updates,
    lastUpdate: new Date().toISOString(),
  };

  projects[index] = updatedProject;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return updatedProject;
}

export function deleteProject(id: string): void {
  const projects = getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));

  // Cascade delete associated worklogs
  const worklogs = getWorklogs();
  const remainingLogs = worklogs.filter((log) => log.projectId !== id);
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(remainingLogs));
}

// 2. Worklogs Storage API
export function getWorklogs(projectId?: string): QAWorklog[] {
  if (!isBrowser()) return [];
  const stored = localStorage.getItem(WORKLOGS_KEY);
  const logs: QAWorklog[] = stored ? JSON.parse(stored) : [];
  if (projectId) {
    return logs.filter((log) => log.projectId === projectId);
  }
  return logs;
}

export function createWorklog(worklog: Omit<QAWorklog, 'id' | 'createdAt'>): QAWorklog {
  const logs = getWorklogs();
  const newLog: QAWorklog = {
    ...worklog,
    id: `qawl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  logs.push(newLog);
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(logs));

  // Sync project progress and lastUpdate timestamp automatically
  const project = getProject(worklog.projectId);
  if (project) {
    updateProject(worklog.projectId, {
      progress: worklog.progress,
      qaStatus: worklog.qaStatus,
    });
  }

  return newLog;
}

export function updateWorklog(id: string, updates: Partial<QAWorklog>): QAWorklog {
  const logs = getWorklogs();
  const index = logs.findIndex((log) => log.id === id);
  if (index === -1) {
    throw new Error(`Worklog with ID ${id} not found.`);
  }

  const updatedLog: QAWorklog = {
    ...logs[index],
    ...updates,
  };

  logs[index] = updatedLog;
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(logs));

  // Sync project progress if this is the latest worklog
  const projectLogs = logs.filter((l) => l.projectId === updatedLog.projectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (projectLogs.length > 0 && projectLogs[0].id === id) {
    updateProject(updatedLog.projectId, {
      progress: updatedLog.progress,
      qaStatus: updatedLog.qaStatus,
    });
  }

  return updatedLog;
}

export function deleteWorklog(id: string): void {
  const logs = getWorklogs();
  const logToDelete = logs.find((l) => l.id === id);
  if (!logToDelete) return;

  const filtered = logs.filter((l) => l.id !== id);
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(filtered));

  // Sync project progress to the previous latest worklog if any remains
  const projectLogs = filtered.filter((l) => l.projectId === logToDelete.projectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (projectLogs.length > 0) {
    updateProject(logToDelete.projectId, {
      progress: projectLogs[0].progress,
      qaStatus: projectLogs[0].qaStatus,
    });
  } else {
    updateProject(logToDelete.projectId, {
      progress: 0,
    });
  }
}

// 3. Weekly Summary Generator
export interface WeeklySummaryResult {
  week: number;
  year: number;
  startProgress: number;
  endProgress: number;
  achievements: string[];
  blockers: string[];
  needSupport: string[];
  nextWeek: string[];
}

export function generateWeeklySummary(projectId: string, weekNumber: number, year: number): WeeklySummaryResult {
  const logs = getWorklogs(projectId);
  
  // Filter logs by week and year
  const weekLogs = logs.filter((log) => {
    const { week, year: logYear } = getWeekNumber(new Date(log.date));
    return week === weekNumber && logYear === year;
  });

  // Sort logs chronologically to compute progress diff
  const sortedLogs = [...weekLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let startProgress = 0;
  let endProgress = 0;
  
  if (sortedLogs.length > 0) {
    endProgress = sortedLogs[sortedLogs.length - 1].progress;
    
    // Find previous progress before this week
    const priorLogs = logs.filter((log) => {
      const { week, year: logYear } = getWeekNumber(new Date(log.date));
      return (logYear < year) || (logYear === year && week < weekNumber);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    startProgress = priorLogs.length > 0 ? priorLogs[0].progress : sortedLogs[0].progress;
  }

  const parseBulletedText = (text: string): string[] => {
    if (!text) return [];
    return text
      .split('\n')
      .map((line) => line.trim().replace(/^[\*\-\+]\s*/, ''))
      .filter((line) => line.length > 0);
  };

  const achievements: string[] = [];
  const blockers: string[] = [];
  const needSupport: string[] = [];
  const nextWeek: string[] = [];

  sortedLogs.forEach((log) => {
    achievements.push(...parseBulletedText(log.todayAchievement));
    blockers.push(...parseBulletedText(log.blocker));
    needSupport.push(...parseBulletedText(log.needSupport));
    nextWeek.push(...parseBulletedText(log.nextPlan));
  });

  return {
    week: weekNumber,
    year,
    startProgress,
    endProgress,
    achievements: Array.from(new Set(achievements)),
    blockers: Array.from(new Set(blockers)),
    needSupport: Array.from(new Set(needSupport)),
    nextWeek: Array.from(new Set(nextWeek)),
  };
}
