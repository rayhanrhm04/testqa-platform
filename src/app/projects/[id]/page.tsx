'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useProjectMonitorStore } from '@/store/useProjectMonitorStore';
import { 
  QA_STATUS_LIST, PRIORITY_LIST, WORKLOAD_LIST, COLOR_LABELS, MOODS, 
  QAStatus, Priority, Workload, WorklogMode, WorklogMood, QAWorklog, QAProject 
} from '@/lib/project-monitor-types';
import { 
  ChevronLeft, Edit3, Trash2, Calendar, ClipboardList, Clock, 
  BookOpen, Plus, FileText, ChevronLeftSquare, ChevronRightSquare, 
  Check, X, AlertTriangle, Info, Smile, ChevronRight
} from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { getWeekNumber, generateWeeklySummary, WeeklySummaryResult } from '@/lib/project-monitor-storage';

// jsPDF imports
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { 
    projects, worklogs, isLoading, fetchData, 
    deleteProject, addWorklog, updateWorklog, deleteWorklog 
  } = useProjectMonitorStore();

  const [activeTab, setActiveTab] = React.useState('overview');

  // Worklog Form Modal state
  const [isLogModalOpen, setIsLogModalOpen] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<QAWorklog | null>(null);

  // Worklog Form states
  const [logDate, setLogDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [logMode, setLogMode] = React.useState<WorklogMode>('Daily');
  const [logProgress, setLogProgress] = React.useState(0);
  const [logStatus, setLogStatus] = React.useState<QAStatus>('Planning');
  const [logTask, setLogTask] = React.useState('');
  const [logBlocker, setLogBlocker] = React.useState('');
  const [logSupport, setLogSupport] = React.useState('');
  const [logAchievement, setLogAchievement] = React.useState('');
  const [logNextPlan, setLogNextPlan] = React.useState('');
  const [logNotes, setLogNotes] = React.useState('');
  const [logMood, setLogMood] = React.useState<WorklogMood>('Normal');
  const [logError, setLogError] = React.useState('');

  // Calendar state
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<string | null>(null);

  // Confirm delete project
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const project = projects.find(p => p.id === id);
  const projectLogs = React.useMemo(() => {
    return worklogs.filter(log => log.projectId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [worklogs, id]);

  // Set default form values when project is loaded
  React.useEffect(() => {
    if (project) {
      setLogStatus(project.qaStatus);
      setLogProgress(project.progress);
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading Project...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <div className="rounded-full bg-red-500/10 p-4 text-red-500 border border-red-500/20">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">Project Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The project you are looking for does not exist or has been deleted.
          </p>
        </div>
        <Link href="/projects">
          <button className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer">
            Back to Projects
          </button>
        </Link>
      </div>
    );
  }

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'Critical': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30';
      case 'High': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30';
      default: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
    }
  };

  const getWorkloadColor = (wl: string) => {
    switch (wl) {
      case 'Critical': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
      case 'High': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  // Open Log form for creating
  const handleOpenAddLog = () => {
    setEditingLog(null);
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogMode('Daily');
    setLogProgress(project.progress);
    setLogStatus(project.qaStatus);
    setLogTask('');
    setLogBlocker('');
    setLogSupport('');
    setLogAchievement('');
    setLogNextPlan('');
    setLogNotes('');
    setLogMood('Normal');
    setLogError('');
    setIsLogModalOpen(true);
  };

  // Open Log form for editing
  const handleOpenEditLog = (log: QAWorklog) => {
    setEditingLog(log);
    setLogDate(log.date);
    setLogMode(log.mode);
    setLogProgress(log.progress);
    setLogStatus(log.qaStatus);
    setLogTask(log.currentTask);
    setLogBlocker(log.blocker || '');
    setLogSupport(log.needSupport || '');
    setLogAchievement(log.todayAchievement);
    setLogNextPlan(log.nextPlan);
    setLogNotes(log.notes || '');
    setLogMood(log.mood);
    setLogError('');
    setIsLogModalOpen(true);
  };

  // Submit Worklog
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogError('');

    if (!logDate) {
      setLogError('Date is required.');
      return;
    }
    if (!logTask.trim()) {
      setLogError('Current Task details are required.');
      return;
    }
    if (!logAchievement.trim()) {
      setLogError('Today\'s Achievement is required.');
      return;
    }

    try {
      const payload = {
        projectId: id,
        date: logDate,
        mode: logMode,
        progress: Number(logProgress),
        qaStatus: logStatus,
        currentTask: logTask.trim(),
        blocker: logBlocker.trim(),
        needSupport: logSupport.trim(),
        todayAchievement: logAchievement.trim(),
        nextPlan: logNextPlan.trim(),
        notes: logNotes.trim(),
        mood: logMood,
      };

      if (editingLog) {
        updateWorklog(editingLog.id, payload);
      } else {
        addWorklog(payload);
      }
      setIsLogModalOpen(false);
    } catch (err: any) {
      setLogError(err.message || 'An error occurred.');
    }
  };

  // Delete Worklog
  const handleDeleteLog = (logId: string) => {
    if (confirm('Are you sure you want to delete this worklog?')) {
      deleteWorklog(logId);
    }
  };

  // Delete Project
  const handleDeleteProject = () => {
    deleteProject(id);
    router.push('/projects');
  };

  // 1. Overview Tab Render
  const renderOverview = () => {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: General Specs */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-4">Project Overview</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Client Name</p>
                <p className="text-sm font-bold text-foreground mt-1">{project.client}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Product Type</p>
                <p className="text-sm font-bold text-foreground mt-1">{project.product}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Description</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed bg-slate-50/50 dark:bg-zinc-900/10 p-3 rounded-lg border border-border/40">
                  {project.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-4">Color Label & Notes</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Project Label:</p>
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: project.colorLabel }} />
                <span className="text-xs font-bold text-foreground">
                  {COLOR_LABELS.find(cl => cl.value === project.colorLabel)?.name || 'Default'}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">QA Specific Notes</p>
                <div className="text-xs text-muted-foreground leading-relaxed bg-slate-50/50 dark:bg-zinc-900/10 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                  {project.notes || 'No project-specific notes logged.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Key Metadata / Stats */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-4">Status & Workload</h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">QA Phase</span>
                <span className="font-bold text-foreground bg-secondary px-2.5 py-0.5 rounded-lg border border-border/50">
                  {project.qaStatus}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Priority</span>
                <span className={`font-bold px-2 py-0.5 rounded-lg border ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">QA Workload</span>
                <span className={`font-bold px-2 py-0.5 rounded-lg border ${getWorkloadColor(project.workload)}`}>
                  {project.workload}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Target Release</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {project.releaseTarget}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Worklogs Count</span>
                <span className="font-black text-foreground">{projectLogs.length} logs</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Created At</span>
                <span className="font-bold text-foreground">{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground font-semibold">Last Update</span>
                <span className="font-bold text-foreground">{new Date(project.lastUpdate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">
              Deleting this project is irreversible. It will also permanently delete all associated daily/weekly worklogs.
            </p>
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white transition-colors text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1"
            >
              <Trash2 className="h-4 w-4" /> Delete Project
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 2. Calendar and Worklog Tab Render
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month); // Day of week (0 = Sunday, etc.)

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weeks = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const cells: React.ReactNode[] = [];
    
    // Empty cells for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-10 border border-border/10 bg-slate-50/10 dark:bg-zinc-900/5" />);
    }

    // Days in the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayLogs = projectLogs.filter((log) => log.date === dateStr);
      
      const isSelected = selectedCalendarDate === dateStr;
      
      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
          className={`h-10 border border-border/30 flex flex-col justify-between p-1 text-[10px] font-bold transition-all relative cursor-pointer outline-none hover:bg-slate-50 dark:hover:bg-zinc-800 ${
            isSelected 
              ? 'bg-primary/10 border-primary text-primary hover:bg-primary/15' 
              : 'text-foreground'
          }`}
        >
          <span>{day}</span>
          {dayLogs.length > 0 && (
            <span className="absolute bottom-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[8px] text-primary-foreground font-black">
              {dayLogs.length}
            </span>
          )}
        </button>
      );
    }

    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs">
        {/* Month selector header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {months[month]} {year}
          </h4>
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronLeftSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronRightSquare className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week headers */}
        <div className="grid grid-cols-7 gap-px mb-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {weeks.map((wk) => (
            <div key={wk} className="py-1">{wk}</div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-px border border-border/40 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-900">
          {cells}
        </div>
      </div>
    );
  };

  const renderWorklogsList = () => {
    // Filter by calendar selection if active
    const filteredLogs = selectedCalendarDate 
      ? projectLogs.filter(log => log.date === selectedCalendarDate)
      : projectLogs;

    return (
      <div className="space-y-4">
        {/* Filters status header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {selectedCalendarDate 
              ? `Worklogs for ${new Date(selectedCalendarDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
              : 'All Project Worklogs'
            }
          </h3>
          {selectedCalendarDate && (
            <button 
              onClick={() => setSelectedCalendarDate(null)}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>

        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const moodInfo = MOODS.find(m => m.type === log.mood) || MOODS[1];
            return (
              <div key={log.id} className="bg-card rounded-2xl border border-border/60 p-5 shadow-xs space-y-4 relative">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{moodInfo.emoji}</span>
                    <div>
                      <p className="text-xs font-black text-foreground">
                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                        Mode: <span className="text-foreground">{log.mode}</span> • Mood: <span className="text-foreground">{log.mood}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEditLog(log)}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md cursor-pointer transition-colors"
                      title="Edit Log"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-md cursor-pointer transition-colors"
                      title="Delete Log"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Current Task</p>
                    <p className="text-foreground/90 mt-0.5">{log.currentTask}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Today's Achievement</p>
                    <p className="text-foreground/90 mt-0.5">{log.todayAchievement}</p>
                  </div>
                  {log.blocker && (
                    <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 sm:col-span-2">
                      <p className="text-[9px] uppercase font-black text-red-500">Blocker Warning</p>
                      <p className="text-red-600 dark:text-red-400 font-bold mt-0.5">{log.blocker}</p>
                    </div>
                  )}
                  {log.needSupport && (
                    <div>
                      <p className="text-[9px] uppercase font-bold text-amber-500">Need Support</p>
                      <p className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">{log.needSupport}</p>
                    </div>
                  )}
                  {log.nextPlan && (
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground">Next plan / targets</p>
                      <p className="text-foreground/90 mt-0.5">{log.nextPlan}</p>
                    </div>
                  )}
                  {log.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground">Notes</p>
                      <p className="text-muted-foreground mt-0.5 italic">{log.notes}</p>
                    </div>
                  )}
                </div>

                {/* Footer status bar */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[9px] font-bold text-muted-foreground">
                  <span>QA Status: <span className="text-foreground">{log.qaStatus}</span></span>
                  <span>Progress achieved: <span className="text-foreground">{log.progress}%</span></span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground text-center py-12">No worklogs logged on this day.</p>
        )}
      </div>
    );
  };

  const renderWorklogTab = () => {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Col: Calendar View & Quick Actions */}
        <div>
          <div className="sticky top-6 space-y-6">
            <button
              onClick={handleOpenAddLog}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground transition-colors text-xs font-black uppercase tracking-wider rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" /> Add Worklog Update
            </button>

            {renderCalendar()}
          </div>
        </div>

        {/* Right Col: Logs List */}
        <div className="md:col-span-2">
          {renderWorklogsList()}
        </div>
      </div>
    );
  };

  // 3. Timeline Tab Render
  const renderTimeline = () => {
    return (
      <div className="max-w-2xl mx-auto space-y-6 select-none">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
          <Clock className="w-4 h-4 text-primary" /> Project Update Timeline
        </h3>
        {projectLogs.length > 0 ? (
          <div className="relative pl-6 border-l border-border/60 space-y-6 py-2">
            {projectLogs.map((log) => {
              const moodInfo = MOODS.find(m => m.type === log.mood) || MOODS[1];
              return (
                <div key={log.id} className="relative group">
                  {/* Timeline dot icon indicator */}
                  <span className="absolute -left-9.5 top-0.5 w-7 h-7 rounded-full bg-slate-50 dark:bg-zinc-950 border border-border/80 flex items-center justify-center text-xs pointer-events-none select-none shadow-xs">
                    {moodInfo.emoji}
                  </span>
                  
                  {/* Timeline content card */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs space-y-3.5 hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black">
                      <span className="text-foreground text-xs font-extrabold">
                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-primary uppercase tracking-wider">{log.mode}</span>
                    </div>

                    <div className="text-xs space-y-2.5">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">CURRENT TASK</span>
                        <p className="text-foreground/90 font-medium">{log.currentTask}</p>
                      </div>
                      
                      {log.blocker && (
                        <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                          <span className="text-[9px] uppercase font-black text-red-500 block mb-0.5">BLOCKER</span>
                          <p className="text-red-600 dark:text-red-400 font-bold">{log.blocker}</p>
                        </div>
                      )}
                      
                      {log.needSupport && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-amber-500 block mb-0.5">NEED SUPPORT</span>
                          <p className="text-amber-600 dark:text-amber-400 font-bold">{log.needSupport}</p>
                        </div>
                      )}

                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">TODAY'S ACHIEVEMENT</span>
                        <p className="text-foreground/90 font-medium">{log.todayAchievement}</p>
                      </div>

                      {log.nextPlan && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">NEXT PLAN</span>
                          <p className="text-foreground/90">{log.nextPlan}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[9px] font-bold text-muted-foreground">
                      <span>Phase: <span className="text-foreground">{log.qaStatus}</span></span>
                      <span>Progress: <span className="text-foreground">{log.progress}%</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center shadow-xs">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-xs font-bold text-foreground">Timeline is empty</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Start logging work updates to build the project timeline history.</p>
          </div>
        )}
      </div>
    );
  };

  // 4. Weekly Summary Tab Render
  const renderWeeklySummary = () => {
    // Generate distinct week/year combinations present in logs
    const weekKeys = Array.from(new Set(projectLogs.map(log => {
      const { week, year } = getWeekNumber(new Date(log.date));
      return `${week}-${year}`;
    })));

    const summaries = weekKeys.map(key => {
      const [weekNum, yearNum] = key.split('-').map(Number);
      return {
        key,
        summary: generateWeeklySummary(id, weekNum, yearNum),
      };
    }).sort((a, b) => {
      // Sort newest week first
      const [wA, yA] = a.key.split('-').map(Number);
      const [wB, yB] = b.key.split('-').map(Number);
      return yB - yA || wB - wA;
    });

    return (
      <div className="max-w-2xl mx-auto space-y-6 select-none">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
          <BookOpen className="w-4 h-4 text-primary" /> Generated Weekly Summaries
        </h3>

        {summaries.length > 0 ? (
          summaries.map(({ key, summary }) => (
            <div key={key} className="bg-card rounded-2xl border border-border/60 p-5 shadow-xs space-y-4 hover:border-primary/20 transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <h4 className="text-sm font-black text-foreground">Week {summary.week} ({summary.year})</h4>
                <div className="text-[10px] font-bold text-muted-foreground">
                  Progress Trend: <span className="text-foreground font-black">{summary.startProgress}% → {summary.endProgress}%</span>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <h5 className="text-[10px] uppercase font-black text-emerald-500 tracking-wider mb-1">Achievements</h5>
                {summary.achievements.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-foreground/90 space-y-1 pl-1">
                    {summary.achievements.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No achievements logged this week.</p>
                )}
              </div>

              {/* Blockers */}
              {summary.blockers.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <h5 className="text-[10px] uppercase font-black text-red-500 tracking-wider mb-1">Current Blocker</h5>
                  <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 font-bold space-y-1 pl-1">
                    {summary.blockers.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Need Support */}
              {summary.needSupport.length > 0 && (
                <div>
                  <h5 className="text-[10px] uppercase font-black text-amber-500 tracking-wider mb-1">Need Support</h5>
                  <ul className="list-disc list-inside text-xs text-amber-600 dark:text-amber-400 font-bold space-y-1 pl-1">
                    {summary.needSupport.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Week plans */}
              <div>
                <h5 className="text-[10px] uppercase font-black text-primary tracking-wider mb-1">Next Week Plans</h5>
                {summary.nextWeek.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-foreground/90 space-y-1 pl-1">
                    {summary.nextWeek.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No upcoming plans logged.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center shadow-xs">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-xs font-bold text-foreground">No summaries generated</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Weekly summaries will appear automatically once you log work updates.</p>
          </div>
        )}
      </div>
    );
  };

  // 5. Export PDF Handler
  const handleExportPDF = () => {
    const doc = new jsPDF() as any;

    // A. COVER PAGE
    doc.setFillColor(9, 9, 11); // zinc-950 dark background style
    doc.rect(0, 0, 210, 297, 'F');

    // Branding / Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('QA PROJECT REPORT', 20, 100);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(161, 161, 170); // zinc-400 color
    doc.text('Platform: MAPID QA Portal', 20, 115);

    // Divider line
    doc.setDrawColor(59, 130, 246); // Blue primary accent line
    doc.setLineWidth(2);
    doc.line(20, 125, 100, 125);

    // Project Info
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Project Name: ${project.name}`, 20, 150);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(212, 212, 216); // zinc-300
    doc.text(`Client: ${project.client}`, 20, 165);
    doc.text(`Product Type: ${project.product}`, 20, 175);
    doc.text(`Status QA: ${project.qaStatus}`, 20, 185);
    doc.text(`Progress Completed: ${project.progress}%`, 20, 195);
    doc.text(`Release Target: ${project.releaseTarget}`, 20, 205);

    // Metadata Footer on cover
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 20, 260);
    doc.text(`Created by: MAPID QA Solo Engineer`, 20, 270);

    // B. PROJECT OVERVIEW PAGE
    doc.addPage();
    doc.setTextColor(9, 9, 11);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Overview', 14, 20);

    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(14, 24, 196, 24);

    // Table of general project attributes
    doc.autoTable({
      startY: 30,
      head: [['Parameter', 'Description / Value']],
      body: [
        ['Project Name', project.name],
        ['Client Name', project.client],
        ['Product Type', project.product],
        ['QA Status Phase', project.qaStatus],
        ['Priority Rating', project.priority],
        ['QA Workload', project.workload],
        ['Current Progress', `${project.progress}%`],
        ['Release Target', project.releaseTarget],
        ['Total Worklogs Logged', `${projectLogs.length} updates`],
        ['Created At', new Date(project.createdAt).toLocaleDateString()],
        ['Last Update', new Date(project.lastUpdate).toLocaleDateString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Project Notes
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('QA Notes:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(project.notes || 'No project-specific notes logged.', 182);
    doc.text(splitNotes, 14, currentY + 6);

    // C. WEEKLY SUMMARY PAGE
    const weekKeys = Array.from(new Set(projectLogs.map(log => {
      const { week, year } = getWeekNumber(new Date(log.date));
      return `${week}-${year}`;
    })));

    const summaries = weekKeys.map(key => {
      const [weekNum, yearNum] = key.split('-').map(Number);
      return generateWeeklySummary(id, weekNum, yearNum);
    }).sort((a, b) => b.year - a.year || b.week - a.week);

    if (summaries.length > 0) {
      doc.addPage();
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Weekly Summaries', 14, 20);
      doc.line(14, 24, 196, 24);

      let summaryY = 32;

      summaries.forEach((summary) => {
        if (summaryY > 240) {
          doc.addPage();
          summaryY = 30;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Week ${summary.week} (${summary.year}) - Progress: ${summary.startProgress}% to ${summary.endProgress}%`, 14, summaryY);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Achievements:', 16, summaryY + 6);
        doc.setFont('helvetica', 'normal');
        let achText = summary.achievements.map(a => `• ${a}`).join('\n') || 'None';
        let splitAch = doc.splitTextToSize(achText, 178);
        doc.text(splitAch, 18, summaryY + 11);
        
        let achHeight = splitAch.length * 5;
        let nextBlockerY = summaryY + 11 + achHeight + 3;

        if (summary.blockers.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Current Blockers:', 16, nextBlockerY);
          doc.setFont('helvetica', 'normal');
          let blkText = summary.blockers.map(b => `• ${b}`).join('\n');
          let splitBlk = doc.splitTextToSize(blkText, 178);
          doc.text(splitBlk, 18, nextBlockerY + 5);
          nextBlockerY += (splitBlk.length * 5) + 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Next Week Plans:', 16, nextBlockerY);
        doc.setFont('helvetica', 'normal');
        let nextText = summary.nextWeek.map(n => `• ${n}`).join('\n') || 'None';
        let splitNext = doc.splitTextToSize(nextText, 178);
        doc.text(splitNext, 18, nextBlockerY + 5);

        // Underline separator
        summaryY = nextBlockerY + (splitNext.length * 5) + 12;
        doc.setDrawColor(240, 240, 240);
        doc.line(14, summaryY - 6, 196, summaryY - 6);
      });
    }

    // D. TIMELINE HISTORY PAGE
    if (projectLogs.length > 0) {
      doc.addPage();
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Activity & Worklog Timeline', 14, 20);
      doc.line(14, 24, 196, 24);

      const tableBody = projectLogs.map((log) => [
        new Date(log.date).toLocaleDateString(),
        log.mode,
        log.currentTask,
        log.todayAchievement,
        log.blocker || 'None',
        `${log.progress}%`,
        log.mood,
      ]);

      doc.autoTable({
        startY: 30,
        head: [['Date', 'Mode', 'Task Details', 'Achievements', 'Blockers', 'Prog', 'Mood']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: {
          2: { cellWidth: 35 },
          3: { cellWidth: 45 },
          4: { cellWidth: 25 },
        },
      });
    }

    // Save File
    doc.save(`QA_Report_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  const tabsConfig = [
    { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
    { id: 'worklog', label: 'Worklog', icon: <Smile className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
    { id: 'summary', label: 'Weekly Summary', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Back button and Edit */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Projects
        </Link>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Export PDF
          </button>
          
          <Link href={`/projects/${id}/edit`}>
            <button className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer transition-colors">
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Project
            </button>
          </Link>
        </div>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.colorLabel }} />
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-foreground">{project.name}</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
            Client: {project.client} • Product: {project.product}
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <Tabs 
        tabs={tabsConfig} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
        className="mb-4"
      />

      {/* Content wrapper */}
      <div className="pt-2">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'worklog' && renderWorklogTab()}
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'summary' && renderWeeklySummary()}
      </div>

      {/* ADD / EDIT WORKLOG MODAL */}
      <Dialog
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={editingLog ? 'Edit Worklog' : 'Add Worklog Update'}
        size="lg"
      >
        <form onSubmit={handleLogSubmit} className="space-y-4 mt-2">
          {logError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-lg">
              {logError}
            </div>
          )}

          {/* Row 1: Date & Mode */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Date <span className="text-red-500">*</span></label>
              <input 
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Logging Mode</label>
              <select
                value={logMode}
                onChange={(e) => setLogMode(e.target.value as WorklogMode)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                <option value="Daily">Daily Update</option>
                <option value="Weekly">Weekly Summary Log</option>
              </select>
            </div>
          </div>

          {/* Row 2: Status & Progress */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">QA Status Phase</label>
              <select
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value as QAStatus)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                {QA_STATUS_LIST.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                <span className="uppercase">Progress achieved</span>
                <span className="text-foreground">{logProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={logProgress}
                onChange={(e) => setLogProgress(Number(e.target.value))}
                className="w-full h-8 cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Row 3: Current Task */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Current Task <span className="text-red-500">*</span></label>
            <input 
              type="text"
              placeholder="e.g. Smoke Testing auth modules, Writing regression suite"
              value={logTask}
              onChange={(e) => setLogTask(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
          </div>

          {/* Row 4: Achievements & Plans */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Today's Achievements <span className="text-red-500">*</span></label>
              <textarea
                placeholder="List what you accomplished (use newlines for bullets)..."
                value={logAchievement}
                onChange={(e) => setLogAchievement(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Next plan / targets</label>
              <textarea
                placeholder="List what you plan to tackle next..."
                value={logNextPlan}
                onChange={(e) => setLogNextPlan(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Row 5: Blocker & Support */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-red-500">Blockers</label>
              <input 
                type="text"
                placeholder="What is blocking you? (e.g. Server down, pending API fix)"
                value={logBlocker}
                onChange={(e) => setLogBlocker(e.target.value)}
                className="w-full h-9 rounded-lg border border-red-200 focus:border-red-500 bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-amber-500">Need Support From</label>
              <input 
                type="text"
                placeholder="Who do you need help from? (e.g. Backend Dev, PM)"
                value={logSupport}
                onChange={(e) => setLogSupport(e.target.value)}
                className="w-full h-9 rounded-lg border border-amber-200 focus:border-amber-500 bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 text-foreground"
              />
            </div>
          </div>

          {/* Row 6: Mood & Notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Today's Mood / Workload</label>
              <div className="flex items-center gap-2">
                {MOODS.map(m => (
                  <button
                    type="button"
                    key={m.type}
                    onClick={() => setLogMood(m.type)}
                    className={`flex-1 py-1.5 rounded-lg border text-sm flex flex-col items-center cursor-pointer transition-all ${
                      logMood === m.type
                        ? 'border-primary bg-primary/5 font-bold'
                        : 'border-border bg-card hover:bg-slate-50'
                    }`}
                    title={m.label}
                  >
                    <span>{m.emoji}</span>
                    <span className="text-[8px] mt-0.5 text-muted-foreground">{m.type.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">General Notes</label>
              <input 
                type="text"
                placeholder="Any additional details or comments..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer"
            >
              {editingLog ? 'Update log' : 'Save update'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* CONFIRM DELETE PROJECT DIALOG */}
      <Dialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Project?"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you absolutely sure you want to delete **{project.name}**? This will permanently delete the project and all **{projectLogs.length} associated worklogs** from localStorage. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 text-xs font-bold cursor-pointer"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
