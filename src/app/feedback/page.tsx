'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feedbackSchema, Feedback, FeedbackPriority, FeedbackStatus } from '@/lib/validators';
import { Plus, Search, Filter, MessageSquare, ArrowRight, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
  const router = useRouter();
  const { feedbacks, projects, projectShares, users } = useDataStore();
  const { addFeedback, updateFeedback, deleteFeedback } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [projectFilter, setProjectFilter] = React.useState<string>('all');
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingFeedback, setEditingFeedback] = React.useState<Feedback | null>(null);

  const [attachmentUrlState, setAttachmentUrlState] = React.useState('');
  const [attachmentNameState, setAttachmentNameState] = React.useState('');

  // Form setup
  const { 
    register, 
    handleSubmit, 
    reset, 
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: '',
      description: '',
      project_id: '',
      reporter_id: currentUser?.id || '',
      priority: 'Medium' as FeedbackPriority,
      status: 'Open' as FeedbackStatus,
      attachment_url: '',
      attachment_name: '',
    }
  });

  // Sync attachment state on create/edit open
  React.useEffect(() => {
    if (isCreateOpen) {
      if (editingFeedback) {
        setAttachmentUrlState(editingFeedback.attachment_url || '');
        setAttachmentNameState(editingFeedback.attachment_name || '');
      } else {
        setAttachmentUrlState('');
        setAttachmentNameState('');
      }
    }
  }, [editingFeedback, isCreateOpen]);

  // Pre-fill form if editing
  React.useEffect(() => {
    if (isCreateOpen) {
      if (editingFeedback) {
        setValue('title', editingFeedback.title);
        setValue('description', editingFeedback.description);
        setValue('project_id', editingFeedback.project_id);
        setValue('reporter_id', editingFeedback.reporter_id || '');
        setValue('priority', editingFeedback.priority);
        setValue('status', editingFeedback.status);
        setValue('attachment_url', editingFeedback.attachment_url || '');
        setValue('attachment_name', editingFeedback.attachment_name || '');
      } else {
        reset({
          title: '',
          description: '',
          project_id: projectFilter !== 'all' ? projectFilter : (projects[0]?.id || ''),
          reporter_id: currentUser?.id || '',
          priority: 'Medium',
          status: 'Open',
          attachment_url: '',
          attachment_name: '',
        });
      }
    }
  }, [editingFeedback, projects, currentUser, setValue, reset, isCreateOpen, projectFilter]);

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

  const accessibleProjectIds = React.useMemo(() => accessibleProjects.map(p => p.id), [accessibleProjects]);

  const canModifyProject = React.useCallback((projId: string) => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === projId);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser?.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, currentUser]);

  const canEditFeedback = React.useCallback((fb: Feedback) => {
    if (!currentUser) return true;
    return fb.reporter_id === currentUser?.id || canModifyProject(fb.project_id);
  }, [currentUser, canModifyProject]);

  // Filters calculation
  const filteredFeedbacks = React.useMemo(() => {
    return feedbacks.filter((fb) => {
      // Must belong to an accessible project
      const isProjAccessible = accessibleProjectIds.includes(fb.project_id);
      if (!isProjAccessible) return false;

      const matchSearch = fb.title.toLowerCase().includes(search.toLowerCase()) || 
                          fb.code.toLowerCase().includes(search.toLowerCase()) ||
                          fb.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || fb.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || fb.priority === priorityFilter;
      const matchProject = projectFilter === 'all' || fb.project_id === projectFilter;
      return matchSearch && matchStatus && matchPriority && matchProject;
    });
  }, [feedbacks, search, statusFilter, priorityFilter, projectFilter, accessibleProjectIds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("File size too large (Max 5MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setValue('attachment_url', base64);
      setValue('attachment_name', file.name);
      setAttachmentUrlState(base64);
      setAttachmentNameState(file.name);
      addToast(`File ${file.name} selected!`, "success");
    };
    reader.readAsDataURL(file);
  };

  const handleClearAttachment = () => {
    setValue('attachment_url', '');
    setValue('attachment_name', '');
    setAttachmentUrlState('');
    setAttachmentNameState('');
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingFeedback) {
        await updateFeedback(editingFeedback.id, data);
        addToast(`Feedback ${editingFeedback.code} updated successfully!`, 'success');
      } else {
        await addFeedback(data);
        addToast('New feedback logged successfully!', 'success');
      }
      setIsCreateOpen(false);
      setEditingFeedback(null);
      reset();
    } catch (e) {
      addToast('Failed to save feedback.', 'error');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete ${code}?`)) {
      await deleteFeedback(id);
      addToast(`Feedback ${code} deleted!`, 'success');
    }
  };

  // Badge Styles
  const getPriorityBadge = (p: FeedbackPriority) => {
    const styles = {
      Low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      Critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${styles[p]}`}>
        {p}
      </span>
    );
  };

  const getStatusBadge = (s: FeedbackStatus) => {
    const styles = {
      Open: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      Reviewed: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      Implemented: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      Rejected: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    };
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${styles[s]}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Feedback Management</h1>
          <p className="text-sm text-muted-foreground">Log, review, and convert feedback submitted by users and reporter teams.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              if (!currentUser) {
                router.push('/login');
                return;
              }
              setEditingFeedback(null); 
              setIsCreateOpen(true); 
            }}
            className="cursor-pointer font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
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
          <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">All Projects</option>
            {accessibleProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Implemented">Implemented</option>
            <option value="Rejected">Rejected</option>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>
        </div>
      </div>

      {/* Feedbacks Grid List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-foreground min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 font-semibold text-muted-foreground">
                <th className="p-4 w-24">Code</th>
                <th className="p-4 min-w-[200px]">Title</th>
                <th className="p-4">Project</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map((fb) => {
                  const proj = projects.find((p) => p.id === fb.project_id);
                  return (
                    <tr 
                      key={fb.id} 
                      className="hover:bg-muted/10 transition-colors group cursor-pointer"
                    >
                      <td className="p-4 font-bold text-primary">
                        <Link href={`/feedback/${fb.id}`} className="hover:underline block">
                          {fb.code}
                        </Link>
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        <Link href={`/feedback/${fb.id}`} className="hover:text-primary transition-colors block">
                          {fb.title}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {proj ? proj.name : 'Unknown'}
                      </td>
                      <td className="p-4">{getPriorityBadge(fb.priority)}</td>
                      <td className="p-4">{getStatusBadge(fb.status)}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/feedback/${fb.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" title="View details & comments">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </Link>
                        {canEditFeedback(fb) && (
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
                                setEditingFeedback(fb); 
                                setIsCreateOpen(true); 
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
                                handleDelete(fb.id, fb.code);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Link href={`/feedback/${fb.id}`}>
                          <Button variant="outline" size="sm" className="h-8 font-semibold text-xs cursor-pointer">
                            Inspect
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-foreground/80">No feedbacks found</p>
                    <p className="text-xs mt-1">Adjust filters or log a new feedback submission.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditingFeedback(null); }}
        title={editingFeedback ? `Edit Feedback (${editingFeedback.code})` : 'Log New Feedback'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingFeedback(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
              {editingFeedback ? 'Save Changes' : 'Submit Feedback'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormGroup label="Feedback Title" error={errors.title?.message}>
            <Input 
              {...register('title')} 
              placeholder="e.g. Export date field returns epoch time" 
              error={!!errors.title}
            />
          </FormGroup>

          <FormGroup label="Description" error={errors.description?.message}>
            <Textarea 
              {...register('description')} 
              placeholder="Provide detail logs, reproduction issues, and browser configurations..." 
              rows={4}
              error={!!errors.description}
            />
          </FormGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Project Mapping" error={errors.project_id?.message}>
              <Select {...register('project_id')} error={!!errors.project_id}>
                {accessibleProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Priority Level" error={errors.priority?.message}>
              <Select {...register('priority')} error={!!errors.priority}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </FormGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Reporter User" error={errors.reporter_id?.message}>
              <Select {...register('reporter_id')} error={!!errors.reporter_id}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.role} - {u.name}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Status" error={errors.status?.message}>
              <Select {...register('status')} error={!!errors.status}>
                <option value="Open">Open</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Implemented">Implemented</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </FormGroup>
          </div>

          <div className="border-t border-border/40 pt-4 space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Attachment (Image/Document)</span>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-primary/40 rounded-lg cursor-pointer bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold text-foreground transition-colors shrink-0">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span>Upload File</span>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
              </label>

              {attachmentNameState ? (
                <div className="flex items-center justify-between flex-1 min-w-0 px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/20 text-xs">
                  <span className="truncate text-foreground font-semibold flex-1 mr-2">{attachmentNameState}</span>
                  <button 
                    type="button"
                    onClick={handleClearAttachment}
                    className="text-red-500 hover:text-red-600 font-bold shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No file attached (Max 5MB)</span>
              )}
            </div>

            {attachmentUrlState && attachmentUrlState.startsWith('data:image/') && (
              <div className="mt-2 relative w-full max-h-[140px] rounded-lg overflow-hidden border border-border bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center p-2">
                <img 
                  src={attachmentUrlState} 
                  alt="Attachment Preview" 
                  className="max-w-full max-h-[120px] object-contain rounded-md"
                />
              </div>
            )}
          </div>
        </form>
      </Dialog>
    </div>
  );
}
