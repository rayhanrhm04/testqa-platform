'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Plus, Search, Filter, Kanban, List, ShieldAlert,
  ArrowRight, Trash2, Edit, Bug, Award, User, Tag, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function IssuesPage() {
  const router = useRouter();
  const { 
    issues, projects, releases, feedbacks, comments, projectShares,
    addIssue, updateIssue, deleteIssue, updateIssueStatus, addComment, logActivity, addProject
  } = useDataStore();
  const { activeRole, currentUser, mockUsers } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = React.useState('kanban');
  const [search, setSearch] = React.useState('');
  const [projectFilter, setProjectFilter] = React.useState('all');
  const [severityFilter, setSeverityFilter] = React.useState('all');
  const [releaseFilter, setReleaseFilter] = React.useState('all');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingIssue, setEditingIssue] = React.useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [activeDetailIssue, setActiveDetailIssue] = React.useState<any | null>(null);
  const [commentText, setCommentText] = React.useState('');
  
  // Quick Project states
  const [isQuickProjOpen, setIsQuickProjOpen] = React.useState(false);
  const [quickProjName, setQuickProjName] = React.useState('');
  const [quickProjDesc, setQuickProjDesc] = React.useState('');

  // Form Fields
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState<'Bug' | 'Improvement'>('Bug');
  const [project, setProject] = React.useState('');
  const [severity, setSeverity] = React.useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [status, setStatus] = React.useState<'Open' | 'In Progress' | 'Ready QA' | 'Verified' | 'Closed'>('Open');
  const [assignee, setAssignee] = React.useState('');
  const [release, setRelease] = React.useState('');
  const [expected, setExpected] = React.useState('');
  const [actual, setActual] = React.useState('');
  const [steps, setSteps] = React.useState('');

  // Permissions checks
  const accessibleProjects = React.useMemo(() => {
    if (!currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer') {
      return projects;
    }
    return projects.filter(p => {
      const shares = projectShares.filter(s => s.project_id === p.id);
      if (shares.length === 0) return true; // public project
      return shares.some(s => s.user_id === currentUser?.id);
    });
  }, [projects, projectShares, activeRole, currentUser]);

  const canModifyProject = React.useCallback((projId: string) => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === projId);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser?.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, currentUser]);

  const canCreateAnyIssue = React.useMemo(() => {
    if (!currentUser) return true;
    return accessibleProjects.some(p => canModifyProject(p.id));
  }, [currentUser, accessibleProjects, canModifyProject]);

  const canModifyIssue = React.useCallback((projId: string) => {
    if (!currentUser) return true;
    return canModifyProject(projId);
  }, [currentUser, canModifyProject]);

  const isDev = activeRole === 'Developer';
  const canDeleteIssue = activeRole === 'Admin' || activeRole === 'QA Engineer';

  const handleProjectFilterChange = (projId: string) => {
    setProjectFilter(projId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (projId === 'all') {
        url.searchParams.delete('project');
      } else {
        url.searchParams.set('project', projId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Sync projectFilter with query parameters on load
  React.useEffect(() => {
    if (accessibleProjects.length > 0) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const projectParam = params.get('project');
        if (projectParam && accessibleProjects.some(p => p.id === projectParam)) {
          setProjectFilter(projectParam);
        }
      }
    }
  }, [accessibleProjects]);

  // Sync edit form fields
  React.useEffect(() => {
    if (editingIssue) {
      setTitle(editingIssue.title);
      setDescription(editingIssue.description);
      setType(editingIssue.type);
      setProject(editingIssue.project_id);
      setSeverity(editingIssue.severity);
      setStatus(editingIssue.status);
      setAssignee(editingIssue.assigned_to || '');
      setRelease(editingIssue.release_id || '');
      setExpected(editingIssue.expected_result || '');
      setActual(editingIssue.actual_result || '');
      setSteps(editingIssue.steps_to_reproduce || '');
    } else {
      setTitle('');
      setDescription('');
      setType('Bug');
      setProject(projects[0]?.id || '');
      setSeverity('Medium');
      setStatus('Open');
      setAssignee('');
      setRelease('');
      setExpected('');
      setActual('');
      setSteps('');
    }
  }, [editingIssue, projects]);

  // Filters calculation
  const filteredIssues = React.useMemo(() => {
    return issues.filter((issue) => {
      // Must belong to an accessible project
      const isProjAccessible = accessibleProjects.some(p => p.id === issue.project_id);
      if (!isProjAccessible) return false;

      const matchSearch = issue.title.toLowerCase().includes(search.toLowerCase()) || 
                          issue.code.toLowerCase().includes(search.toLowerCase()) ||
                          issue.description.toLowerCase().includes(search.toLowerCase());
      const matchProject = projectFilter === 'all' || issue.project_id === projectFilter;
      const matchSeverity = severityFilter === 'all' || issue.severity === severityFilter;
      const matchRelease = releaseFilter === 'all' || issue.release_id === releaseFilter;
      
      return matchSearch && matchProject && matchSeverity && matchRelease;
    });
  }, [issues, search, projectFilter, severityFilter, releaseFilter, accessibleProjects]);

  // Form submit
  const handleFormSubmit = async () => {
    if (!title.trim() || !description.trim() || !project) {
      addToast('Title, Description and Project are required.', 'warning');
      return;
    }

    const payload = {
      project_id: project,
      type,
      title,
      description,
      expected_result: type === 'Bug' ? expected : undefined,
      actual_result: type === 'Bug' ? actual : undefined,
      steps_to_reproduce: type === 'Bug' ? steps : undefined,
      severity,
      status,
      assigned_to: assignee || undefined,
      release_id: release || undefined,
    };

    try {
      if (editingIssue) {
        await updateIssue(editingIssue.id, payload);
        addToast(`Issue ${editingIssue.code} updated!`, 'success');
      } else {
        await addIssue(payload);
        addToast('Created new issue target!', 'success');
      }
      setIsFormOpen(false);
      setEditingIssue(null);
    } catch (e) {
      addToast('Failed to save issue.', 'error');
    }
  };

  const handleQuickProjSubmit = async () => {
    if (!quickProjName.trim()) {
      addToast('Project name is required.', 'warning');
      return;
    }
    try {
      const newP = await addProject(quickProjName, quickProjDesc);
      if (newP) {
        setProject(newP.id);
        addToast(`Project "${quickProjName}" created!`, 'success');
      }
      setIsQuickProjOpen(false);
      setQuickProjName('');
      setQuickProjDesc('');
    } catch (e) {
      addToast('Failed to create project.', 'error');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Delete issue ${code}?`)) {
      await deleteIssue(id);
      addToast(`Issue ${code} deleted!`, 'success');
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: any) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const issueToMove = issues.find((i) => i.id === id);
    if (!issueToMove) return;

    // Check project permission:
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!canModifyProject(issueToMove.project_id)) {
      // Developer can only update if assigned to the issue, AND has editor access (or project is public)
      const isProjectShared = projectShares.some(s => s.project_id === issueToMove.project_id);
      const isSharedAsEditor = projectShares.some(s => s.project_id === issueToMove.project_id && s.user_id === currentUser?.id && s.role === 'Editor');
      
      const allowed = isDev && issueToMove.assigned_to === currentUser?.id && (!isProjectShared || isSharedAsEditor);
      if (!allowed) {
        addToast('Access denied. You do not have permissions to modify issues in this project.', 'error');
        return;
      }
    }

    try {
      await updateIssueStatus(id, targetStatus);
      if (currentUser) {
        await logActivity(currentUser.id, `Moved issue ${issueToMove.code} to ${targetStatus}`);
      }
      addToast(`Moved ${issueToMove.code} to ${targetStatus}!`, 'success');
    } catch (err) {
      addToast('Failed to update status.', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser || !activeDetailIssue) return;
    try {
      await addComment('issue', activeDetailIssue.id, currentUser.id, commentText);
      setCommentText('');
      addToast('Comment added!', 'success');
    } catch (e) {
      addToast('Failed to add comment.', 'error');
    }
  };

  // Badge Stylings
  const getSeverityBadge = (s: string) => {
    const styles = {
      Low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      Critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${styles[s as keyof typeof styles] || 'bg-zinc-500/10'}`}>
        {s}
      </span>
    );
  };

  // Columns for Kanban
  const kanbanColumns = [
    { id: 'Open', label: 'Open', color: 'border-t-sky-500 bg-sky-500/5' },
    { id: 'In Progress', label: 'In Progress', color: 'border-t-yellow-500 bg-yellow-500/5' },
    { id: 'Ready QA', label: 'Ready QA', color: 'border-t-indigo-500 bg-indigo-500/5' },
    { id: 'Verified', label: 'Verified', color: 'border-t-emerald-500 bg-emerald-500/5' },
    { id: 'Closed', label: 'Closed', color: 'border-t-zinc-500 bg-zinc-500/5' },
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Scrum & Issue Board</h1>
          <p className="text-sm text-muted-foreground">Track bug fixes and feature improvements across active milestones.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle tabs */}
          <div className="flex bg-muted rounded-lg p-0.5 border border-border mr-2">
            <button 
              onClick={() => setActiveTab('kanban')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                activeTab === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                activeTab === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {canCreateAnyIssue ? (
            <Button 
              onClick={() => {
                if (!currentUser) {
                  router.push('/login');
                  return;
                }
                setEditingIssue(null);
                setIsFormOpen(true);
              }}
              className="cursor-pointer font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Issue
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Creating is disabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-card p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, title..."
            className="pl-9"
          />
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={projectFilter} onChange={(e) => handleProjectFilterChange(e.target.value)}>
            <option value="all">All Projects</option>
            {accessibleProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="all">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>
        </div>

        {/* Release Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={releaseFilter} onChange={(e) => setReleaseFilter(e.target.value)}>
            <option value="all">All Releases</option>
            {releases.map(r => (
              <option key={r.id} value={r.id}>Version {r.version}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Main Content Layout */}
      {activeTab === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="overflow-x-auto w-full pb-4">
          <div className="grid gap-4 grid-cols-5 min-w-[1000px]">
          {kanbanColumns.map((col) => {
            const colIssues = filteredIssues.filter((i) => i.status === col.id);
            return (
              <div 
                key={col.id} 
                className={`flex flex-col h-[75vh] rounded-xl border border-border p-3 space-y-3 kanban-column ${col.color}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {colIssues.length}
                  </span>
                </div>

                {/* Card stack container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {colIssues.length > 0 ? (
                    colIssues.map((issue) => {
                      const proj = projects.find((p) => p.id === issue.project_id);
                      const user = mockUsers.find((u) => u.id === issue.assigned_to);
                      const rel = releases.find((r) => r.id === issue.release_id);
                      return (
                        <div 
                          key={issue.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, issue.id)}
                          onClick={() => { setActiveDetailIssue(issue); setIsDetailOpen(true); }}
                          className="group relative bg-card rounded-lg border border-border/80 p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing kanban-card text-left"
                        >
                          {/* Delete Action button on Hover */}
                          {canModifyIssue(issue.project_id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!currentUser) {
                                  router.push('/login');
                                  return;
                                }
                                handleDelete(issue.id, issue.code);
                              }}
                              title="Delete Issue"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Tags / Title */}
                          <div className="flex items-center gap-2 pr-6">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              issue.type === 'Bug' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                            }`}>
                              {issue.code}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              {proj ? proj.name.split(' ')[0] : 'GEO'}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-foreground mt-2 line-clamp-2 leading-snug">
                            {issue.title}
                          </h4>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-[10px]">
                            {/* Release */}
                            <span className="text-muted-foreground font-semibold">
                              {rel ? `v${rel.version}` : 'Backlog'}
                            </span>
                            {/* Severity & Assignee */}
                            <div className="flex items-center gap-1.5">
                              {getSeverityBadge(issue.severity)}
                              <div 
                                className="h-5.5 w-5.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold"
                                title={`Assigned to: ${user ? user.name : 'Unassigned'}`}
                              >
                                {user ? user.name.charAt(0) : 'u'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/50 rounded-lg">
                      <span className="text-[11px] text-muted-foreground font-medium">Empty column</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-foreground min-w-[850px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 font-semibold text-muted-foreground">
                  <th className="p-4">Code</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Release</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => {
                    const proj = projects.find((p) => p.id === issue.project_id);
                    const user = mockUsers.find((u) => u.id === issue.assigned_to);
                    const rel = releases.find((r) => r.id === issue.release_id);
                    return (
                      <tr 
                        key={issue.id} 
                        className="hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => { setActiveDetailIssue(issue); setIsDetailOpen(true); }}
                      >
                        <td className="p-4 font-bold text-primary">{issue.code}</td>
                        <td className="p-4 font-medium">{issue.title}</td>
                        <td className="p-4 text-muted-foreground">{proj ? proj.name : 'GEO MAPID'}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            issue.type === 'Bug' ? 'bg-red-500/15 text-red-500' : 'bg-indigo-500/15 text-indigo-500'
                          }`}>
                            {issue.type}
                          </span>
                        </td>
                        <td className="p-4">{getSeverityBadge(issue.severity)}</td>
                        <td className="p-4 text-muted-foreground font-semibold">{rel ? `v${rel.version}` : 'Backlog'}</td>
                        <td className="p-4 font-medium text-foreground/80">{user ? user.name : 'Unassigned'}</td>
                        <td className="p-4">
                          <span className="text-xs font-semibold bg-secondary text-secondary-foreground border border-border px-2 py-0.5 rounded-md">
                            {issue.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {canModifyIssue(issue.project_id) && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-muted" 
                                onClick={() => {
                                  if (!currentUser) {
                                    router.push('/login');
                                    return;
                                  }
                                  setEditingIssue(issue); 
                                  setIsFormOpen(true); 
                                }}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10" 
                                onClick={() => {
                                  if (!currentUser) {
                                    router.push('/login');
                                    return;
                                  }
                                  handleDelete(issue.id, issue.code);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 font-semibold text-xs cursor-pointer"
                            onClick={() => { setActiveDetailIssue(issue); setIsDetailOpen(true); }}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                      <Bug className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="font-semibold text-foreground/80">No issues found</p>
                      <p className="text-xs mt-1">Adjust filters or create a new issue.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM DIALOG */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingIssue(null); }}
        title={editingIssue ? `Edit Issue (${editingIssue.code})` : 'Create New Issue'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingIssue(null); }}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit}>
              {editingIssue ? 'Save changes' : 'Create Issue'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Issue Type">
              <Select value={type} onChange={(e: any) => setType(e.target.value)}>
                <option value="Bug">Bug</option>
                <option value="Improvement">Improvement</option>
              </Select>
            </FormGroup>

            <FormGroup label="Project Mapping">
              <div className="flex gap-2">
                <Select value={project} onChange={(e) => setProject(e.target.value)}>
                  <option value="" disabled>Select Project...</option>
                  {accessibleProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                {(activeRole === 'Admin' || activeRole === 'QA Engineer') && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsQuickProjOpen(true)}
                    className="px-3 cursor-pointer shrink-0"
                    title="Quick Add Project"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {project && !canModifyProject(project) && (
                <div className="text-[10px] text-red-500 mt-1 font-semibold">
                  ⚠️ You do not have permissions to modify issues in this project. Save will fail.
                </div>
              )}
            </FormGroup>
          </div>

          <FormGroup label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Map layers load with offset details" />
          </FormGroup>

          <FormGroup label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe core issue/improvement logs..." rows={3} />
          </FormGroup>

          {type === 'Bug' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormGroup label="Expected Result">
                  <Input value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Expected UI response..." />
                </FormGroup>
                <FormGroup label="Actual Result">
                  <Input value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Actual UI error state..." />
                </FormGroup>
              </div>

              <FormGroup label="Steps to Reproduce">
                <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} placeholder="1. Go to...\n2. Click..." />
              </FormGroup>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormGroup label="Severity">
              <Select value={severity} onChange={(e: any) => setSeverity(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </FormGroup>

            <FormGroup label="Assignee">
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {mockUsers.filter(u => u.role === 'Developer').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Target Release">
              <Select value={release} onChange={(e) => setRelease(e.target.value)}>
                <option value="">Backlog (No Release)</option>
                {releases.map(r => (
                  <option key={r.id} value={r.id}>Version {r.version}</option>
                ))}
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Status">
            <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Ready QA">Ready QA</option>
              <option value="Verified">Verified</option>
              <option value="Closed">Closed</option>
            </Select>
          </FormGroup>
        </div>
      </Dialog>

      {/* QUICK PROJECT ADD DIALOG */}
      <Dialog
        isOpen={isQuickProjOpen}
        onClose={() => setIsQuickProjOpen(false)}
        title="Quick Add Project"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsQuickProjOpen(false)}>Cancel</Button>
            <Button onClick={handleQuickProjSubmit}>Save Project</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormGroup label="Project Name">
            <Input 
              value={quickProjName} 
              onChange={(e) => setQuickProjName(e.target.value)} 
              placeholder="e.g. GEO MAPID" 
            />
          </FormGroup>
          <FormGroup label="Description">
            <Textarea 
              value={quickProjDesc} 
              onChange={(e) => setQuickProjDesc(e.target.value)} 
              placeholder="Geospatial details..." 
              rows={3} 
            />
          </FormGroup>
        </div>
      </Dialog>

      {/* DETAIL MODAL WITH COMMENTS */}
      <Dialog
        isOpen={isDetailOpen && activeDetailIssue !== null}
        onClose={() => { setIsDetailOpen(false); setActiveDetailIssue(null); }}
        title={activeDetailIssue ? `Issue details: ${activeDetailIssue.code}` : ''}
        size="lg"
      >
        {activeDetailIssue && (
          <div className="grid gap-6 md:grid-cols-3 text-left">
            {/* Details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">{activeDetailIssue.title}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    activeDetailIssue.type === 'Bug' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {activeDetailIssue.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Project: {projects.find(p => p.id === activeDetailIssue.project_id)?.name}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Description</span>
                <p className="text-sm bg-muted/20 border border-border/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                  {activeDetailIssue.description}
                </p>
              </div>

              {activeDetailIssue.type === 'Bug' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Expected Result</span>
                      <p className="bg-muted/10 p-2.5 border border-border/40 rounded-lg">{activeDetailIssue.expected_result || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Actual Result</span>
                      <p className="bg-muted/10 p-2.5 border border-border/40 rounded-lg">{activeDetailIssue.actual_result || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Steps to Reproduce</span>
                    <pre className="bg-muted/15 border border-border/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-sans">
                      {activeDetailIssue.steps_to_reproduce || 'N/A'}
                    </pre>
                  </div>
                </>
              )}

              {/* Comments inside detail modal */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Comments ({comments.filter(c => c.entity_type === 'issue' && c.entity_id === activeDetailIssue.id).length})
                </h3>
                
                {/* List Comments */}
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {comments.filter(c => c.entity_type === 'issue' && c.entity_id === activeDetailIssue.id).map((c) => {
                    const user = mockUsers.find(u => u.id === c.user_id);
                    return (
                      <div key={c.id} className="flex gap-2 text-xs bg-muted/10 p-2 border border-border/40 rounded-lg">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{user?.name.charAt(0)}</div>
                        <div>
                          <p className="font-semibold">{user?.name} <span className="text-[9px] text-muted-foreground font-normal ml-2">{new Date(c.created_at).toLocaleString()}</span></p>
                          <p className="text-muted-foreground mt-0.5 leading-normal">{c.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Comment */}
                {!currentUser ? (
                  <div className="text-center p-2.5 bg-muted/20 border border-border/40 rounded-lg text-xs">
                    <Link href="/login" className="text-primary font-bold hover:underline">Sign In</Link> to write a comment.
                  </div>
                ) : (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Type a comment..." className="h-8 text-xs" />
                    <Button type="submit" size="sm" className="h-8 cursor-pointer font-bold text-xs">Send</Button>
                  </form>
                )}
              </div>
            </div>

            {/* Sidebar properties */}
            <div className="space-y-4 border-l border-border pl-4 text-xs">
              <h3 className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border pb-1">Ticket Info</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" /> Severity
                  </span>
                  <span>{getSeverityBadge(activeDetailIssue.severity)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Assignee
                  </span>
                  <span className="font-bold">
                    {mockUsers.find(u => u.id === activeDetailIssue.assigned_to)?.name || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Target Release
                  </span>
                  <span className="font-bold text-primary">
                    {releases.find(r => r.id === activeDetailIssue.release_id)?.version ? `v${releases.find(r => r.id === activeDetailIssue.release_id)?.version}` : 'Backlog'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Created At
                  </span>
                  <span>{new Date(activeDetailIssue.created_at).toLocaleDateString()}</span>
                </div>

                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground font-semibold block mb-2">Adjust Status</span>
                  {/* Status Dropdown to quickly edit status */}
                  <Select 
                    value={activeDetailIssue.status} 
                    onChange={async (e) => {
                      if (!currentUser) {
                        router.push('/login');
                        return;
                      }
                      if (isDev && activeDetailIssue.assigned_to !== currentUser?.id) {
                        addToast('Cannot edit. You are not assigned to this bug.', 'error');
                        return;
                      }
                      await updateIssueStatus(activeDetailIssue.id, e.target.value as any);
                      setActiveDetailIssue({ ...activeDetailIssue, status: e.target.value });
                      addToast('Status updated!', 'success');
                    }}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Ready QA">Ready QA</option>
                    <option value="Verified">Verified</option>
                    <option value="Closed">Closed</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
