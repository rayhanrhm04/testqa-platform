'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Play, Pause, CheckSquare, Plus, Trash2, Clock, 
  StickyNote, Bug, Paperclip, ArrowLeft, CheckCircle2, 
  AlertCircle, Calendar, LayoutGrid, Folder, Compass, 
  Loader2, AlertTriangle, ExternalLink, PlaySquare, Video, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function ExploratoryPage() {
  const { 
    projects, projectShares,
    exploratorySessions, exploratoryNotes, exploratoryBugs, exploratoryEvidence,
    addExploratorySession, updateExploratorySession, addExploratoryNote, addExploratoryBug, addExploratoryEvidence,
    deleteExploratorySession, addFeedback
  } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const canEdit = activeRole === 'Admin' || activeRole === 'QA Engineer';

  // Navigation / Views
  const [currentView, setCurrentView] = React.useState<'dashboard' | 'active_workspace' | 'summary'>('dashboard');
  const [activeSession, setActiveSession] = React.useState<any | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = React.useState(false);
  const [selectedSummarySession, setSelectedSummarySession] = React.useState<any | null>(null);

  // New Session Form States
  const [sessionName, setSessionName] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [moduleName, setModuleName] = React.useState('');
  const [objective, setObjective] = React.useState('');
  const [timebox, setTimebox] = React.useState('60');

  // Timer States
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [isTimerActive, setIsTimerActive] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Note Form State
  const [noteInput, setNoteInput] = React.useState('');

  // Bug Form States
  const [bugTitle, setBugTitle] = React.useState('');
  const [bugCategory, setBugCategory] = React.useState('Functional');
  const [bugSeverity, setBugSeverity] = React.useState('Medium');
  const [bugPriority, setBugPriority] = React.useState('Medium');
  const [bugDescription, setBugDescription] = React.useState('');
  const [bugSteps, setBugSteps] = React.useState('');
  const [bugExpected, setBugExpected] = React.useState('');
  const [bugActual, setBugActual] = React.useState('');

  // Simulated File Uploader States
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Promoted Bug IDs tracking
  const [promotedBugIds, setPromotedBugIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qa_promoted_bugs');
      if (saved) {
        setPromotedBugIds(JSON.parse(saved));
      }
    }
  }, []);

  // Filter accessible projects
  const accessibleProjects = React.useMemo(() => {
    if (!currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer') {
      return projects;
    }
    return projects.filter(p => {
      const shares = projectShares.filter(s => s.project_id === p.id);
      if (shares.length === 0) return true;
      return shares.some(s => s.user_id === currentUser?.id);
    });
  }, [projects, projectShares, activeRole, currentUser]);

  const accessibleProjectIds = React.useMemo(() => accessibleProjects.map(p => p.id), [accessibleProjects]);

  // Filter exploratory sessions by accessible projects
  const filteredSessions = React.useMemo(() => {
    return exploratorySessions.filter(s => accessibleProjectIds.includes(s.project_id));
  }, [exploratorySessions, accessibleProjectIds]);

  // Format Elapsed Seconds to HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Timer Effect
  React.useEffect(() => {
    if (isTimerActive && activeSession) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Periodically save elapsed seconds to avoid loss (every 15s)
          if (next % 15 === 0) {
            updateExploratorySession(activeSession.id, { elapsed_seconds: next });
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerActive, activeSession, updateExploratorySession]);

  // Handle active session duration sync when unmounting or changing views
  const syncElapsedSeconds = async () => {
    if (activeSession) {
      await updateExploratorySession(activeSession.id, { elapsed_seconds: elapsedSeconds });
    }
  };

  // Start Session Action
  const handleStartSession = async () => {
    if (!activeSession) return;
    setIsTimerActive(true);
    await updateExploratorySession(activeSession.id, { status: 'Active' });
    addToast('Session started!', 'success');
  };

  // Pause Session Action
  const handlePauseSession = async () => {
    if (!activeSession) return;
    setIsTimerActive(false);
    await updateExploratorySession(activeSession.id, { status: 'Paused', elapsed_seconds: elapsedSeconds });
    addToast('Session paused.', 'info');
  };

  // Resume Session Action
  const handleResumeSession = async () => {
    if (!activeSession) return;
    setIsTimerActive(true);
    await updateExploratorySession(activeSession.id, { status: 'Active' });
    addToast('Session resumed.', 'success');
  };

  // Finish Session Action
  const handleFinishSession = async () => {
    if (!activeSession) return;
    setIsTimerActive(false);
    await updateExploratorySession(activeSession.id, { 
      status: 'Completed', 
      elapsed_seconds: elapsedSeconds 
    });
    addToast('Session completed successfully!', 'success');
    setSelectedSummarySession(activeSession);
    setCurrentView('summary');
    setActiveSession(null);
  };

  // Create New Session Submit
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      addToast('Session Name is required', 'error');
      return;
    }
    if (!selectedProjectId) {
      addToast('Project selection is required', 'error');
      return;
    }

    const created = await addExploratorySession({
      project_id: selectedProjectId,
      name: sessionName,
      module: moduleName || 'General',
      objective: objective || 'Explore functional correctness.',
      timebox_mins: parseInt(timebox, 10),
    });

    if (created) {
      setSessionName('');
      setModuleName('');
      setObjective('');
      setTimebox('60');
      setIsCreateModalOpen(false);
      addToast('Exploratory Session Created!', 'success');
      
      // Automatically load into workspace
      setActiveSession(created);
      setElapsedSeconds(0);
      setIsTimerActive(false);
      setCurrentView('active_workspace');
    }
  };

  // Add Note Submit
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !activeSession) return;

    // Prepend a nice timestamp relative to the session elapsed time
    const timestampStr = formatTime(elapsedSeconds);
    const finalNoteText = `[${timestampStr}] ${noteInput.trim()}`;

    await addExploratoryNote(activeSession.id, finalNoteText);
    setNoteInput('');
    addToast('Note added', 'success');
  };

  // Add Bug Submit
  const handleAddBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle.trim() || !activeSession) {
      addToast('Bug Title is required', 'error');
      return;
    }

    await addExploratoryBug({
      session_id: activeSession.id,
      title: bugTitle,
      category: bugCategory,
      severity: bugSeverity,
      priority: bugPriority,
      description: bugDescription,
      steps_to_reproduce: bugSteps,
      expected_result: bugExpected,
      actual_result: bugActual,
      relative_timestamp_seconds: elapsedSeconds,
    });

    // Reset Form
    setBugTitle('');
    setBugCategory('Functional');
    setBugSeverity('Medium');
    setBugPriority('Medium');
    setBugDescription('');
    setBugSteps('');
    setBugExpected('');
    setBugActual('');
    
    setIsBugModalOpen(false);
    addToast('Bug Finding logged!', 'success');
  };

  // Simulated File Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;

    setIsUploading(true);
    // Simulate network upload speed
    setTimeout(async () => {
      const objectUrl = URL.createObjectURL(file);
      await addExploratoryEvidence({
        session_id: activeSession.id,
        file_name: file.name,
        file_type: file.type.startsWith('video/') ? 'video' : 'image',
        file_url: objectUrl,
      });
      setIsUploading(false);
      addToast(`Evidence ${file.name} uploaded!`, 'success');
    }, 1200);
  };

  // Get active session lists
  const sessionNotes = React.useMemo(() => {
    if (!activeSession) return [];
    return exploratoryNotes.filter(n => n.session_id === activeSession.id);
  }, [exploratoryNotes, activeSession]);

  const sessionBugs = React.useMemo(() => {
    if (!activeSession) return [];
    return exploratoryBugs.filter(b => b.session_id === activeSession.id);
  }, [exploratoryBugs, activeSession]);

  const sessionEvidence = React.useMemo(() => {
    if (!activeSession) return [];
    return exploratoryEvidence.filter(e => e.session_id === activeSession.id);
  }, [exploratoryEvidence, activeSession]);

  // Summary selection listings
  const summaryNotes = React.useMemo(() => {
    if (!selectedSummarySession) return [];
    return exploratoryNotes.filter(n => n.session_id === selectedSummarySession.id);
  }, [exploratoryNotes, selectedSummarySession]);

  const summaryBugs = React.useMemo(() => {
    if (!selectedSummarySession) return [];
    return exploratoryBugs.filter(b => b.session_id === selectedSummarySession.id);
  }, [exploratoryBugs, selectedSummarySession]);

  const summaryEvidence = React.useMemo(() => {
    if (!selectedSummarySession) return [];
    return exploratoryEvidence.filter(e => e.session_id === selectedSummarySession.id);
  }, [exploratoryEvidence, selectedSummarySession]);

  // Resume an existing draft or active/paused session
  const handleOpenWorkspace = (session: any) => {
    setActiveSession(session);
    setElapsedSeconds(session.elapsed_seconds || 0);
    setIsTimerActive(session.status === 'Active');
    setCurrentView('active_workspace');
  };

  // Show summary of completed session
  const handleOpenSummary = (session: any) => {
    setSelectedSummarySession(session);
    setCurrentView('summary');
  };

  // Back to list helper
  const handleBackToDashboard = async () => {
    await syncElapsedSeconds();
    setCurrentView('dashboard');
    setActiveSession(null);
  };

  // Delete exploratory session handler
  const handleDeleteSession = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this exploratory session? All notes, bugs, and evidence will be permanently deleted.")) {
      await deleteExploratorySession(id);
      addToast('Exploratory session deleted successfully!', 'success');
    }
  };

  // Promote bug finding to feedback board
  const handlePromoteBugToFeedback = async (bug: any, session: any) => {
    if (!bug || !session) return;
    
    const description = `
**Bug Details from Exploratory Testing session: "${session.name}"**

*   **Category**: ${bug.category || 'Functional'}
*   **Severity**: ${bug.severity}
*   **Priority**: ${bug.priority}
*   **Relative Discovery Timestamp**: Found at ${formatTime(bug.relative_timestamp_seconds)} during the session.

---

### Description
${bug.description || 'No description provided.'}

### Steps to Reproduce
${bug.steps_to_reproduce || 'No steps provided.'}

### Expected Result
${bug.expected_result || 'No expected result provided.'}

### Actual Result
${bug.actual_result || 'No actual result provided.'}
`.trim();

    await addFeedback({
      title: `[Exploratory Bug] ${bug.title}`,
      description,
      project_id: session.project_id,
      reporter_id: currentUser?.id || null,
      priority: bug.priority,
      status: 'Open',
    });
    
    setPromotedBugIds((prev) => {
      const next = [...prev, bug.id];
      localStorage.setItem('qa_promoted_bugs', JSON.stringify(next));
      return next;
    });
    
    addToast('Bug successfully logged to the Feedback page!', 'success');
  };

  // Format size for mock representation
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* ======================================================== */}
      {/* 1. DASHBOARD VIEW                                       */}
      {/* ======================================================== */}
      {currentView === 'dashboard' && (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
                Exploratory Testing
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage, execute, and analyze session-based exploratory testing.
              </p>
            </div>
            {canEdit && (
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="cursor-pointer font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> New Session
              </Button>
            )}
          </div>

          {/* Sessions Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-12 text-center col-span-full flex flex-col items-center justify-center space-y-3">
                <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-3 text-muted-foreground">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No Exploratory Sessions Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Create a session to begin logging notes, findings, and uploading evidence.
                </p>
                {canEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="cursor-pointer font-bold text-xs"
                  >
                    Create New Session
                  </Button>
                )}
              </div>
            ) : (
              filteredSessions.map((session) => {
                const project = projects.find(p => p.id === session.project_id);
                const bugsCount = exploratoryBugs.filter(b => b.session_id === session.id).length;
                const notesCount = exploratoryNotes.filter(n => n.session_id === session.id).length;
                const evidenceCount = exploratoryEvidence.filter(e => e.session_id === session.id).length;

                return (
                  <div 
                    key={session.id} 
                    className="bg-card rounded-2xl border border-border/50 p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform select-none shadow-xs"
                  >
                    <div>
                      {/* Badge / Status */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Folder className="h-3 w-3" /> {project ? project.name : 'Unknown Project'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          session.status === 'Completed' 
                            ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400'
                            : session.status === 'Active'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : session.status === 'Paused'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-foreground/80'
                        }`}>
                          {session.status}
                        </span>
                      </div>

                      {/* Header */}
                      <h3 className="text-sm font-bold text-foreground truncate" title={session.name}>
                        {session.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                        Module: <span className="text-foreground">{session.module || 'General'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {session.objective}
                      </p>
                    </div>

                    {/* Stats and Action Footer */}
                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                      <div className="flex gap-3 text-[10px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1">
                          <Bug className="h-3 w-3 text-red-500" /> {bugsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <StickyNote className="h-3 w-3 text-blue-500" /> {notesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-emerald-500" /> {evidenceCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(session.elapsed_seconds || 0).slice(3)}
                        </span>
                      </div>

                      {session.status === 'Completed' ? (
                        <div className="flex items-center gap-1.5">
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenSummary(session)}
                            className="cursor-pointer text-[10px] font-bold py-1 h-7 flex items-center gap-1"
                          >
                            View Summary <ExternalLink className="h-3 w-3" />
                          </Button>
                          {canEdit && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSession(session.id)}
                              className="cursor-pointer text-[10px] font-bold py-1 h-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-border/80"
                              title="Delete Session"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button 
                            size="sm"
                            onClick={() => handleOpenWorkspace(session)}
                            className="cursor-pointer text-[10px] font-bold py-1 h-7 flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/95"
                          >
                            {session.status === 'Draft' ? 'Start' : 'Resume'} <Play className="h-3 w-3 fill-current" />
                          </Button>
                          {canEdit && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSession(session.id)}
                              className="cursor-pointer text-[10px] font-bold py-1 h-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-border/80"
                              title="Delete Session"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 2. ACTIVE WORKSPACE VIEW                                 */}
      {/* ======================================================== */}
      {currentView === 'active_workspace' && activeSession && (
        <>
          {/* Header Actions */}
          <div className="flex items-center gap-3 pb-3">
            <Button 
              variant="outline" 
              onClick={handleBackToDashboard}
              className="cursor-pointer font-bold text-xs h-8 px-2.5 flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Active Workspace
              </span>
              <h2 className="text-lg font-bold text-foreground leading-none mt-0.5">
                {activeSession.name}
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Side: Timer controls and session details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Timer Control Card */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 flex flex-col items-center justify-center space-y-4 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Timebox Timer ({activeSession.timebox_mins} min limit)
                </span>
                
                {/* Time Display */}
                <div className="text-4xl font-black font-mono tracking-widest text-foreground py-2 select-all">
                  {formatTime(elapsedSeconds)}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden relative">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      elapsedSeconds > activeSession.timebox_mins * 60 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, (elapsedSeconds / (activeSession.timebox_mins * 60)) * 100)}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="flex gap-2 w-full pt-2">
                  {!isTimerActive ? (
                    <Button 
                      onClick={elapsedSeconds === 0 ? handleStartSession : handleResumeSession}
                      className="cursor-pointer flex-1 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> {elapsedSeconds === 0 ? 'Start' : 'Resume'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handlePauseSession}
                      className="cursor-pointer flex-1 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </Button>
                  )}
                  <Button 
                    variant="destructive"
                    onClick={handleFinishSession}
                    className="cursor-pointer flex-1 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckSquare className="h-3.5 w-3.5" /> Finish
                  </Button>
                </div>
              </div>

              {/* Session Details Card */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Session Details</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">Project:</span>
                    <span className="text-foreground font-bold">
                      {projects.find(p => p.id === activeSession.project_id)?.name || 'Unknown Project'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Module / Feature:</span>
                    <span className="text-foreground font-semibold">{activeSession.module || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Objective:</span>
                    <span className="text-foreground font-medium leading-relaxed block bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-border/40 mt-1">
                      {activeSession.objective}
                    </span>
                  </div>
                </div>
              </div>

              {/* General Evidence panel */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Evidence ({sessionEvidence.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="cursor-pointer h-7 text-[10px] font-bold flex items-center gap-1"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Upload File
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden" 
                    accept="image/*,video/*"
                  />
                </div>

                {/* Evidence items */}
                {sessionEvidence.length === 0 ? (
                  <div className="border border-dashed border-border/80 rounded-xl p-6 text-center text-xs text-muted-foreground">
                    Upload screenshots or video clips as testing evidence.
                  </div>
                ) : (
                  <div className="grid gap-2 grid-cols-2">
                    {sessionEvidence.map((ev) => (
                      <div key={ev.id} className="relative rounded-lg border border-border overflow-hidden bg-zinc-50 dark:bg-zinc-900 select-none flex flex-col group">
                        {ev.file_type === 'image' ? (
                          <div className="relative aspect-video flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                            <img src={ev.file_url} alt={ev.file_name} className="object-cover w-full h-full" />
                          </div>
                        ) : (
                          <div className="relative aspect-video flex items-center justify-center bg-[#09090b]">
                            <Video className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <span className="text-[10px] px-2 py-1 truncate text-foreground/80 bg-white dark:bg-zinc-950 border-t border-border font-medium">
                          {ev.file_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Tabbed logger panels */}
            <div className="lg:col-span-2 space-y-6">
              {/* Notes logger */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <StickyNote className="h-4.5 w-4.5 text-blue-500" /> Session Notes ({sessionNotes.length})
                </h3>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Input 
                    placeholder="Write a note (e.g. Rendered basemap layers successfully)..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-1 bg-transparent text-sm h-9 border border-input rounded-lg"
                  />
                  <Button 
                    type="submit" 
                    className="cursor-pointer font-bold text-xs h-9"
                  >
                    Add Note
                  </Button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {sessionNotes.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-6">
                      No notes logged yet in this session.
                    </div>
                  ) : (
                    sessionNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="bg-zinc-50 dark:bg-zinc-900/60 border border-border/40 rounded-xl p-3 text-xs leading-relaxed text-foreground/90 font-medium"
                      >
                        {note.note_text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bug findings logger */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Bug className="h-4.5 w-4.5 text-red-500" /> Bug Findings ({sessionBugs.length})
                  </h3>
                  <Button 
                    onClick={() => setIsBugModalOpen(true)}
                    className="cursor-pointer font-bold text-xs h-8 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Log Bug Finding
                  </Button>
                </div>

                <div className="space-y-3">
                  {sessionBugs.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      No bugs logged yet. Make sure to report findings with relative stamps!
                    </div>
                  ) : (
                    sessionBugs.map((bug) => (
                      <div 
                        key={bug.id} 
                        className="border border-border/80 rounded-xl p-4 bg-white dark:bg-zinc-900 flex flex-col justify-between space-y-2 hover:border-red-500/35 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground">{bug.title}</h4>
                          <span className="text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono font-bold">
                            {formatTime(bug.relative_timestamp_seconds)}
                          </span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">
                            {bug.severity}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-foreground/80 font-bold">
                            Category: {bug.category || 'Functional'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                          {bug.description || 'No description provided.'}
                        </p>
                        {canEdit && (
                          <div className="pt-2 flex justify-end border-t border-border/40 mt-1">
                            {promotedBugIds.includes(bug.id) ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Added to Feedback
                              </span>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handlePromoteBugToFeedback(bug, activeSession)}
                                className="cursor-pointer text-[10px] font-bold py-0.5 h-6 flex items-center gap-1 border-border/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                <Plus className="h-3 w-3 text-red-500" /> Add to Feedback
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 3. SESSION SUMMARY VIEW                                  */}
      {/* ======================================================== */}
      {currentView === 'summary' && selectedSummarySession && (
        <>
          <div className="flex items-center gap-3 pb-3">
            <Button 
              variant="outline" 
              onClick={handleBackToDashboard}
              className="cursor-pointer font-bold text-xs h-8 px-2.5 flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Session Summary
              </span>
              <h2 className="text-lg font-bold text-foreground leading-none mt-0.5">
                {selectedSummarySession.name}
              </h2>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Duration */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex flex-col justify-between min-h-[110px]">
              <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-foreground leading-none">
                  {formatTime(selectedSummarySession.elapsed_seconds || 0)}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground mt-1">Total Duration</div>
              </div>
            </div>

            {/* Bugs Found */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex flex-col justify-between min-h-[110px]">
              <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground">
                <Bug className="h-4 w-4 text-red-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-foreground leading-none">
                  {summaryBugs.length}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground mt-1">Bugs Found</div>
              </div>
            </div>

            {/* Total Notes */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex flex-col justify-between min-h-[110px]">
              <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground">
                <StickyNote className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-foreground leading-none">
                  {summaryNotes.length}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground mt-1">Notes Captured</div>
              </div>
            </div>

            {/* Evidence Count */}
            <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-xs flex flex-col justify-between min-h-[110px]">
              <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground">
                <Paperclip className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-foreground leading-none">
                  {summaryEvidence.length}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground mt-1">Evidence Files</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mt-6">
            {/* Meta details */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Parameters</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">Project:</span>
                    <span className="text-foreground font-bold">
                      {projects.find(p => p.id === selectedSummarySession.project_id)?.name || 'Unknown Project'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Module Name:</span>
                    <span className="text-foreground font-semibold">{selectedSummarySession.module || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Objective:</span>
                    <p className="text-foreground/90 font-medium mt-1 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-border/40">
                      {selectedSummarySession.objective}
                    </p>
                  </div>
                </div>
              </div>

              {/* Evidence list */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Uploaded Evidence</h3>
                {summaryEvidence.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No evidence uploaded for this session.</p>
                ) : (
                  <div className="grid gap-2 grid-cols-2">
                    {summaryEvidence.map((ev) => (
                      <div key={ev.id} className="relative rounded-lg border border-border overflow-hidden bg-zinc-50 dark:bg-zinc-900 select-none flex flex-col">
                        {ev.file_type === 'image' ? (
                          <div className="relative aspect-video flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                            <img src={ev.file_url} alt={ev.file_name} className="object-cover w-full h-full" />
                          </div>
                        ) : (
                          <div className="relative aspect-video flex items-center justify-center bg-[#09090b]">
                            <Video className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <span className="text-[10px] px-2 py-1 truncate text-foreground/80 bg-white dark:bg-zinc-950 border-t border-border font-medium">
                          {ev.file_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs / lists */}
            <div className="lg:col-span-2 space-y-6">
              {/* Captured Notes */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <StickyNote className="h-4.5 w-4.5 text-blue-500" /> Captured Notes ({summaryNotes.length})
                </h3>
                <div className="space-y-2">
                  {summaryNotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No notes logged.</p>
                  ) : (
                    summaryNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="bg-zinc-50 dark:bg-zinc-900/60 border border-border/40 rounded-xl p-3 text-xs leading-relaxed text-foreground/90 font-medium"
                      >
                        {note.note_text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bug findings */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Bug className="h-4.5 w-4.5 text-red-500" /> Bug Findings ({summaryBugs.length})
                </h3>
                <div className="space-y-4">
                  {summaryBugs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No bugs logged.</p>
                  ) : (
                    summaryBugs.map((bug) => (
                      <div 
                        key={bug.id} 
                        className="border border-border rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground">{bug.title}</h4>
                          <span className="text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded font-mono font-bold">
                            Minute: {formatTime(bug.relative_timestamp_seconds)}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            Severity: {bug.severity}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Priority: {bug.priority}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-foreground/80 border border-border">
                            Category: {bug.category || 'Functional'}
                          </span>
                        </div>

                        {bug.description && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block font-semibold mb-0.5">Description:</span>
                            <p className="text-foreground/90 leading-relaxed font-medium bg-white dark:bg-zinc-900 border border-border/60 p-2.5 rounded-lg">{bug.description}</p>
                          </div>
                        )}

                        {bug.steps_to_reproduce && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block font-semibold mb-0.5">Steps to Reproduce:</span>
                            <pre className="text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed bg-white dark:bg-zinc-900 border border-border/60 p-2.5 rounded-lg text-[11px]">{bug.steps_to_reproduce}</pre>
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          {bug.expected_result && (
                            <div className="text-xs">
                              <span className="text-muted-foreground block font-semibold mb-0.5">Expected Result:</span>
                              <p className="text-foreground/90 leading-relaxed font-medium bg-white dark:bg-zinc-900 border border-border/60 p-2.5 rounded-lg">{bug.expected_result}</p>
                            </div>
                          )}
                          {bug.actual_result && (
                            <div className="text-xs">
                              <span className="text-muted-foreground block font-semibold mb-0.5">Actual Result:</span>
                              <p className="text-foreground/90 leading-relaxed font-medium bg-white dark:bg-zinc-900 border border-border/60 p-2.5 rounded-lg text-red-500/90">{bug.actual_result}</p>
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="pt-2 flex justify-end border-t border-border/40 mt-1">
                            {promotedBugIds.includes(bug.id) ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Added to Feedback
                              </span>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handlePromoteBugToFeedback(bug, selectedSummarySession)}
                                className="cursor-pointer text-[10px] font-bold py-1 h-7 flex items-center gap-1 border-border/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                <Plus className="h-3 w-3 text-red-500" /> Add to Feedback
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 4. MODALS & DIALOGS                                      */}
      {/* ======================================================== */}

      {/* Setup New Session Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Setup New Exploratory Session"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="cursor-pointer font-bold text-xs">
              Cancel
            </Button>
            <Button onClick={handleCreateSession} className="cursor-pointer font-bold text-xs bg-primary text-primary-foreground">
              Create & Start
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <FormGroup label="Session Name" error="">
            <Input 
              placeholder="e.g. Map Editor Collaboration Layer Test"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="bg-transparent border border-input text-sm h-9 rounded-lg"
              required
            />
          </FormGroup>

          <FormGroup label="Project" error="">
            <Select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
            >
              <option value="" disabled>Select project...</option>
              {accessibleProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup label="Module / Feature Area" error="">
            <Input 
              placeholder="e.g. Basemaps / Web GIS Editor"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              className="bg-transparent border border-input text-sm h-9 rounded-lg"
            />
          </FormGroup>

          <FormGroup label="Objective / Charter" error="">
            <Textarea 
              placeholder="What are you exploring? e.g. Verify shapefile drawing performance when 5 concurrent users edit..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="bg-transparent border border-input text-sm rounded-lg min-h-[80px]"
            />
          </FormGroup>

          <FormGroup label="Timebox Duration" error="">
            <Select
              value={timebox}
              onChange={(e) => setTimebox(e.target.value)}
            >
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes</option>
              <option value="90">90 Minutes</option>
            </Select>
          </FormGroup>
        </form>
      </Dialog>

      {/* Log Bug Modal */}
      <Dialog
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        title={`Log Bug Finding (at relative: ${formatTime(elapsedSeconds)})`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsBugModalOpen(false)} className="cursor-pointer font-bold text-xs">
              Cancel
            </Button>
            <Button onClick={handleAddBug} className="cursor-pointer font-bold text-xs bg-red-600 hover:bg-red-700 text-white">
              Log Bug Finding
            </Button>
          </>
        }
        size="lg"
      >
        <form onSubmit={handleAddBug} className="space-y-4">
          <FormGroup label="Bug Title" error="">
            <Input 
              placeholder="e.g. Save Button Doesn't Respond on drawing layer edit"
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
              className="bg-transparent border border-input text-sm h-9 rounded-lg"
              required
            />
          </FormGroup>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormGroup label="Category" error="">
              <Select value={bugCategory} onChange={(e) => setBugCategory(e.target.value)}>
                <option value="Functional">Functional</option>
                <option value="UI/UX">UI/UX</option>
                <option value="Performance">Performance</option>
                <option value="Security">Security</option>
                <option value="Localization">Localization</option>
                <option value="Other">Other</option>
              </Select>
            </FormGroup>
            
            <FormGroup label="Severity" error="">
              <Select value={bugSeverity} onChange={(e) => setBugSeverity(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </FormGroup>

            <FormGroup label="Priority" error="">
              <Select value={bugPriority} onChange={(e) => setBugPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Description" error="">
            <Textarea 
              placeholder="Describe the bug details..."
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              className="bg-transparent border border-input text-sm rounded-lg min-h-[60px]"
            />
          </FormGroup>

          <FormGroup label="Steps to Reproduce" error="">
            <Textarea 
              placeholder="1. Open map editor&#10;2. Draw a polygon layer&#10;3. Click Save button..."
              value={bugSteps}
              onChange={(e) => setBugSteps(e.target.value)}
              className="bg-transparent border border-input text-sm font-mono rounded-lg min-h-[80px]"
            />
          </FormGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Expected Result" error="">
              <Textarea 
                placeholder="What should happen..."
                value={bugExpected}
                onChange={(e) => setBugExpected(e.target.value)}
                className="bg-transparent border border-input text-sm rounded-lg min-h-[60px]"
              />
            </FormGroup>

            <FormGroup label="Actual Result" error="">
              <Textarea 
                placeholder="What actually happens..."
                value={bugActual}
                onChange={(e) => setBugActual(e.target.value)}
                className="bg-transparent border border-input text-sm rounded-lg min-h-[60px]"
              />
            </FormGroup>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
