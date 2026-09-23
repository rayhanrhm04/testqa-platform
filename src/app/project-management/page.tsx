'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity, AlertCircle, AtSign, CalendarDays, CheckSquare, ChevronDown,
  CircleDot, ClipboardList, Columns3, Filter, FolderKanban, GripVertical, LayoutDashboard,
  ImagePlus, Link2, List, MessageSquare, MoreHorizontal, Paperclip, Pencil, Plus, Search,
  Trash2, UserPlus, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import type {
  PMActivity, PMBoardData, PMChecklistItem, PMComment, PMProject, PMProjectStatus,
  PMTask, PMTaskPriority, PMUser, PMLinkType, PMProjectRole,
} from '@/lib/project-management-types';

type ViewMode = 'overview' | 'board' | 'list';
const projectStatuses: PMProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed'];
const priorities: PMTaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const linkTypes: PMLinkType[] = ['Issue', 'Feedback', 'Test Case', 'Test Run', 'Release', 'Exploratory Finding'];
const MAX_COMMENT_IMAGE_BYTES = 2 * 1024 * 1024;

type CommentDraft = {
  text: string;
  mentionIds: string[];
  imageUrl: string | null;
  imageName: string | null;
  clientRequestId: string;
};

const priorityClass: Record<PMTaskPriority, string> = {
  Low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  High: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Critical: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function isOverdue(task: PMTask) {
  return Boolean(task.due_date && new Date(`${dateInputValue(task.due_date)}T23:59:59`).getTime() < Date.now());
}

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function formatDate(value: string | null | undefined) {
  const normalized = dateInputValue(value);
  if (!normalized) return 'Not set';
  const [year, month, day] = normalized.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

function linkHref(type: PMLinkType, id: string) {
  const routes: Record<PMLinkType, string> = {
    Issue: `/issues?issue=${id}`,
    Feedback: `/feedback/${id}`,
    'Test Case': `/test-cases?case=${id}`,
    'Test Run': `/test-runs/${id}`,
    Release: `/releases?release=${id}`,
    'Exploratory Finding': `/exploratory?finding=${id}`,
  };
  return routes[type];
}

export default function ProjectManagementPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const addToast = useUIStore((state) => state.addToast);
  const [projects, setProjects] = React.useState<PMProject[]>([]);
  const [users, setUsers] = React.useState<PMUser[]>([]);
  const [board, setBoard] = React.useState<PMBoardData | null>(null);
  const [activeProjectId, setActiveProjectId] = React.useState('');
  const [view, setView] = React.useState<ViewMode>('overview');
  const [loading, setLoading] = React.useState(true);
  const [boardLoading, setBoardLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [assigneeFilter, setAssigneeFilter] = React.useState('all');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [labelFilter, setLabelFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [dueFilter, setDueFilter] = React.useState('all');
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = React.useState(false);
  const [isTaskOpen, setIsTaskOpen] = React.useState(false);
  const [isMemberOpen, setIsMemberOpen] = React.useState(false);
  const [detailTask, setDetailTask] = React.useState<PMTask | null>(null);
  const [editingTask, setEditingTask] = React.useState<PMTask | null>(null);
  const [taskDetail, setTaskDetail] = React.useState<{ comments: PMComment[]; checklist: PMChecklistItem[]; activities: PMActivity[] } | null>(null);

  const api = React.useCallback(async (url: string, init?: RequestInit) => {
    if (!currentUser) throw new Error('Please sign in first.');
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, ...(init?.headers || {}) },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    return payload;
  }, [currentUser]);

  const loadBootstrap = React.useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await api('/api/project-management');
      setProjects(data.projects);
      setUsers(data.users);
      const saved = localStorage.getItem('qa_pm_last_project');
      const next = data.projects.some((project: PMProject) => project.id === saved) ? saved : data.projects[0]?.id;
      setActiveProjectId((current) => current && data.projects.some((project: PMProject) => project.id === current) ? current : next || '');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load projects.', 'error');
    } finally { setLoading(false); }
  }, [addToast, api, currentUser]);

  const loadBoard = React.useCallback(async (projectId: string) => {
    if (!projectId) { setBoard(null); return; }
    setBoardLoading(true);
    try {
      const data = await api(`/api/project-management?projectId=${projectId}`);
      setBoard(data);
      localStorage.setItem('qa_pm_last_project', projectId);
    } catch (error) {
      setBoard(null);
      addToast(error instanceof Error ? error.message : 'Failed to load board.', 'error');
    } finally { setBoardLoading(false); }
  }, [addToast, api]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBootstrap(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBootstrap]);
  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBoard(activeProjectId), 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeProjectId, loadBoard]);

  const canWrite = board?.project.role !== 'Viewer';
  const isLead = board?.project.role === 'Project Lead';
  const allLabels = React.useMemo(() => [...new Set((board?.tasks || []).flatMap((task) => task.labels))].sort(), [board]);
  const filteredTasks = React.useMemo(() => (board?.tasks || []).filter((task) => {
    const column = board?.columns.find((item) => item.id === task.column_id);
    const textMatch = `${task.title} ${task.description} ${task.labels.join(' ')} ${task.links.map((link) => link.linked_code).join(' ')}`.toLowerCase().includes(search.toLowerCase());
    return textMatch
      && (assigneeFilter === 'all' || task.assignees.some((user) => user.id === assigneeFilter))
      && (priorityFilter === 'all' || task.priority === priorityFilter)
      && (labelFilter === 'all' || task.labels.includes(labelFilter))
      && (statusFilter === 'all' || column?.id === statusFilter)
      && (dueFilter === 'all' || (dueFilter === 'overdue' ? isOverdue(task) : dueFilter === 'none' ? !task.due_date : Boolean(task.due_date)));
  }), [assigneeFilter, board, dueFilter, labelFilter, priorityFilter, search, statusFilter]);

  async function mutate(body: Record<string, unknown>, method: 'POST' | 'PATCH' = 'POST') {
    await api('/api/project-management', { method, body: JSON.stringify(body) });
    await Promise.all([loadBoard(activeProjectId), loadBootstrap()]);
  }

  async function handleMoveTask(columnId: string) {
    if (!draggedTaskId || !canWrite || !board) return;
    const previous = board;
    setBoard({ ...board, tasks: board.tasks.map((task) => task.id === draggedTaskId ? { ...task, column_id: columnId } : task) });
    try {
      await api('/api/project-management', { method: 'PATCH', body: JSON.stringify({ action: 'moveTask', projectId: board.project.id, taskId: draggedTaskId, columnId }) });
      await loadBoard(board.project.id);
    } catch (error) {
      setBoard(previous);
      addToast(error instanceof Error ? error.message : 'Unable to move task.', 'error');
    } finally { setDraggedTaskId(null); }
  }

  async function openTaskDetail(task: PMTask) {
    setDetailTask(task);
    setTaskDetail(null);
    try { setTaskDetail(await api(`/api/project-management?taskId=${task.id}`)); }
    catch (error) { addToast(error instanceof Error ? error.message : 'Failed to load task detail.', 'error'); }
  }

  if (!currentUser) return <EmptyState title="Sign in required" description="Project Management is available to registered MAPID QA users." />;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 border-b border-border/50 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderKanban className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Project Management</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Plan work, coordinate members, and link QA evidence without changing source modules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <select value={activeProjectId} onChange={(event) => setActiveProjectId(event.target.value)} className="h-9 w-full appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-xs font-semibold outline-none focus:ring-1 focus:ring-ring">
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button size="sm" onClick={() => setIsProjectOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New Project</Button>
        </div>
      </div>

      {loading ? <Loading label="Loading accessible projects..." /> : projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create your first project. You will automatically become a project member." action={<Button onClick={() => setIsProjectOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Create Project</Button>} />
      ) : boardLoading || !board ? <Loading label="Loading project workspace..." /> : (
        <>
          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black">{board.project.name}</h2>
                  <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[9px] font-bold">{board.project.status}</span>
                  <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold">{board.project.role}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{board.project.description || 'No project description.'}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {board.members.slice(0, 5).map((member) => <Avatar key={member.id} name={member.name} avatarUrl={member.avatar_url} className="h-7 w-7 border-2 border-card bg-primary text-primary-foreground" />)}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{board.members.length} members</span>
                {isLead && <Button variant="outline" size="sm" onClick={() => setIsMemberOpen(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" />Assign</Button>}
                {isLead && <Button variant="outline" size="sm" onClick={() => setIsEditProjectOpen(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit Project</Button>}
                {isLead && <Button variant="destructive" size="sm" onClick={async () => { if(!confirm(`Delete project "${board.project.name}" and all of its tasks? This cannot be undone.`)) return; try { await api(`/api/project-management?projectId=${board.project.id}&type=project`,{method:'DELETE'}); localStorage.removeItem('qa_pm_last_project'); setBoard(null); setActiveProjectId(''); await loadBootstrap(); addToast('Project deleted.','success'); } catch(error){addToast(error instanceof Error?error.message:'Unable to delete project.','error');} }}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit rounded-xl border border-border bg-card p-1">
              <ViewButton active={view === 'overview'} onClick={() => setView('overview')} icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Overview" />
              <ViewButton active={view === 'board'} onClick={() => setView('board')} icon={<Columns3 className="h-3.5 w-3.5" />} label="Board" />
              <ViewButton active={view === 'list'} onClick={() => setView('list')} icon={<List className="h-3.5 w-3.5" />} label="List" />
            </div>
            {(view === 'board' || view === 'list') && canWrite && <Button size="sm" onClick={() => { setEditingTask(null); setIsTaskOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Create Task</Button>}
          </div>

          {view === 'overview' && <Overview board={board} />}
          {(view === 'board' || view === 'list') && (
            <>
              <Filters search={search} setSearch={setSearch} board={board} assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} labelFilter={labelFilter} setLabelFilter={setLabelFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dueFilter={dueFilter} setDueFilter={setDueFilter} labels={allLabels} />
              {view === 'board' ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {board.columns.map((column, columnIndex) => (
                    <div key={column.id} className="kanban-column w-[290px] shrink-0 rounded-2xl border border-border/50 bg-secondary/50 p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => void handleMoveTask(column.id)}>
                      <div className="mb-3 flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-muted-foreground" /><h3 className="text-xs font-black">{column.name}</h3><span className="rounded-full bg-card px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">{filteredTasks.filter((task) => task.column_id === column.id).length}</span></div>
                        {isLead && <ColumnMenu column={column} index={columnIndex} count={board.columns.length} onRename={async () => { const name=prompt('Column name',column.name); if(name&&name!==column.name) await mutate({action:'renameColumn',projectId:board.project.id,columnId:column.id,name},'PATCH'); }} onMove={async (direction) => { const next=[...board.columns]; const target=columnIndex+direction; if(target<0||target>=next.length)return; [next[columnIndex],next[target]]=[next[target],next[columnIndex]]; await mutate({action:'reorderColumns',projectId:board.project.id,columnIds:next.map((item)=>item.id)},'PATCH'); }} onDelete={async () => { if(confirm(`Delete empty column "${column.name}"?`)) { try { await api(`/api/project-management?projectId=${board.project.id}&type=column&id=${column.id}`,{method:'DELETE'}); await loadBoard(board.project.id); } catch(error){addToast(error instanceof Error?error.message:'Unable to delete column.','error');} } }} />}
                      </div>
                      <div className="min-h-24 space-y-2">
                        {filteredTasks.filter((task) => task.column_id === column.id).map((task) => <TaskCard key={task.id} task={task} draggable={Boolean(canWrite)} onDragStart={() => setDraggedTaskId(task.id)} onOpen={() => void openTaskDetail(task)} />)}
                      </div>
                    </div>
                  ))}
                  {isLead && <button onClick={async () => { const name=prompt('New column name'); if(name) await mutate({action:'createColumn',projectId:board.project.id,name}); }} className="flex h-24 w-[260px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground"><Plus className="mr-1.5 h-4 w-4" />Add column</button>}
                </div>
              ) : <BulkTaskTable tasks={filteredTasks} board={board} canWrite={Boolean(canWrite)} onOpen={(task) => void openTaskDetail(task)} onBulkMove={async (taskIds,columnId) => { try { await Promise.all(taskIds.map((taskId)=>api('/api/project-management',{method:'PATCH',body:JSON.stringify({action:'moveTask',projectId:board.project.id,taskId,columnId})}))); await loadBoard(board.project.id); addToast(`${taskIds.length} tasks moved.`,'success'); } catch(error){addToast(error instanceof Error?error.message:'Bulk move failed.','error');} }} onBulkDelete={async (taskIds) => { if(!confirm(`Delete ${taskIds.length} selected tasks?`)) return; try { await Promise.all(taskIds.map((taskId)=>api(`/api/project-management?projectId=${board.project.id}&type=task&id=${taskId}`,{method:'DELETE'}))); await loadBoard(board.project.id); addToast(`${taskIds.length} tasks deleted.`,'success'); } catch(error){addToast(error instanceof Error?error.message:'Bulk delete failed.','error');} }} />}
            </>
          )}
        </>
      )}

      <ProjectDialog isOpen={isProjectOpen} onClose={() => setIsProjectOpen(false)} users={users} currentUserId={currentUser.id} onSubmit={async (payload) => { try { const result=await api('/api/project-management',{method:'POST',body:JSON.stringify({action:'createProject',...payload})}); setIsProjectOpen(false); await loadBootstrap(); setActiveProjectId(result.projectId); addToast('Project created successfully.','success'); } catch(error){addToast(error instanceof Error?error.message:'Unable to create project.','error');} }} />
      {board && <EditProjectDialog key={`${board.project.id}:${isEditProjectOpen}`} isOpen={isEditProjectOpen} onClose={() => setIsEditProjectOpen(false)} board={board} users={users} onSubmit={async (payload) => { try { await mutate({action:'updateProject',projectId:board.project.id,...payload},'PATCH'); setIsEditProjectOpen(false); addToast('Project updated.','success'); } catch(error){addToast(error instanceof Error?error.message:'Unable to update project.','error');} }} />}
      {board && <TaskDialog key={editingTask?.id || 'new-task'} isOpen={isTaskOpen} onClose={() => { setIsTaskOpen(false); setEditingTask(null); }} board={board} task={editingTask} onSubmit={async (payload) => { try { await mutate({action:editingTask?'updateTask':'createTask',projectId:board.project.id,...payload},editingTask?'PATCH':'POST'); setIsTaskOpen(false); setEditingTask(null); addToast(editingTask?'Task updated.':'Task created.','success'); } catch(error){addToast(error instanceof Error?error.message:'Unable to save task.','error');} }} />}
      {board && <MemberDialog isOpen={isMemberOpen} onClose={() => setIsMemberOpen(false)} board={board} users={users} onSubmit={async (userId,role) => { try { await mutate({action:'addMember',projectId:board.project.id,userId,role}); setIsMemberOpen(false); addToast('Member assigned.','success'); } catch(error){addToast(error instanceof Error?error.message:'Unable to assign member.','error');} }} />}
      {board && detailTask && <TaskDetailDialog task={detailTask} data={taskDetail} members={board.members} currentUserId={currentUser.id} projectRole={board.project.role} canWrite={Boolean(canWrite)} onClose={() => {setDetailTask(null);setTaskDetail(null);}} onEdit={() => { setEditingTask(detailTask); setDetailTask(null); setIsTaskOpen(true); }} onDelete={async () => { if(!confirm(`Delete task "${detailTask.title}"?`)) return; try { await api(`/api/project-management?projectId=${board.project.id}&type=task&id=${detailTask.id}`,{method:'DELETE'}); setDetailTask(null); await loadBoard(board.project.id); addToast('Task deleted.','success'); } catch(error){addToast(error instanceof Error?error.message:'Unable to delete task.','error');} }} onAddComment={async (draft) => { await api('/api/project-management',{method:'POST',body:JSON.stringify({action:'addComment',projectId:board.project.id,taskId:detailTask.id,...draft})}); const [nextDetail]=await Promise.all([api(`/api/project-management?taskId=${detailTask.id}`),loadBoard(board.project.id)]); setTaskDetail(nextDetail); }} onDeleteComment={async (commentId) => { await api(`/api/project-management?projectId=${board.project.id}&type=comment&id=${commentId}`,{method:'DELETE'}); const [nextDetail]=await Promise.all([api(`/api/project-management?taskId=${detailTask.id}`),loadBoard(board.project.id)]); setTaskDetail(nextDetail); }} onAddChecklist={async (text) => { await mutate({action:'addChecklist',projectId:board.project.id,taskId:detailTask.id,text}); await openTaskDetail(detailTask); }} onToggleChecklist={async (checklistId) => { await mutate({action:'toggleChecklist',projectId:board.project.id,checklistId},'PATCH'); await openTaskDetail(detailTask); }} />}
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>{icon}{label}</button>;
}

function Loading({ label }: { label: string }) { return <div className="flex h-64 flex-col items-center justify-center gap-3"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /><span className="text-xs font-semibold text-muted-foreground">{label}</span></div>; }
function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center"><FolderKanban className="mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-base font-black">{title}</h2><p className="mb-5 mt-1 max-w-md text-xs text-muted-foreground">{description}</p>{action}</div>; }

function Overview({ board }: { board: PMBoardData }) {
  const doneColumn = board.columns.find((column) => column.name.toLowerCase() === 'done');
  const todoColumn = board.columns.find((column) => column.name.toLowerCase() === 'to do');
  const progressColumn = board.columns.find((column) => column.name.toLowerCase() === 'in progress');
  const stats = [
    ['Total Tasks', board.tasks.length, ClipboardList], ['To Do', board.tasks.filter((task) => task.column_id === todoColumn?.id).length, CircleDot],
    ['In Progress', board.tasks.filter((task) => task.column_id === progressColumn?.id).length, Activity], ['Completed', board.tasks.filter((task) => task.column_id === doneColumn?.id).length, CheckSquare],
    ['Overdue', board.tasks.filter(isOverdue).length, AlertCircle],
  ] as const;
  const completed = stats[3][1] as number; const progress = board.tasks.length ? Math.round((completed / board.tasks.length) * 100) : 0;
  return <div className="grid gap-5 xl:grid-cols-3"><div className="space-y-5 xl:col-span-2"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{stats.map(([label,value,Icon])=><div key={label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs"><Icon className="mb-3 h-4 w-4 text-muted-foreground"/><p className="text-2xl font-black">{value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>)}</div><div className="rounded-2xl border border-border/60 bg-card p-5"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black">Project Progress</h3><span className="text-xs font-black">{progress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:`${progress}%`}} /></div><div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><div><p className="text-[9px] font-bold uppercase text-muted-foreground">Project Lead</p><p className="mt-1 font-bold">{board.project.lead_name}</p></div><div><p className="text-[9px] font-bold uppercase text-muted-foreground">Start Date</p><p className="mt-1 font-bold">{formatDate(board.project.start_date)}</p></div><div><p className="text-[9px] font-bold uppercase text-muted-foreground">Target Date</p><p className="mt-1 font-bold">{formatDate(board.project.target_date)}</p></div></div></div></div><div className="rounded-2xl border border-border/60 bg-card p-5"><h3 className="mb-4 text-sm font-black">Recent Activity</h3><div className="space-y-4">{board.activities.length ? board.activities.slice(0,8).map((item)=><div key={item.id} className="flex gap-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"/><div><p className="text-xs"><span className="font-bold">{item.actor_name}</span> {item.details}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleString('id-ID')}</p></div></div>) : <p className="text-xs text-muted-foreground">No activity yet.</p>}</div></div></div>;
}

function Filters(props: { search:string;setSearch:(value:string)=>void;board:PMBoardData;assigneeFilter:string;setAssigneeFilter:(value:string)=>void;priorityFilter:string;setPriorityFilter:(value:string)=>void;labelFilter:string;setLabelFilter:(value:string)=>void;statusFilter:string;setStatusFilter:(value:string)=>void;dueFilter:string;setDueFilter:(value:string)=>void;labels:string[] }) {
  const selects=[
    ['Assignee',props.assigneeFilter,props.setAssigneeFilter,[['all','All assignees'],...props.board.members.map((member)=>[member.id,member.name])]],
    ['Priority',props.priorityFilter,props.setPriorityFilter,[['all','All priorities'],...priorities.map((value)=>[value,value])]],
    ['Label',props.labelFilter,props.setLabelFilter,[['all','All labels'],...props.labels.map((value)=>[value,value])]],
    ['Status',props.statusFilter,props.setStatusFilter,[['all','All statuses'],...props.board.columns.map((column)=>[column.id,column.name])]],
    ['Due',props.dueFilter,props.setDueFilter,[['all','Any due date'],['overdue','Overdue'],['has','Has due date'],['none','No due date']]],
  ] as [string,string,(value:string)=>void,string[][]][];
  return <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-3 lg:flex-row lg:items-center"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input value={props.search} onChange={(event)=>props.setSearch(event.target.value)} placeholder="Search tasks or linked references..." className="pl-9 text-xs"/></div><div className="flex flex-wrap gap-2"><Filter className="mt-2.5 h-4 w-4 text-muted-foreground"/>{selects.map(([label,value,setter,options])=><select aria-label={label} key={label} value={value} onChange={(event)=>setter(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-2 text-[10px] font-semibold outline-none">{options.map(([id,text])=><option key={id} value={id}>{text}</option>)}</select>)}</div></div>;
}

function TaskCard({ task, draggable, onDragStart, onOpen }: { task:PMTask;draggable:boolean;onDragStart:()=>void;onOpen:()=>void }) {
  return <button draggable={draggable} onDragStart={onDragStart} onClick={onOpen} className="kanban-card block w-full cursor-pointer rounded-xl border border-border/60 bg-card p-3 text-left shadow-xs hover:border-primary/30 hover:shadow-sm"><div className="mb-2 flex items-start justify-between gap-2"><div className="flex flex-wrap gap-1">{task.links.map((link)=><span key={link.id} className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-black text-violet-600">{link.linked_code}</span>)}</div><GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"/></div><h4 className="line-clamp-2 text-xs font-bold leading-relaxed">{task.title}</h4><div className="mt-2 flex flex-wrap gap-1">{task.labels.slice(0,3).map((label)=><span key={label} className="rounded-md bg-secondary px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground">{label}</span>)}</div><div className="mt-3 flex items-center justify-between gap-2"><span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black ${priorityClass[task.priority]}`}>{task.priority}</span><div className="flex items-center gap-2 text-[9px] text-muted-foreground">{task.due_date&&<span className={`flex items-center gap-1 ${isOverdue(task)?'font-bold text-red-500':''}`}><CalendarDays className="h-3 w-3"/>{formatDate(task.due_date)}</span>}{task.comment_count>0&&<span className="flex items-center gap-1"><MessageSquare className="h-3 w-3"/>{task.comment_count}</span>}{task.checklist_total>0&&<span className="flex items-center gap-1"><CheckSquare className="h-3 w-3"/>{task.checklist_done}/{task.checklist_total}</span>}</div></div><div className="mt-3 flex -space-x-1.5">{task.assignees.slice(0,4).map((user)=><Avatar key={user.id} name={user.name} avatarUrl={user.avatar_url} className="h-6 w-6 border-2 border-card bg-primary text-[8px] text-primary-foreground"/>)}</div></button>;
}


function ColumnMenu({column,index,count,onRename,onMove,onDelete}:{column:{name:string};index:number;count:number;onRename:()=>void;onMove:(direction:number)=>void;onDelete:()=>void}) { const [open,setOpen]=React.useState(false); return <div className="relative" title={`Manage ${column.name}`}><button onClick={()=>setOpen(!open)} className="rounded p-1 text-muted-foreground hover:bg-card"><MoreHorizontal className="h-4 w-4"/></button>{open&&<div className="absolute right-0 top-7 z-20 w-36 rounded-lg border border-border bg-card p-1 shadow-lg"><button onClick={()=>{setOpen(false);onRename();}} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-semibold hover:bg-secondary">Rename</button><button disabled={index===0} onClick={()=>{setOpen(false);onMove(-1);}} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-semibold hover:bg-secondary disabled:opacity-40">Move left</button><button disabled={index===count-1} onClick={()=>{setOpen(false);onMove(1);}} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-semibold hover:bg-secondary disabled:opacity-40">Move right</button><button onClick={()=>{setOpen(false);onDelete();}} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-semibold text-red-500 hover:bg-red-500/10">Delete</button></div>}</div>; }

function ProjectDialog({isOpen,onClose,users,currentUserId,onSubmit}:{isOpen:boolean;onClose:()=>void;users:PMUser[];currentUserId:string;onSubmit:(payload:Record<string,unknown>)=>Promise<void>}) { const [name,setName]=React.useState('');const [description,setDescription]=React.useState('');const [lead,setLead]=React.useState(currentUserId);const [members,setMembers]=React.useState<string[]>([]);const [start,setStart]=React.useState('');const [target,setTarget]=React.useState('');const [status,setStatus]=React.useState<PMProjectStatus>('Planning');const [saving,setSaving]=React.useState(false); return <Dialog isOpen={isOpen} onClose={onClose} title="Create Project" size="lg"><form onSubmit={async(event)=>{event.preventDefault();setSaving(true);try{await onSubmit({name,description,leadUserId:lead,memberIds:members,startDate:start||null,targetDate:target||null,status});setName('');setDescription('');setMembers([]);}finally{setSaving(false);}}} className="space-y-4"><FormGroup label="Project Name"><Input required value={name} onChange={(event)=>setName(event.target.value)} placeholder="e.g. GEO MAPID"/></FormGroup><FormGroup label="Description"><Textarea value={description} onChange={(event)=>setDescription(event.target.value)} placeholder="Project goal and scope"/></FormGroup><div className="grid gap-4 sm:grid-cols-3"><FormGroup label="Project Lead"><select value={lead} onChange={(event)=>setLead(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-3 text-xs">{users.map((user)=><option key={user.id} value={user.id}>{user.name}</option>)}</select></FormGroup><FormGroup label="Start Date"><Input type="date" value={start} onChange={(event)=>setStart(event.target.value)}/></FormGroup><FormGroup label="Target Date"><Input type="date" value={target} onChange={(event)=>setTarget(event.target.value)}/></FormGroup></div><FormGroup label="Status"><select value={status} onChange={(event)=>setStatus(event.target.value as PMProjectStatus)} className="h-9 rounded-lg border border-input bg-card px-3 text-xs">{projectStatuses.map((value)=><option key={value}>{value}</option>)}</select></FormGroup><FormGroup label="Members"><div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">{users.filter((user)=>user.id!==lead).map((user)=><label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-secondary"><input type="checkbox" checked={members.includes(user.id)} onChange={()=>setMembers((current)=>current.includes(user.id)?current.filter((id)=>id!==user.id):[...current,user.id])}/><Avatar name={user.name} avatarUrl={user.avatar_url} className="h-6 w-6 bg-primary text-primary-foreground"/><span className="text-xs font-semibold">{user.name}</span></label>)}</div></FormGroup><div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Create Project</Button></div></form></Dialog>; }

function EditProjectDialog({isOpen,onClose,board,users,onSubmit}:{isOpen:boolean;onClose:()=>void;board:PMBoardData;users:PMUser[];onSubmit:(payload:Record<string,unknown>)=>Promise<void>}) {
  const [name,setName]=React.useState(board.project.name);
  const [description,setDescription]=React.useState(board.project.description);
  const [lead,setLead]=React.useState(board.project.lead_user_id);
  const [start,setStart]=React.useState(dateInputValue(board.project.start_date));
  const [target,setTarget]=React.useState(dateInputValue(board.project.target_date));
  const [status,setStatus]=React.useState<PMProjectStatus>(board.project.status);
  const [memberRoles,setMemberRoles]=React.useState<Record<string,'Member'|'Viewer'>>(() => Object.fromEntries(board.members.filter((member)=>member.id!==board.project.lead_user_id).map((member)=>[member.id,member.role==='Viewer'?'Viewer':'Member'])));
  const [saving,setSaving]=React.useState(false);

  function changeLead(nextLead:string) {
    setMemberRoles((current) => {
      const next={...current};
      delete next[nextLead];
      if(lead&&lead!==nextLead&&!next[lead]) next[lead]='Member';
      return next;
    });
    setLead(nextLead);
  }

  function toggleMember(userId:string) {
    setMemberRoles((current) => {
      const next={...current};
      if(next[userId]) delete next[userId]; else next[userId]='Member';
      return next;
    });
  }

  return <Dialog isOpen={isOpen} onClose={onClose} title="Edit Project" size="xl"><form onSubmit={async(event)=>{event.preventDefault();setSaving(true);try{await onSubmit({name,description,leadUserId:lead,members:Object.entries(memberRoles).map(([userId,role])=>({userId,role})),startDate:start||null,targetDate:target||null,status});}finally{setSaving(false);}}} className="space-y-4">
    <FormGroup label="Project Name"><Input required value={name} onChange={(event)=>setName(event.target.value)}/></FormGroup>
    <FormGroup label="Description"><Textarea value={description} onChange={(event)=>setDescription(event.target.value)} placeholder="Project goal and scope"/></FormGroup>
    <div className="grid gap-4 sm:grid-cols-3">
      <FormGroup label="Project Lead"><select value={lead} onChange={(event)=>changeLead(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-3 text-xs">{users.map((user)=><option key={user.id} value={user.id}>{user.name}</option>)}</select></FormGroup>
      <FormGroup label="Start Date"><Input type="date" value={start} onChange={(event)=>setStart(event.target.value)}/></FormGroup>
      <FormGroup label="Target Date"><Input type="date" min={start||undefined} value={target} onChange={(event)=>setTarget(event.target.value)}/></FormGroup>
    </div>
    <FormGroup label="Status"><select value={status} onChange={(event)=>setStatus(event.target.value as PMProjectStatus)} className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs">{projectStatuses.map((value)=><option key={value}>{value}</option>)}</select></FormGroup>
    <FormGroup label="Project Members"><div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border p-3">{users.filter((user)=>user.id!==lead).map((user)=>{const selected=Boolean(memberRoles[user.id]);return <div key={user.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5"><input aria-label={`Include ${user.name}`} type="checkbox" checked={selected} onChange={()=>toggleMember(user.id)}/><Avatar name={user.name} avatarUrl={user.avatar_url} className="h-7 w-7 bg-primary text-primary-foreground"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{user.name}</p><p className="truncate text-[9px] text-muted-foreground">{user.email}</p></div><select aria-label={`Role for ${user.name}`} disabled={!selected} value={memberRoles[user.id]||'Member'} onChange={(event)=>setMemberRoles((current)=>({...current,[user.id]:event.target.value as 'Member'|'Viewer'}))} className="h-8 rounded-lg border border-input bg-card px-2 text-[10px] font-semibold disabled:opacity-40"><option>Member</option><option>Viewer</option></select></div>;})}</div></FormGroup>
    <p className="text-[10px] text-muted-foreground">Unchecking a member removes project access and unassigns that user from this project&apos;s tasks.</p>
    <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Save Changes</Button></div>
  </form></Dialog>;
}

function TaskDialog({isOpen,onClose,board,task,onSubmit}:{isOpen:boolean;onClose:()=>void;board:PMBoardData;task:PMTask|null;onSubmit:(payload:Record<string,unknown>)=>Promise<void>}) { const [title,setTitle]=React.useState(task?.title||'');const [description,setDescription]=React.useState(task?.description||'');const [columnId,setColumnId]=React.useState(task?.column_id||board.columns[0]?.id||'');const [priority,setPriority]=React.useState<PMTaskPriority>(task?.priority||'Medium');const [dueDate,setDueDate]=React.useState(task?.due_date||'');const [labels,setLabels]=React.useState(task?.labels.join(', ')||'');const [assignees,setAssignees]=React.useState<string[]>(task?.assignees.map((user)=>user.id)||[]);const [attachmentUrl,setAttachmentUrl]=React.useState(task?.attachment_url||'');const [linkType,setLinkType]=React.useState<PMLinkType|''>(task?.links[0]?.link_type||'');const [linkedId,setLinkedId]=React.useState(task?.links[0]?.linked_id||'');const [linkedCode,setLinkedCode]=React.useState(task?.links[0]?.linked_code||'');const [saving,setSaving]=React.useState(false); return <Dialog isOpen={isOpen} onClose={onClose} title={task?"Edit Task":"Create Task"} size="xl"><form onSubmit={async(event)=>{event.preventDefault();setSaving(true);try{await onSubmit({taskId:task?.id,title,description,columnId,priority,dueDate:dueDate||null,labels:labels.split(',').map((value)=>value.trim()).filter(Boolean),assigneeIds:assignees,attachmentUrl:attachmentUrl||null,attachmentName:attachmentUrl?attachmentUrl.split('/').pop():null,linkType:linkType||null,linkedId:linkedId||null,linkedCode:linkedCode||null});setTitle('');setDescription('');}finally{setSaving(false);}}} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><FormGroup label="Title"><Input required value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="Task title"/></FormGroup><FormGroup label="Status"><select value={columnId} onChange={(event)=>setColumnId(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-3 text-xs">{board.columns.map((column)=><option key={column.id} value={column.id}>{column.name}</option>)}</select></FormGroup></div><FormGroup label="Description"><Textarea value={description} onChange={(event)=>setDescription(event.target.value)} placeholder="Context, acceptance criteria, or implementation notes" className="min-h-24"/></FormGroup><div className="grid gap-4 sm:grid-cols-3"><FormGroup label="Priority"><select value={priority} onChange={(event)=>setPriority(event.target.value as PMTaskPriority)} className="h-9 rounded-lg border border-input bg-card px-3 text-xs">{priorities.map((value)=><option key={value}>{value}</option>)}</select></FormGroup><FormGroup label="Due Date"><Input type="date" value={dueDate} onChange={(event)=>setDueDate(event.target.value)}/></FormGroup><FormGroup label="Labels (comma separated)"><Input value={labels} onChange={(event)=>setLabels(event.target.value)} placeholder="frontend, regression"/></FormGroup></div><FormGroup label="Assignees"><div className="flex flex-wrap gap-2 rounded-lg border border-border p-3">{board.members.map((member)=><label key={member.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${assignees.includes(member.id)?'border-primary bg-primary/5':'border-border'}`}><input type="checkbox" className="sr-only" checked={assignees.includes(member.id)} onChange={()=>setAssignees((current)=>current.includes(member.id)?current.filter((id)=>id!==member.id):[...current,member.id])}/><Avatar name={member.name} avatarUrl={member.avatar_url} className="h-5 w-5 bg-primary text-[8px] text-primary-foreground"/>{member.name}</label>)}</div></FormGroup><FormGroup label="Attachment URL"><Input type="url" value={attachmentUrl} onChange={(event)=>setAttachmentUrl(event.target.value)} placeholder="https://..."/></FormGroup><div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="mb-3 flex items-center gap-1.5 text-xs font-black"><Link2 className="h-4 w-4"/>Link existing QA data (optional)</p><div className="grid gap-3 sm:grid-cols-3"><select value={linkType} onChange={(event)=>setLinkType(event.target.value as PMLinkType| '')} className="h-9 rounded-lg border border-input bg-card px-3 text-xs"><option value="">No link</option>{linkTypes.map((value)=><option key={value}>{value}</option>)}</select><Input value={linkedCode} onChange={(event)=>setLinkedCode(event.target.value)} placeholder="Reference, e.g. ISSUE-142"/><Input value={linkedId} onChange={(event)=>setLinkedId(event.target.value)} placeholder="Source record ID"/></div></div><div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>{task?'Save Changes':'Create Task'}</Button></div></form></Dialog>; }

function MemberDialog({isOpen,onClose,board,users,onSubmit}:{isOpen:boolean;onClose:()=>void;board:PMBoardData;users:PMUser[];onSubmit:(userId:string,role:PMProjectRole)=>Promise<void>}) { const available=users.filter((user)=>!board.members.some((member)=>member.id===user.id));const [userId,setUserId]=React.useState(available[0]?.id||'');const [role,setRole]=React.useState<PMProjectRole>('Member');return <Dialog isOpen={isOpen} onClose={onClose} title="Assign Member"><div className="space-y-4"><FormGroup label="User"><select value={userId} onChange={(event)=>setUserId(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs"><option value="">Select user</option>{available.map((user)=><option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></FormGroup><FormGroup label="Project Role"><select value={role} onChange={(event)=>setRole(event.target.value as PMProjectRole)} className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs"><option>Member</option><option>Viewer</option></select></FormGroup><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!userId} onClick={()=>void onSubmit(userId,role)}>Assign Member</Button></div></div></Dialog>; }

function TaskDetailDialog({task,data,members,currentUserId,projectRole,canWrite,onClose,onEdit,onDelete,onAddComment,onDeleteComment,onAddChecklist,onToggleChecklist}:{task:PMTask;data:{comments:PMComment[];checklist:PMChecklistItem[];activities:PMActivity[]}|null;members:PMBoardData['members'];currentUserId:string;projectRole:PMProjectRole;canWrite:boolean;onClose:()=>void;onEdit:()=>void;onDelete:()=>void;onAddComment:(draft:CommentDraft)=>Promise<void>;onDeleteComment:(id:string)=>Promise<void>;onAddChecklist:(text:string)=>Promise<void>;onToggleChecklist:(id:string)=>Promise<void>}) {
  const [comment,setComment]=React.useState('');
  const [checklist,setChecklist]=React.useState('');
  const [mentionIds,setMentionIds]=React.useState<string[]>([]);
  const [imageUrl,setImageUrl]=React.useState<string|null>(null);
  const [imageName,setImageName]=React.useState<string|null>(null);
  const [commentSubmitting,setCommentSubmitting]=React.useState(false);
  const [commentError,setCommentError]=React.useState('');
  const [deletingCommentId,setDeletingCommentId]=React.useState<string|null>(null);
  const fileInputRef=React.useRef<HTMLInputElement>(null);

  const attachImage=React.useCallback(async(file:File)=>{
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) throw new Error('Screenshot must be PNG, JPG, WebP, or GIF.');
    if(file.size>MAX_COMMENT_IMAGE_BYTES) throw new Error('Screenshot cannot exceed 2 MB.');
    const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Unable to read screenshot.'));reader.readAsDataURL(file);});
    setImageUrl(dataUrl);setImageName(file.name||'screenshot.png');setCommentError('');
  },[]);

  async function submitComment(event:React.FormEvent) {
    event.preventDefault();
    if(commentSubmitting||(!comment.trim()&&!imageUrl)) return;
    const draft:CommentDraft={text:comment.trim(),mentionIds,imageUrl,imageName,clientRequestId:crypto.randomUUID()};
    const previous={comment,mentionIds,imageUrl,imageName};
    setComment('');setMentionIds([]);setImageUrl(null);setImageName(null);setCommentError('');setCommentSubmitting(true);
    try { await onAddComment(draft); }
    catch(error) { setComment(previous.comment);setMentionIds(previous.mentionIds);setImageUrl(previous.imageUrl);setImageName(previous.imageName);setCommentError(error instanceof Error?error.message:'Unable to send comment.'); }
    finally { setCommentSubmitting(false); }
  }

  return <Dialog isOpen onClose={onClose} title={task.title} size="xl">
    {canWrite&&<div className="mb-4 flex justify-end gap-2"><Button size="sm" variant="outline" onClick={onEdit}>Edit Task</Button><Button size="sm" variant="destructive" onClick={onDelete}>Delete Task</Button></div>}
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div><p className="text-[9px] font-bold uppercase text-muted-foreground">Description</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{task.description||'No description.'}</p></div>
        {task.links.length>0&&<div><p className="mb-2 text-[9px] font-bold uppercase text-muted-foreground">Linked QA Records</p><div className="flex flex-wrap gap-2">{task.links.map((link)=><Link key={link.id} href={linkHref(link.link_type,link.linked_id)} className="flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-bold text-violet-600"><Link2 className="h-3 w-3"/>{link.linked_code}</Link>)}</div></div>}
        <div><p className="mb-2 text-[9px] font-bold uppercase text-muted-foreground">Checklist</p><div className="space-y-2">{data?.checklist.map((item)=><label key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs"><input type="checkbox" checked={item.is_done} disabled={!canWrite} onChange={()=>void onToggleChecklist(item.id)}/><span className={item.is_done?'text-muted-foreground line-through':''}>{item.text}</span></label>)}</div>{canWrite&&<form onSubmit={async(event)=>{event.preventDefault();if(!checklist.trim())return;await onAddChecklist(checklist);setChecklist('');}} className="mt-2 flex gap-2"><Input value={checklist} onChange={(event)=>setChecklist(event.target.value)} placeholder="Add checklist item" className="text-xs"/><Button size="sm">Add</Button></form>}</div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase text-muted-foreground">Comments</p>
          <div className="space-y-2">{data?.comments.map((item)=><div key={item.id} className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold">{item.author_name}</span><span className="ml-2 text-[8px] text-muted-foreground">{new Date(item.created_at).toLocaleString('id-ID')}</span></div>{(item.author_id===currentUserId||projectRole==='Project Lead')&&<button type="button" disabled={deletingCommentId===item.id} onClick={async()=>{if(!confirm('Delete this comment?'))return;setDeletingCommentId(item.id);try{await onDeleteComment(item.id);}catch(error){setCommentError(error instanceof Error?error.message:'Unable to delete comment.');}finally{setDeletingCommentId(null);}}} className="rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40" aria-label="Delete comment"><Trash2 className="h-3.5 w-3.5"/></button>}</div>
            {item.mentions?.length>0&&<div className="mt-2 flex flex-wrap gap-1">{item.mentions.map((member)=><span key={member.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">@{member.name}</span>)}</div>}
            {item.body&&<p className="mt-2 whitespace-pre-wrap text-xs">{item.body}</p>}
            {item.image_url&&<a href={item.image_url} download={item.image_name||'screenshot'} className="mt-3 block overflow-hidden rounded-lg border border-border bg-card"><Image src={item.image_url} alt={item.image_name||'Comment screenshot'} width={900} height={520} unoptimized className="max-h-80 w-full object-contain"/></a>}
          </div>)}</div>
          {canWrite&&<form onSubmit={submitComment} className="mt-3 rounded-xl border border-border bg-card p-3">
            {mentionIds.length>0&&<div className="mb-2 flex flex-wrap gap-1.5">{mentionIds.map((id)=>{const member=members.find((item)=>item.id===id);return member?<span key={id} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">@{member.name}<button type="button" onClick={()=>setMentionIds((current)=>current.filter((item)=>item!==id))} aria-label={`Remove ${member.name}`}><X className="h-3 w-3"/></button></span>:null;})}</div>}
            {imageUrl&&<div className="relative mb-2 w-fit overflow-hidden rounded-lg border border-border"><Image src={imageUrl} alt={imageName||'Screenshot preview'} width={320} height={180} unoptimized className="max-h-40 w-auto object-contain"/><button type="button" onClick={()=>{setImageUrl(null);setImageName(null);}} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label="Remove screenshot"><X className="h-3 w-3"/></button></div>}
            <Input value={comment} disabled={commentSubmitting} onChange={(event)=>setComment(event.target.value)} onPaste={(event)=>{const file=Array.from(event.clipboardData.files).find((item)=>item.type.startsWith('image/'));if(file){event.preventDefault();void attachImage(file).catch((error)=>setCommentError(error instanceof Error?error.message:'Unable to attach screenshot.'));}}} placeholder="Write a comment or paste a screenshot" className="text-xs"/>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="relative"><AtSign className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground"/><select aria-label="Tag project member" value="" disabled={commentSubmitting} onChange={(event)=>{const id=event.target.value;if(id)setMentionIds((current)=>current.includes(id)?current:[...current,id]);}} className="h-8 rounded-lg border border-input bg-card pl-7 pr-2 text-[10px] font-semibold"><option value="">Tag member</option>{members.filter((member)=>!mentionIds.includes(member.id)).map((member)=><option key={member.id} value={member.id}>@{member.name}</option>)}</select></div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event)=>{const file=event.target.files?.[0];if(file)void attachImage(file).catch((error)=>setCommentError(error instanceof Error?error.message:'Unable to attach screenshot.'));event.currentTarget.value='';}}/>
              <Button type="button" size="sm" variant="outline" disabled={commentSubmitting} onClick={()=>fileInputRef.current?.click()}><ImagePlus className="mr-1.5 h-3.5 w-3.5"/>Screenshot</Button>
              <Button type="submit" size="sm" loading={commentSubmitting} disabled={!comment.trim()&&!imageUrl} className="ml-auto">Comment</Button>
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">PNG, JPG, WebP, or GIF up to 2 MB. You can paste directly from clipboard.</p>
            {commentError&&<p role="alert" className="mt-2 text-[10px] font-semibold text-red-600">{commentError}</p>}
          </form>}
        </div>
      </div>
      <aside className="space-y-5"><div className="rounded-xl border border-border p-4 text-xs"><Meta label="Reporter" value={task.reporter_name}/><Meta label="Priority" value={task.priority}/><Meta label="Due date" value={task.due_date||'Not set'}/><Meta label="Created" value={new Date(task.created_at).toLocaleDateString('id-ID')}/><Meta label="Assignees" value={task.assignees.map((user)=>user.name).join(', ')||'Unassigned'}/><Meta label="Labels" value={task.labels.join(', ')||'None'}/>{task.attachment_url&&<a href={task.attachment_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 font-bold text-primary underline"><Paperclip className="h-3 w-3"/>{task.attachment_name||'Attachment'}</a>}</div><div><p className="mb-3 flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted-foreground"><Activity className="h-3.5 w-3.5"/>Activity History</p><div className="space-y-3">{data?.activities.map((item)=><div key={item.id} className="border-l-2 border-border pl-3"><p className="text-[10px]"><span className="font-bold">{item.actor_name}</span> {item.details}</p><p className="mt-0.5 text-[8px] text-muted-foreground">{new Date(item.created_at).toLocaleString('id-ID')}</p></div>)}</div></div></aside>
    </div>
  </Dialog>;
}
function Meta({label,value}:{label:string;value:string}){return <div className="mb-3"><p className="text-[8px] font-bold uppercase text-muted-foreground">{label}</p><p className="mt-0.5 font-semibold">{value}</p></div>;}

function BulkTaskTable({ tasks, board, canWrite, onOpen, onBulkMove, onBulkDelete }: { tasks: PMTask[]; board: PMBoardData; canWrite: boolean; onOpen: (task: PMTask) => void; onBulkMove: (taskIds: string[], columnId: string) => Promise<void>; onBulkDelete: (taskIds: string[]) => Promise<void> }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const allSelected = tasks.length > 0 && tasks.every((task) => selected.includes(task.id));
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      {canWrite && selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2">
          <span className="mr-auto text-[10px] font-bold">{selected.length} selected</span>
          <select defaultValue="" onChange={(event) => { if (event.target.value) { void onBulkMove(selected, event.target.value); setSelected([]); event.target.value = ''; } }} className="h-8 rounded-lg border border-input bg-card px-2 text-[10px] font-semibold">
            <option value="" disabled>Move to...</option>
            {board.columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
          </select>
          <Button size="sm" variant="destructive" onClick={() => { void onBulkDelete(selected); setSelected([]); }}>Delete selected</Button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-secondary/50 text-[9px] uppercase tracking-wide text-muted-foreground"><tr>
            {canWrite ? <th className="w-10 px-4 py-3"><input aria-label="Select all tasks" type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : tasks.map((task) => task.id))} /></th> : null}
            <th className="px-4 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assignees</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Labels</th>
          </tr></thead>
          <tbody>{tasks.map((task) => <tr key={task.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
            {canWrite ? <td className="px-4 py-3"><input aria-label={`Select ${task.title}`} type="checkbox" checked={selected.includes(task.id)} onChange={() => setSelected((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} /></td> : null}
            <td onClick={() => onOpen(task)} className="max-w-sm cursor-pointer px-4 py-3"><p className="font-bold">{task.title}</p>{task.links.length > 0 ? <p className="mt-1 text-[9px] font-bold text-violet-600">{task.links.map((link) => link.linked_code).join(', ')}</p> : null}</td>
            <td className="px-4 py-3 font-semibold">{board.columns.find((column) => column.id === task.column_id)?.name}</td>
            <td className="px-4 py-3"><div className="flex -space-x-1.5">{task.assignees.map((user) => <Avatar key={user.id} name={user.name} avatarUrl={user.avatar_url} className="h-6 w-6 border-2 border-card bg-primary text-[8px] text-primary-foreground" />)}</div></td>
            <td className="px-4 py-3"><span className={`rounded-md border px-2 py-1 text-[9px] font-black ${priorityClass[task.priority]}`}>{task.priority}</span></td>
            <td className={`px-4 py-3 ${isOverdue(task) ? 'font-bold text-red-500' : ''}`}>{task.due_date || '—'}</td><td className="px-4 py-3">{task.labels.join(', ') || '—'}</td>
          </tr>)}</tbody>
        </table>
        {tasks.length === 0 ? <p className="p-10 text-center text-xs text-muted-foreground">No tasks match the current filters.</p> : null}
      </div>
    </div>
  );
}
