'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCalendarStore } from '@/store/useCalendarStore';
import { useProjectMonitorStore } from '@/store/useProjectMonitorStore';
import { 
  CalendarEvent, CalendarEventType, CalendarWorkload, 
  CalendarEventStatus, CALENDAR_EVENT_TYPES, EVENT_TYPE_COLORS 
} from '@/lib/calendar-types';
import { getCalendarWorkloadByDate, getManualWorkloads } from '@/lib/calendar-storage';
import { 
  Calendar as CalendarIcon, Plus, FileText, ChevronLeftSquare, 
  ChevronRightSquare, Edit3, Trash2, CheckCircle, Info, ExternalLink, 
  Clock, AlertTriangle, AlertCircle, RefreshCw, X, Folder, HelpCircle
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';

// jsPDF imports
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CalendarHubPage() {
  const router = useRouter();
  
  const { allEvents, isLoading, fetchData, addEvent, updateEvent, deleteEvent, setManualWorkload } = useCalendarStore();
  const { projects, fetchData: fetchProjects } = useProjectMonitorStore();

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'day' | 'list'>('month');
  
  // Drawer/Modal States
  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);

  // Form states for manual event
  const [eventTitle, setEventTitle] = React.useState('');
  const [eventType, setEventType] = React.useState<CalendarEventType>('Meeting');
  const [eventProjectId, setEventProjectId] = React.useState('');
  const [eventDate, setEventDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = React.useState('');
  const [eventEndTime, setEventEndTime] = React.useState('');
  const [eventWorkload, setEventWorkload] = React.useState<CalendarWorkload>('Medium');
  const [eventDescription, setEventDescription] = React.useState('');
  const [eventLocation, setEventLocation] = React.useState('');
  const [eventReminder, setEventReminder] = React.useState('');
  const [eventColor, setEventColor] = React.useState('#3b82f6');
  const [eventStatus, setEventStatus] = React.useState<CalendarEventStatus>('Upcoming');
  const [eventIsAllDay, setEventIsAllDay] = React.useState(false);
  const [eventTimeZone, setEventTimeZone] = React.useState('GMT+07:00');
  const [eventRecurrence, setEventRecurrence] = React.useState<'none' | 'daily' | 'weekly' | 'monthly' | 'monthly_weekday' | 'annually' | 'weekday' | 'custom'>('none');
  const [eventRecurrenceEnd, setEventRecurrenceEnd] = React.useState('');
  const [eventRecurrenceInterval, setEventRecurrenceInterval] = React.useState(1);
  const [eventRecurrenceType, setEventRecurrenceType] = React.useState<'day' | 'week' | 'month' | 'year'>('week');
  const [formError, setFormError] = React.useState('');

  // Export PDF selector modal state
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [exportOption, setExportOption] = React.useState<'daily' | 'weekly' | 'monthly' | 'project'>('monthly');
  const [exportProjectId, setExportProjectId] = React.useState('');

  React.useEffect(() => {
    fetchProjects();
    fetchData();
  }, [fetchData, fetchProjects]);

  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60;
      const sign = offsetHours >= 0 ? '+' : '-';
      const absHours = Math.abs(Math.floor(offsetHours));
      const absMinutes = Math.abs(offsetMinutes % 60);
      const offsetStr = `GMT${sign}${String(absHours).padStart(2, '0')}:${String(absMinutes).padStart(2, '0')}`;
      setEventTimeZone(`${tz} (${offsetStr})`);
    } catch (e) {
      setEventTimeZone('GMT+07:00');
    }
  }, []);

  const dateCalculatedOptions = React.useMemo(() => {
    if (!eventDate) return { weekly: '', monthlyWeekday: '', annually: '' };
    try {
      const parts = eventDate.split('-');
      if (parts.length !== 3) return { weekly: '', monthlyWeekday: '', annually: '' };
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (isNaN(date.getTime())) return { weekly: '', monthlyWeekday: '', annually: '' };

      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
      const ordinal = ordinals[Math.ceil(date.getDate() / 7) - 1] || 'first';
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      const dayNum = date.getDate();

      return {
        weekly: `Weekly on ${dayName}`,
        monthlyWeekday: `Monthly on the ${ordinal} ${dayName}`,
        annually: `Annually on ${monthName} ${dayNum}`,
      };
    } catch (e) {
      return { weekly: '', monthlyWeekday: '', annually: '' };
    }
  }, [eventDate]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else if (viewMode === 'day') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else if (viewMode === 'day') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  // Open detail panel
  const handleOpenDetail = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  // Open Form modal for adding
  const handleOpenAddEvent = (initialDateStr?: string) => {
    setEditingEvent(null);
    setEventTitle('');
    setEventType('Meeting');
    setEventProjectId('');
    setEventDate(initialDateStr || new Date().toISOString().split('T')[0]);
    setEventStartTime('');
    setEventEndTime('');
    setEventWorkload('Medium');
    setEventDescription('');
    setEventLocation('');
    setEventReminder('');
    setEventColor('#3b82f6');
    setEventStatus('Upcoming');
    setEventIsAllDay(false);
    setEventRecurrence('none');
    setEventRecurrenceEnd('');
    setEventRecurrenceInterval(1);
    setEventRecurrenceType('week');
    setFormError('');
    setIsEventModalOpen(true);
  };

  // Open Form modal for editing
  const handleOpenEditEvent = (event: CalendarEvent) => {
    if (event.source !== 'Manual') {
      alert('Automatic events (Project release targets and Worklogs) cannot be modified.');
      return;
    }
    setIsDetailOpen(false);
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventType(event.type);
    setEventProjectId(event.projectId || '');
    setEventDate(event.date);
    setEventStartTime(event.startTime || '');
    setEventEndTime(event.endTime || '');
    setEventWorkload(event.workload);
    setEventDescription(event.description || '');
    setEventLocation(event.locationOrLink || '');
    setEventReminder(event.reminderNote || '');
    setEventColor(event.colorLabel || '#3b82f6');
    setEventStatus(event.status);
    setEventIsAllDay(!!event.isAllDay);
    setEventRecurrence(event.recurrence || 'none');
    setEventRecurrenceEnd(event.recurrenceEnd || '');
    setEventRecurrenceInterval(event.recurrenceInterval || 1);
    setEventRecurrenceType(event.recurrenceType || 'week');
    setFormError('');
    setIsEventModalOpen(true);
  };

  // Form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!eventTitle.trim()) {
      setFormError('Event Title is required.');
      return;
    }
    if (!eventDate) {
      setFormError('Date is required.');
      return;
    }

    const relatedProject = projects.find(p => p.id === eventProjectId);

    const payload = {
      title: eventTitle.trim(),
      type: eventType,
      projectId: eventProjectId || undefined,
      projectName: relatedProject ? relatedProject.name : undefined,
      date: eventDate,
      startTime: eventIsAllDay ? undefined : (eventStartTime || undefined),
      endTime: eventIsAllDay ? undefined : (eventEndTime || undefined),
      workload: eventWorkload,
      description: eventDescription.trim() || undefined,
      locationOrLink: eventLocation.trim() || undefined,
      reminderNote: eventReminder.trim() || undefined,
      colorLabel: eventColor,
      status: eventStatus,
      isAllDay: eventIsAllDay,
      timeZone: eventTimeZone,
      recurrence: eventRecurrence,
      recurrenceEnd: eventRecurrenceEnd || undefined,
      recurrenceInterval: eventRecurrence === 'custom' ? eventRecurrenceInterval : undefined,
      recurrenceType: eventRecurrence === 'custom' ? eventRecurrenceType : undefined,
    };

    try {
      if (editingEvent) {
        updateEvent(editingEvent.id, payload);
      } else {
        addEvent(payload);
      }
      setIsEventModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    }
  };

  // Mark as Done
  const handleMarkAsDone = (event: CalendarEvent) => {
    if (event.source === 'Manual') {
      updateEvent(event.id, { status: 'Done' });
      setIsDetailOpen(false);
    } else {
      alert('Status of automated events cannot be manually edited.');
    }
  };

  // Delete manual event
  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEvent(eventId);
      setIsDetailOpen(false);
    }
  };

  // Calendar Math Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Adjust to Sunday
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getWorkloadBorderColor = (wl: string) => {
    switch (wl) {
      case 'Critical': return 'border-red-500 bg-red-500/5 hover:bg-red-500/10';
      case 'Very Busy': return 'border-orange-500 bg-orange-500/5 hover:bg-orange-500/10';
      case 'Busy': return 'border-amber-500 bg-amber-500/5 hover:bg-amber-500/10';
      default: return 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10';
    }
  };

  const getWorkloadText = (wl: string) => {
    switch (wl) {
      case 'Critical': return 'Critical Load';
      case 'Very Busy': return 'Very Busy';
      case 'Busy': return 'Busy Day';
      default: return 'Normal Day';
    }
  };

  // 1. MONTH VIEW RENDER
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const weeks = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const cells: React.ReactNode[] = [];

    // Empty cells for offset
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="min-h-[100px] border border-border/10 bg-slate-50/5 dark:bg-zinc-900/5" />);
    }

    // Days grid
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = allEvents.filter(e => e.date === dateStr);
      const workload = getCalendarWorkloadByDate(dateStr, allEvents);
      
      cells.push(
        <div 
          key={`day-${day}`}
          onClick={() => {
            setCurrentDate(new Date(year, month, day));
            setViewMode('day');
          }}
          className={`min-h-[100px] border border-border/40 p-2 flex flex-col justify-between transition-all group cursor-pointer ${
            workload !== 'Empty' ? getWorkloadBorderColor(workload) : 'bg-card hover:bg-slate-50'
          }`}
        >
          {/* Cell Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-foreground">{day}</span>
            {workload !== 'Empty' && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                workload === 'Critical' ? 'bg-red-500 text-white' :
                workload === 'Very Busy' ? 'bg-orange-500 text-white' :
                workload === 'Busy' ? 'bg-amber-500 text-white' :
                'bg-emerald-500 text-white'
              }`}>
                {getWorkloadText(workload).split(' ')[0]}
              </span>
            )}
          </div>

          {/* Events list within cell */}
          <div className="mt-2 space-y-1 flex-1 overflow-y-auto max-h-[80px] scrollbar-none">
            {dayEvents.map(e => {
              const colors = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Other;
              return (
                <button
                  key={e.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenDetail(e);
                  }}
                  className={`w-full text-[9px] font-black px-1.5 py-0.5 rounded-sm text-left truncate flex items-center gap-1 cursor-pointer transition-colors ${colors.bg} ${colors.text}`}
                  title={e.title}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                  <span className="truncate">{e.title}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Add floating button inside cells */}
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleOpenAddEvent(dateStr);
            }}
            className="w-full text-center py-0.5 mt-1 border border-dashed border-border/30 hover:border-primary/50 text-[9px] text-muted-foreground hover:text-primary transition-all rounded-sm opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            + Add Event
          </button>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-px mb-2 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
          {weeks.map(wk => (
            <div key={wk}>{wk}</div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border border-border/40">
          {cells}
        </div>
      </div>
    );
  };

  // 2. WEEK VIEW RENDER
  const renderWeekView = () => {
    const days = getWeekDays(currentDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="grid gap-4 md:grid-cols-7 bg-card rounded-2xl border border-border/50 p-5 shadow-xs">
        {days.map((date, idx) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayEvents = allEvents.filter(e => e.date === dateStr);
          const workload = getCalendarWorkloadByDate(dateStr, allEvents);
          
          return (
            <div 
              key={dateStr} 
              className={`rounded-xl border border-border/50 p-3 min-h-[300px] flex flex-col justify-between ${
                workload !== 'Empty' ? getWorkloadBorderColor(workload) : 'bg-slate-50/20'
              }`}
            >
              {/* Day info */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{dayNames[idx].slice(0, 3)}</h4>
                    <p className="text-sm font-black text-foreground mt-0.5">{date.getDate()}</p>
                  </div>
                  {workload !== 'Empty' && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ 
                      backgroundColor: workload === 'Critical' ? '#ef4444' :
                                       workload === 'Very Busy' ? '#f97316' :
                                       workload === 'Busy' ? '#f59e0b' : '#10b981'
                    }} />
                  )}
                </div>

                {/* Event stacks */}
                <div className="space-y-2">
                  {dayEvents.length > 0 ? (
                    dayEvents.map(e => {
                      const colors = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Other;
                      return (
                        <div 
                          key={e.id}
                          onClick={() => handleOpenDetail(e)}
                          className={`p-2 rounded-lg border border-border/40 cursor-pointer hover:scale-[1.02] transition-transform ${colors.bg}`}
                        >
                          <span className={`text-[8px] font-black uppercase ${colors.text}`}>{e.type}</span>
                          <h5 className="text-[10px] font-bold text-foreground mt-1 truncate">{e.title}</h5>
                          {e.startTime && (
                            <p className="text-[8px] text-muted-foreground mt-0.5 font-bold flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {e.startTime}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center py-8">Free day</p>
                  )}
                </div>
              </div>

              {/* Quick Add */}
              <button 
                onClick={() => handleOpenAddEvent(dateStr)}
                className="w-full py-1 bg-secondary hover:bg-slate-100 border border-border/50 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-all rounded-lg cursor-pointer mt-3"
              >
                + Add Update
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // 3. DAY VIEW RENDER
  const renderDayView = () => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const dayEvents = allEvents.filter(e => e.date === dateStr);
    const workload = getCalendarWorkloadByDate(dateStr, allEvents);

    return (
      <div className="max-w-xl mx-auto bg-card rounded-2xl border border-border/50 p-6 shadow-xs space-y-6 select-none">
        {/* Header workload alerts */}
        <div className="flex items-center justify-between pb-4 border-b border-border/45">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Jadwal Harian</h3>
            <h2 className="text-lg font-black text-foreground mt-0.5">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
          </div>
          {workload !== 'Empty' && (
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider ${
              workload === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-200' :
              workload === 'Very Busy' ? 'bg-orange-500/10 text-orange-500 border-orange-200' :
              workload === 'Busy' ? 'bg-amber-500/10 text-amber-500 border-amber-200' :
              'bg-emerald-500/10 text-emerald-500 border-emerald-200'
            }`}>
              {getWorkloadText(workload)}
            </div>
          )}
        </div>

        {/* Workload Override Selector */}
        <div className="bg-slate-50/50 dark:bg-zinc-900/10 p-3.5 rounded-xl border border-border/40 space-y-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Override Date Workload Indicator</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['Auto', 'Normal', 'Busy', 'Very Busy', 'Critical'] as const).map(level => {
              const currentOverride = getManualWorkloads()[dateStr] || 'Auto';
              const isActive = currentOverride === level;
              
              let activeColor = 'bg-primary text-primary-foreground';
              if (level === 'Normal') activeColor = 'bg-emerald-500 text-white';
              if (level === 'Busy') activeColor = 'bg-amber-500 text-white';
              if (level === 'Very Busy') activeColor = 'bg-orange-500 text-white';
              if (level === 'Critical') activeColor = 'bg-red-500 text-white';

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setManualWorkload(dateStr, level)}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                    isActive 
                      ? `${activeColor} border-transparent shadow-xs scale-105` 
                      : 'bg-card text-muted-foreground border-border hover:bg-slate-50 hover:text-foreground'
                  }`}
                >
                  {level === 'Auto' ? 'Calculated (Auto)' : level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-4">
          {dayEvents.length > 0 ? (
            dayEvents.map(e => {
              const colors = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Other;
              return (
                <div 
                  key={e.id}
                  onClick={() => handleOpenDetail(e)}
                  className={`p-4 rounded-xl border border-border/60 hover:border-primary/30 transition-all cursor-pointer bg-slate-50/30 dark:bg-zinc-900/5 flex items-start justify-between gap-4`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                        {e.type}
                      </span>
                      {e.startTime && (
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {e.startTime} {e.endTime ? `- ${e.endTime}` : ''}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">{e.title}</h4>
                    {e.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{e.description}</p>
                    )}
                  </div>
                  
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${colors.dot}`} />
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border/60 rounded-xl">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-xs font-bold text-foreground/80">No Scheduled Activities</p>
              <p className="text-[11px] text-muted-foreground/75 mt-0.5">Log custom meetings or test phases for this day.</p>
            </div>
          )}
        </div>

        {/* Quick Add bottom */}
        <button
          onClick={() => handleOpenAddEvent(dateStr)}
          className="w-full py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Event for Today
        </button>
      </div>
    );
  };

  // 4. LIST VIEW RENDER
  const renderListView = () => {
    // Filter events starting from today onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingList = allEvents.filter(e => new Date(e.date).getTime() >= today.getTime());

    return (
      <div className="max-w-xl mx-auto bg-card rounded-2xl border border-border/50 p-6 shadow-xs space-y-4 select-none">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
          <Clock className="w-4 h-4 text-primary" /> Agenda Schedule
        </h3>

        <div className="space-y-4">
          {upcomingList.length > 0 ? (
            upcomingList.map(e => {
              const colors = EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.Other;
              return (
                <div 
                  key={e.id}
                  onClick={() => handleOpenDetail(e)}
                  className="p-4 rounded-xl border border-border/50 bg-slate-50/10 hover:border-primary/20 transition-all cursor-pointer flex items-start gap-4"
                >
                  <div className="bg-secondary p-2.5 rounded-lg border border-border/40 text-center shrink-0 min-w-[50px]">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                      {new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-black text-foreground block mt-0.5">
                      {new Date(e.date).getDate()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                        {e.type}
                      </span>
                      {e.startTime && (
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Time: {e.startTime} {e.endTime ? `- ${e.endTime}` : ''}
                        </span>
                      )}
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase ${
                        e.status === 'Done' ? 'bg-emerald-500/10 text-emerald-600' :
                        e.status === 'Cancelled' ? 'bg-red-500/10 text-red-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {e.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors truncate">{e.title}</h4>
                    {e.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">{e.description}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-12">No upcoming schedules planned.</p>
          )}
        </div>
      </div>
    );
  };

  // 5. EXPORT CALENDAR PDF
  const handleExportPDF = () => {
    const doc = new jsPDF() as any;

    // Cover Page
    doc.setFillColor(9, 9, 11);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('QA CALENDAR REPORT', 20, 100);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(161, 161, 170);
    doc.text(`Type: ${exportOption.toUpperCase()} VIEW`, 20, 115);

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(2);
    doc.line(20, 125, 100, 125);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 20, 250);
    doc.text(`Author: Solo QA Engineer`, 20, 260);

    // Data Page
    doc.addPage();
    doc.setTextColor(9, 9, 11);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('QA Schedules & Agenda', 14, 20);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(14, 24, 196, 24);

    // Filtering events based on export options
    let filtered = [...allEvents];
    const today = new Date();
    
    if (exportOption === 'daily') {
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      filtered = allEvents.filter(e => e.date === todayStr);
    } else if (exportOption === 'weekly') {
      const days = getWeekDays(today);
      const daysStr = days.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      filtered = allEvents.filter(e => daysStr.includes(e.date));
    } else if (exportOption === 'monthly') {
      const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      filtered = allEvents.filter(e => e.date.startsWith(monthStr));
    } else if (exportOption === 'project' && exportProjectId) {
      filtered = allEvents.filter(e => e.projectId === exportProjectId);
    }

    const tableBody = filtered.map((e) => [
      new Date(e.date).toLocaleDateString(),
      e.startTime ? `${e.startTime} - ${e.endTime || ''}` : 'All Day',
      e.title,
      e.type,
      e.projectName || 'None',
      e.workload,
      e.status,
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Time Slot', 'Event Description', 'Type', 'Project', 'Workload', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 50 },
        4: { cellWidth: 35 },
      },
    });

    doc.save(`QA_Calendar_${exportOption}_${Date.now()}.pdf`);
    setIsExportModalOpen(false);
  };

  const getMonthName = (date: Date) => {
    const list = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return list[date.getMonth()];
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3 border-b border-border/40">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-primary" /> QA Calendar Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Unified QA calendar merging manual events, project targets, and daily worklogs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Export PDF
          </button>
          
          <button
            onClick={() => handleOpenAddEvent()}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer shadow-sm shadow-primary/10 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Event
          </button>
        </div>
      </div>

      {/* Navigation and View controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card rounded-2xl border border-border/50 p-4 shadow-xs">
        {/* Prev / Next controls */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
            {viewMode === 'month' && `${getMonthName(currentDate)} ${currentDate.getFullYear()}`}
            {viewMode === 'week' && `Week of ${new Date(getWeekDays(currentDate)[0]).toLocaleDateString()}`}
            {viewMode === 'day' && currentDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
            {viewMode === 'list' && 'Agenda Schedule'}
          </h2>
          {viewMode !== 'list' && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handlePrev} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer">
                <ChevronLeftSquare className="w-5 h-5" />
              </button>
              <button onClick={handleNext} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer">
                <ChevronRightSquare className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* View Mode selections */}
        <div className="flex items-center bg-secondary border border-border/50 p-1 rounded-lg self-start sm:self-auto">
          {(['month', 'week', 'day', 'list'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-colors cursor-pointer ${
                viewMode === mode
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar View Content */}
      <div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs text-muted-foreground">Loading Schedules...</span>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'list' && renderListView()}
          </>
        )}
      </div>

      {/* EVENT FORM DIALOG */}
      <Dialog
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-lg">
              {formError}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Event Title <span className="text-red-500">*</span></label>
            <input 
              type="text"
              placeholder="e.g. GEO MAPID Retest Session, PSE Meeting Sync"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
          </div>

          {/* All day, Time zone & Recurrence Selection Row */}
          <div className="bg-slate-50/50 dark:bg-zinc-900/10 p-3.5 rounded-xl border border-border/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eventIsAllDay}
                  onChange={(e) => setEventIsAllDay(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-foreground">All day</span>
              </label>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold">Time zone:</span>
                <span className="text-xs font-black text-primary hover:underline cursor-pointer" title="Calculated from browser locale">
                  {eventTimeZone}
                </span>
              </div>
            </div>

            {/* Recurrence Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Repeat Option</label>
              <select
                value={eventRecurrence}
                onChange={(e) => setEventRecurrence(e.target.value as any)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground appearance-none"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                {dateCalculatedOptions.weekly && (
                  <option value="weekly">{dateCalculatedOptions.weekly}</option>
                )}
                {dateCalculatedOptions.monthlyWeekday && (
                  <option value="monthly_weekday">{dateCalculatedOptions.monthlyWeekday}</option>
                )}
                <option value="monthly">Monthly on the same date</option>
                {dateCalculatedOptions.annually && (
                  <option value="annually">{dateCalculatedOptions.annually}</option>
                )}
                <option value="weekday">Every weekday (Monday to Friday)</option>
                <option value="custom">Custom...</option>
              </select>
            </div>

            {/* Custom Recurrence Options */}
            {eventRecurrence === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-3 p-3 rounded-lg border border-dashed border-border/50 bg-card mt-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground">Repeat every</label>
                  <input
                    type="number"
                    min="1"
                    value={eventRecurrenceInterval}
                    onChange={(e) => setEventRecurrenceInterval(Number(e.target.value))}
                    className="w-full h-8 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground">Unit</label>
                  <select
                    value={eventRecurrenceType}
                    onChange={(e) => setEventRecurrenceType(e.target.value as any)}
                    className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none text-foreground"
                  >
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground">Until Date</label>
                  <input
                    type="date"
                    value={eventRecurrenceEnd}
                    onChange={(e) => setEventRecurrenceEnd(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-card px-2 text-[10px] focus-visible:outline-none text-foreground"
                  />
                </div>
              </div>
            )}

            {/* Repeat End Date selector for standard recurrence */}
            {eventRecurrence !== 'none' && eventRecurrence !== 'custom' && (
              <div className="space-y-1 mt-2">
                <label className="text-[9px] uppercase font-bold text-muted-foreground">Repeat Until Date (Optional)</label>
                <input
                  type="date"
                  value={eventRecurrenceEnd}
                  onChange={(e) => setEventRecurrenceEnd(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-card px-2 text-[10px] focus-visible:outline-none text-foreground"
                />
              </div>
            )}
          </div>

          {/* Row 1: Type & Related Project */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                {CALENDAR_EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Related QA Project (Optional)</label>
              <select
                value={eventProjectId}
                onChange={(e) => setEventProjectId(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                <option value="">No Project Affiliation</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Date, Start Time, End Time */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Date <span className="text-red-500">*</span></label>
              <input 
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
            {!eventIsAllDay && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Start Time</label>
                  <input 
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">End Time</label>
                  <input 
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 3: Workload & Color Label */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Workload Level</label>
              <select
                value={eventWorkload}
                onChange={(e) => setEventWorkload(e.target.value as CalendarWorkload)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Status</label>
              <select
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value as CalendarEventStatus)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Done">Done</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Row 4: Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
            <textarea
              placeholder="Scope of testing, meeting notes, agenda, or checklist..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
          </div>

          {/* Row 5: Link Meeting / Location & Reminder */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Location / Meeting Link</label>
              <input 
                type="text"
                placeholder="Google Meet, Zoom Link, Room 4A"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Reminder Note</label>
              <input 
                type="text"
                placeholder="Bring credentials, fetch checklist"
                value={eventReminder}
                onChange={(e) => setEventReminder(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer"
            >
              {editingEvent ? 'Save Changes' : 'Save Event'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* EVENT DETAIL DRAWER / DIALOG */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Event Details"
      >
        {selectedEvent && (
          <div className="space-y-5 mt-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                  EVENT_TYPE_COLORS[selectedEvent.type]?.bg || 'bg-secondary'
                } ${
                  EVENT_TYPE_COLORS[selectedEvent.type]?.text || 'text-secondary-foreground'
                }`}>
                  {selectedEvent.type}
                </span>
                <h3 className="text-base font-extrabold text-foreground">{selectedEvent.title}</h3>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                selectedEvent.status === 'Done' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                selectedEvent.status === 'Cancelled' ? 'bg-red-500/10 text-red-600 border-red-200' :
                'bg-blue-500/10 text-blue-600 border-blue-200'
              }`}>
                {selectedEvent.status}
              </span>
            </div>

            {/* General Specs */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs border-y border-border/40 py-3.5">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Source</p>
                <p className="text-foreground font-black mt-0.5 uppercase tracking-wider text-[10px] text-primary">{selectedEvent.source}</p>
              </div>
              {selectedEvent.projectName && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Related Project</p>
                  <p className="text-foreground font-semibold mt-0.5">{selectedEvent.projectName}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Schedule Date</p>
                <p className="text-foreground font-semibold mt-0.5">
                  {new Date(selectedEvent.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Time Slot</p>
                <p className="text-foreground font-semibold mt-0.5">
                  {selectedEvent.isAllDay ? 'All Day Schedule' : (selectedEvent.startTime ? `${selectedEvent.startTime} - ${selectedEvent.endTime || 'End'}` : 'All Day Schedule')}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Daily Workload</p>
                <p className="text-foreground font-semibold mt-0.5">{selectedEvent.workload}</p>
              </div>
              {selectedEvent.recurrence && selectedEvent.recurrence !== 'none' && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Recurrence</p>
                  <p className="text-foreground font-semibold mt-0.5 uppercase text-[10px]">
                    {selectedEvent.recurrence === 'custom' 
                      ? `Every ${selectedEvent.recurrenceInterval} ${selectedEvent.recurrenceType}(s)`
                      : selectedEvent.recurrence.replace('_', ' ')
                    }
                    {selectedEvent.recurrenceEnd && ` (until ${selectedEvent.recurrenceEnd})`}
                  </p>
                </div>
              )}
              {selectedEvent.locationOrLink && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Meeting Link / Room</p>
                  {selectedEvent.locationOrLink.startsWith('http') ? (
                    <a 
                      href={selectedEvent.locationOrLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline font-bold mt-0.5 flex items-center gap-0.5"
                    >
                      <span>Join Call</span> <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-foreground font-semibold mt-0.5">{selectedEvent.locationOrLink}</p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Details / Agenda</p>
                <div className="bg-slate-50/50 dark:bg-zinc-900/10 p-3 rounded-lg border border-border/40 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedEvent.description}
                </div>
              </div>
            )}

            {/* Reminder */}
            {selectedEvent.reminderNote && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-600 dark:text-amber-400 font-bold flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] uppercase font-black block">Reminder Note</span>
                  <p className="mt-0.5">{selectedEvent.reminderNote}</p>
                </div>
              </div>
            )}

            {/* Event Actions */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {selectedEvent.source === 'Manual' && selectedEvent.status !== 'Done' && (
                  <button
                    onClick={() => handleMarkAsDone(selectedEvent)}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs font-bold cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Mark as Done
                  </button>
                )}
              </div>

              {selectedEvent.source === 'Manual' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditEvent(selectedEvent)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer"
                  >
                    <Edit3 className="w-4.5 h-4.5 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5 mr-1" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* EXPORT SELECTOR DIALOG */}
      <Dialog
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Calendar Schedules"
      >
        <div className="space-y-4 mt-2">
          {/* Format selection */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Export Scope</label>
            <select
              value={exportOption}
              onChange={(e) => setExportOption(e.target.value as any)}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
            >
              <option value="daily">Daily Schedule (Today)</option>
              <option value="weekly">Weekly Calendar (This Week)</option>
              <option value="monthly">Monthly Calendar (This Month)</option>
              <option value="project">Project Calendar (Filtered by Project)</option>
            </select>
          </div>

          {/* Project filtered */}
          {exportOption === 'project' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Project</label>
              <select
                value={exportProjectId}
                onChange={(e) => setExportProjectId(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
              >
                <option value="">Choose Project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 text-xs font-bold cursor-pointer"
              disabled={exportOption === 'project' && !exportProjectId}
            >
              <FileText className="w-4 h-4 mr-1.5" /> Download PDF
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
