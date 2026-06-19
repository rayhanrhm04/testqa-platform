'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Rocket, Plus, Calendar, Edit, Trash2, ShieldAlert,
  Sparkles, FileText, CheckCircle2, ChevronRight, FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function ReleasesPage() {
  const router = useRouter();
  const { releases, issues, addRelease, updateRelease, deleteRelease, logActivity } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [isOpen, setIsOpen] = React.useState(false);
  const [editingRelease, setEditingRelease] = React.useState<any | null>(null);

  // Form states
  const [version, setVersion] = React.useState('');
  const [releaseDate, setReleaseDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<'Draft' | 'Released'>('Draft');

  React.useEffect(() => {
    if (editingRelease) {
      setVersion(editingRelease.version);
      // Format date for html input
      const date = new Date(editingRelease.release_date);
      setReleaseDate(date.toISOString().split('T')[0]);
      setNotes(editingRelease.notes || '');
      setStatus(editingRelease.status);
    } else {
      setVersion('');
      setReleaseDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setStatus('Draft');
    }
  }, [editingRelease]);

  const canModify = !currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer';

  const handleSubmit = async () => {
    // Basic Semver validation
    if (!version.trim() || !/^\d+\.\d+\.\d+$/.test(version)) {
      addToast('Version must follow semver format (e.g., 2.56.02).', 'warning');
      return;
    }

    const payload = {
      version,
      release_date: new Date(releaseDate).toISOString(),
      notes: notes || undefined,
      status,
    };

    try {
      if (editingRelease) {
        await updateRelease(editingRelease.id, payload);
        addToast(`Release v${version} updated!`, 'success');
      } else {
        await addRelease(payload);
        addToast(`Release v${version} created successfully!`, 'success');
      }
      setIsOpen(false);
      setEditingRelease(null);
    } catch (e) {
      addToast('Failed to save release.', 'error');
    }
  };

  const handleDelete = async (id: string, ver: string) => {
    if (confirm(`Are you sure you want to delete Release v${ver}?`)) {
      await deleteRelease(id);
      addToast(`Deleted Release v${ver}`, 'success');
    }
  };

  // Auto-generate Release Notes
  const handleAutoGenerateNotes = async (releaseId: string, version: string) => {
    if (!canModify) return;

    // Find issues mapped to this release
    const releaseIssues = issues.filter(i => i.release_id === releaseId);
    
    const bugs = releaseIssues.filter(i => i.type === 'Bug');
    const improvements = releaseIssues.filter(i => i.type === 'Improvement');

    let generatedNotes = `## Release Notes - v${version}\n\n`;

    if (improvements.length > 0) {
      generatedNotes += `### Improvements\n\n`;
      improvements.forEach(imp => {
        generatedNotes += `* ${imp.title}\n`;
      });
      generatedNotes += `\n`;
    } else {
      generatedNotes += `### Improvements\n\n* No new improvements in this version.\n\n`;
    }

    if (bugs.length > 0) {
      generatedNotes += `### Bug Fixes\n\n`;
      bugs.forEach(bug => {
        generatedNotes += `* ${bug.title}\n`;
      });
      generatedNotes += `\n`;
    } else {
      generatedNotes += `### Bug Fixes\n\n* No bugs reported resolved in this version.\n\n`;
    }

    try {
      await updateRelease(releaseId, { notes: generatedNotes });
      if (currentUser) {
        await logActivity(currentUser.id, `Generated release notes for v${version}`);
      }
      addToast(`Auto-generated release notes for v${version}!`, 'success');
    } catch (err) {
      addToast('Failed to save notes.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Release Management</h1>
          <p className="text-sm text-muted-foreground">Manage software release versions, compile changelogs, and document milestones.</p>
        </div>
        <div>
          {canModify ? (
            <Button onClick={() => {
              if (!currentUser) {
                router.push('/login');
                return;
              }
              setEditingRelease(null);
              setIsOpen(true);
            }} className="cursor-pointer font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Release
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Schedules locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Releases */}
      <div className="space-y-6">
        {releases.map((rel) => {
          // Count issues
          const relIssues = issues.filter(i => i.release_id === rel.id);
          const bugsCount = relIssues.filter(i => i.type === 'Bug').length;
          const impsCount = relIssues.filter(i => i.type === 'Improvement').length;

          return (
            <div 
              key={rel.id}
              className="bg-card rounded-xl border border-border p-6 shadow-sm hover:border-primary/25 transition-all grid gap-6 md:grid-cols-3 items-start"
            >
              {/* Release Version Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">v{rel.version}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    rel.status === 'Released'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {rel.status}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-4 w-4" /> 
                    Release: {new Date(rel.release_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                  <p className="font-semibold text-foreground/80 pt-1">
                    Issues resolved: {relIssues.length} ({bugsCount} Bugs / {impsCount} Improvements)
                  </p>
                </div>

                {/* CRUD button actions */}
                {canModify && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (!currentUser) {
                          router.push('/login');
                          return;
                        }
                        setEditingRelease(rel); 
                        setIsOpen(true);
                      }}
                      className="text-xs font-bold cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (!currentUser) {
                          router.push('/login');
                          return;
                        }
                        handleDelete(rel.id, rel.version);
                      }}
                      className="text-xs font-bold text-red-500 border-red-500/10 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Release Notes Preview */}
              <div className="md:col-span-2 bg-muted/20 border border-border/50 rounded-xl p-5 space-y-3 h-full">
                <div className="flex justify-between items-center border-b border-border/60 pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Release Notes Preview
                  </span>
                  
                  {canModify && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (!currentUser) {
                          router.push('/login');
                          return;
                        }
                        handleAutoGenerateNotes(rel.id, rel.version);
                      }}
                      className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1 text-yellow-500 animate-spin" />
                      Auto-generate changelog
                    </Button>
                  )}
                </div>

                <div className="text-xs leading-relaxed text-muted-foreground max-h-[160px] overflow-y-auto whitespace-pre-wrap font-sans">
                  {rel.notes ? (
                    <div className="prose dark:prose-invert max-w-none text-foreground/80">
                      {rel.notes}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground/60 italic">
                      No release notes generated yet. Click "Auto-generate changelog" to compile logs.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Release setup dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setEditingRelease(null); }}
        title={editingRelease ? 'Modify Release' : 'Setup New Release'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsOpen(false); setEditingRelease(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save Release
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormGroup label="Release Version (SemVer)">
            <Input 
              value={version} 
              onChange={(e) => setVersion(e.target.value)} 
              placeholder="e.g. 2.56.02" 
            />
          </FormGroup>

          <FormGroup label="Release Date">
            <Input 
              type="date"
              value={releaseDate} 
              onChange={(e) => setReleaseDate(e.target.value)} 
            />
          </FormGroup>

          <FormGroup label="Release Notes Markdown Override">
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Changelog details..." 
              rows={4} 
            />
          </FormGroup>

          <FormGroup label="Release Status">
            <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
              <option value="Draft">Draft</option>
              <option value="Released">Released</option>
            </Select>
          </FormGroup>
        </div>
      </Dialog>
    </div>
  );
}
