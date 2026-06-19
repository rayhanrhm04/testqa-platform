'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  ChevronLeft, ArrowLeftRight, MessageSquare, AlertCircle, 
  Send, User, Calendar, Folder, HelpCircle, Check, Bug, ShieldAlert, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';

export default function FeedbackDetailPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { feedbacks, projects, issues, comments, releases, projectShares, users } = useDataStore();
  const { addComment, convertFeedbackToIssue, logActivity } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [convertType, setConvertType] = React.useState<'Bug' | 'Improvement' | null>(null);
  const [commentText, setCommentText] = React.useState('');
  
  // Issue conversion form state
  const [issueTitle, setIssueTitle] = React.useState('');
  const [issueDesc, setIssueDesc] = React.useState('');
  const [expected, setExpected] = React.useState('');
  const [actual, setActual] = React.useState('');
  const [steps, setSteps] = React.useState('');
  const [severity, setSeverity] = React.useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [assignedTo, setAssignedTo] = React.useState('');
  const [releaseId, setReleaseId] = React.useState('');

  // Extract feedback ID from URL path (e.g. /feedback/123)
  const feedbackId = pathname.split('/').pop();
  
  const feedback = React.useMemo(() => {
    return feedbacks.find((f) => f.id === feedbackId);
  }, [feedbacks, feedbackId]);

  const hasAccess = React.useMemo(() => {
    if (!feedback) return false;
    if (!currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === feedback.project_id);
    if (shares.length === 0) return true; // public project
    return shares.some(s => s.user_id === currentUser?.id);
  }, [activeRole, projectShares, feedback, currentUser]);

  const project = React.useMemo(() => {
    if (!feedback || !hasAccess) return null;
    return projects.find((p) => p.id === feedback.project_id);
  }, [projects, feedback, hasAccess]);

  const reporter = React.useMemo(() => {
    if (!feedback || !hasAccess) return null;
    return users.find((u) => u.id === feedback.reporter_id);
  }, [users, feedback, hasAccess]);

  const linkedIssues = React.useMemo(() => {
    if (!hasAccess) return [];
    return issues.filter((i) => i.feedback_id === feedbackId);
  }, [issues, feedbackId, hasAccess]);

  const feedbackComments = React.useMemo(() => {
    if (!hasAccess) return [];
    return comments.filter((c) => c.entity_type === 'feedback' && c.entity_id === feedbackId);
  }, [comments, feedbackId, hasAccess]);

  // Set default values when opening the convert modal
  React.useEffect(() => {
    if (feedback && convertType) {
      setIssueTitle(feedback.title);
      setIssueDesc(feedback.description);
      setSteps(
        convertType === 'Bug' 
          ? '1. Open map app\n2. Zoom out\n3. Click export' 
          : '1. Navigate to community page\n2. View widget'
      );
      setExpected(convertType === 'Bug' ? 'Date columns are clean and readable.' : '');
      setActual(convertType === 'Bug' ? 'Raw Unix timestamp displays.' : '');
      setSeverity('Medium');
      setAssignedTo(users.find(u => u.role === 'Developer')?.id || '');
      setReleaseId(releases[0]?.id || '');
    }
  }, [feedback, convertType, users, releases]);

  if (!feedback || !hasAccess) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-2" />
        <h3 className="text-base font-bold text-foreground">Akses Dibatasi</h3>
        <p className="text-xs text-muted-foreground mt-1">Anda tidak memiliki akses kolaborator untuk melihat detail feedback ini.</p>
        <Link href="/feedback" className="mt-4">
          <Button variant="outline" size="sm">
            Kembali ke Feedbacks
          </Button>
        </Link>
      </div>
    );
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    try {
      await addComment('feedback', feedback.id, currentUser.id, commentText);
      await logActivity(currentUser.id, `Commented on feedback ${feedback.code}`, feedback.title);
      setCommentText('');
      addToast('Comment added!', 'success');
    } catch (e) {
      addToast('Failed to add comment.', 'error');
    }
  };

  const handleConvertSubmit = async () => {
    if (!convertType || !currentUser) return;
    try {
      const issueData = {
        project_id: feedback.project_id,
        title: issueTitle,
        description: issueDesc,
        expected_result: convertType === 'Bug' ? expected : undefined,
        actual_result: convertType === 'Bug' ? actual : undefined,
        steps_to_reproduce: convertType === 'Bug' ? steps : undefined,
        severity,
        assigned_to: assignedTo || undefined,
        release_id: releaseId || undefined,
      };

      await convertFeedbackToIssue(feedback.id, convertType, issueData);
      await logActivity(currentUser.id, `Converted feedback ${feedback.code} to ${convertType}`, issueTitle);
      addToast(`Feedback successfully converted to ${convertType}!`, 'success');
      setConvertType(null);
    } catch (e) {
      addToast('Failed to convert feedback.', 'error');
    }
  };

  const canConvert = React.useMemo(() => {
    if (!currentUser) return true;
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === feedback.project_id);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser?.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, feedback, currentUser]);

  // Badge stylings
  const getPriorityColor = (p: string) => {
    const map = {
      Low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      Medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      High: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      Critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    };
    return map[p as keyof typeof map] || 'text-zinc-500 bg-zinc-500/10';
  };

  const getStatusColor = (s: string) => {
    const map = {
      Open: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      Reviewed: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      Implemented: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      Rejected: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
    };
    return map[s as keyof typeof map] || 'text-zinc-500 bg-zinc-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link href="/feedback" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold">
          <ChevronLeft className="h-4 w-4" />
          Back to Feedbacks
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Info Body */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {feedback.code}
                </span>
                <h2 className="text-xl font-bold tracking-tight mt-1.5">{feedback.title}</h2>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</h3>
              <div className="text-sm leading-relaxed text-foreground bg-muted/20 p-4 rounded-lg border border-border/50 whitespace-pre-wrap">
                {feedback.description}
              </div>
            </div>

            {/* Conversion Panel */}
            {canConvert && feedback.status !== 'Implemented' && (
              <div className="border-t border-border pt-5 space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Convert to Issue Tracking
                </h3>
                <p className="text-xs text-muted-foreground">
                  Transform this feedback log directly into a Bug tickets or an Improvement target on the Scrumboard.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (!currentUser) {
                        router.push('/login');
                        return;
                      }
                      setConvertType('Bug');
                    }}
                    className="cursor-pointer text-xs font-bold"
                  >
                    <Bug className="h-3.5 w-3.5 mr-1 text-red-500" />
                    Convert to Bug
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (!currentUser) {
                        router.push('/login');
                        return;
                      }
                      setConvertType('Improvement');
                    }}
                    className="cursor-pointer text-xs font-bold"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                    Convert to Improvement
                  </Button>
                </div>
              </div>
            )}

            {!canConvert && (
              <div className="border-t border-border pt-4 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Conversion tools are locked. Switch your active role to Admin or QA Engineer in the sidebar.</span>
              </div>
            )}
          </div>

          {/* Linked Issues Indicator */}
          {linkedIssues.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Linked Issues</h3>
              <div className="space-y-2">
                {linkedIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg border border-border/70 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        issue.type === 'Bug' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                      }`}>
                        {issue.code}
                      </span>
                      <span className="text-sm font-semibold">{issue.title}</span>
                    </div>
                    <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-md border border-border">
                      {issue.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({feedbackComments.length})
            </h3>

            {/* Comments Timeline */}
            <div className="space-y-4">
              {feedbackComments.length > 0 ? (
                feedbackComments.map((comm) => {
                  const user = users.find((u) => u.id === comm.user_id);
                  return (
                    <div key={comm.id} className="flex gap-3 text-sm border-b border-border/40 pb-4 last:border-0 last:pb-0">
                      <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {user?.name.charAt(0) || 'U'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{user?.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comm.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-normal">{comm.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No comments posted yet.</p>
              )}
            </div>

            {!currentUser ? (
              <div className="text-center p-3 bg-muted/20 border border-border/40 rounded-lg text-sm">
                <Link href="/login" className="text-primary font-bold hover:underline">Sign In</Link> to write a comment.
              </div>
            ) : (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ask a question or add details..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" className="shrink-0 cursor-pointer">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Metadata Panel */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
              Feedback Properties
            </h3>

            <div className="space-y-3.5">
              {/* Project */}
              <div className="flex items-start gap-3">
                <Folder className="h-4.5 w-4.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Project</p>
                  <p className="text-sm font-semibold">{project ? project.name : 'N/A'}</p>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4.5 w-4.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Priority</p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 mt-1 border rounded-full ${getPriorityColor(feedback.priority)}`}>
                    {feedback.priority}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start gap-3">
                <HelpCircle className="h-4.5 w-4.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Status</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 mt-1 border rounded-md ${getStatusColor(feedback.status)}`}>
                    {feedback.status}
                  </span>
                </div>
              </div>

              {/* Reporter */}
              <div className="flex items-start gap-3">
                <User className="h-4.5 w-4.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Reporter</p>
                  <p className="text-sm font-semibold">{reporter ? reporter.name : 'Unknown'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{reporter?.email}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4.5 w-4.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Submitted At</p>
                  <p className="text-xs font-medium">{new Date(feedback.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Convert Dialog */}
      <Dialog
        isOpen={convertType !== null}
        onClose={() => setConvertType(null)}
        title={`Convert to ${convertType} ticket`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConvertType(null)}>
              Cancel
            </Button>
            <Button onClick={handleConvertSubmit}>
              Convert Feedback
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormGroup label="Issue Title">
            <Input value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
          </FormGroup>

          <FormGroup label="Description">
            <Textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} rows={4} />
          </FormGroup>

          {convertType === 'Bug' && (
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
                <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} />
              </FormGroup>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Severity Rating">
              <Select value={severity} onChange={(e: any) => setSeverity(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </FormGroup>

            <FormGroup label="Assign Developer">
              <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {users.filter(u => u.role === 'Developer').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Target Release Version">
            <Select value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
              <option value="">Backlog (No release)</option>
              {releases.map(r => (
                <option key={r.id} value={r.id}>Version {r.version} ({r.status})</option>
              ))}
            </Select>
          </FormGroup>
        </div>
      </Dialog>
    </div>
  );
}
