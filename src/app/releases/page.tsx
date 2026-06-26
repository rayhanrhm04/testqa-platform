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
  const { 
    releases, issues, addRelease, updateRelease, deleteRelease, logActivity, 
    releaseProjects, addReleaseProject, deleteReleaseProject 
  } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [isOpen, setIsOpen] = React.useState(false);
  const [editingRelease, setEditingRelease] = React.useState<any | null>(null);

  // New release project modal state
  const [isProjOpen, setIsProjOpen] = React.useState(false);
  const [newProjName, setNewProjName] = React.useState('');

  // Filter and association project states
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [projectId, setProjectId] = React.useState('');

  // Form states
  const [version, setVersion] = React.useState('');
  const [releaseDate, setReleaseDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<'Draft' | 'Released'>('Draft');

  // Set default selected project
  React.useEffect(() => {
    if (releaseProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(releaseProjects[0].id);
    }
  }, [releaseProjects, selectedProjectId]);

  React.useEffect(() => {
    if (isOpen) {
      if (editingRelease) {
        setVersion(editingRelease.version);
        // Format date for html input
        if (editingRelease.release_date) {
          const date = new Date(editingRelease.release_date);
          setReleaseDate(isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0]);
        } else {
          setReleaseDate('');
        }
        setNotes(editingRelease.notes || '');
        setStatus(editingRelease.status);
        setProjectId(editingRelease.project_id || '');
      } else {
        setVersion('');
        setReleaseDate('');
        setNotes('');
        setStatus('Draft');
        setProjectId(selectedProjectId);
      }
    }
  }, [editingRelease, selectedProjectId, isOpen]);

  const filteredReleases = React.useMemo(() => {
    return releases.filter(r => r.project_id === selectedProjectId);
  }, [releases, selectedProjectId]);

  const handleAddProject = async () => {
    if (!newProjName.trim()) {
      addToast('Project name cannot be empty.', 'warning');
      return;
    }

    try {
      const created = await addReleaseProject(newProjName.trim());
      if (created) {
        setSelectedProjectId(created.id);
        addToast(`Release project "${newProjName}" added successfully!`, 'success');
      }
      setNewProjName('');
      setIsProjOpen(false);
    } catch (e: any) {
      addToast(e.message || 'Failed to add release project.', 'error');
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the release project "${name}"? This will delete all releases and release notes associated with it.`)) {
      return;
    }

    try {
      await deleteReleaseProject(id);
      addToast(`Release project "${name}" deleted.`, 'info');
      // Re-initialize selection
      const remaining = releaseProjects.filter(rp => rp.id !== id);
      setSelectedProjectId(remaining.length > 0 ? remaining[0].id : '');
    } catch (e: any) {
      addToast(e.message || 'Failed to delete project.', 'error');
    }
  };

  const canModify = !currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer';

  const handleSubmit = async () => {
    // Basic Semver validation
    if (!version.trim() || !/^\d+\.\d+\.\d+$/.test(version)) {
      addToast('Version must follow semver format (e.g., 2.56.02).', 'warning');
      return;
    }

    const payload = {
      version,
      release_date: releaseDate ? new Date(releaseDate).toISOString() : null,
      notes: notes || undefined,
      status,
      project_id: projectId || null,
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

    // Find issues mapped to this release and selected project
    const releaseIssues = issues.filter(i => i.release_id === releaseId && i.project_id === selectedProjectId);
    
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

      {/* Project Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-muted/20 border border-border/50 rounded-xl p-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project:</span>
          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-bold bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary cursor-pointer text-foreground"
          >
            {releaseProjects.length > 0 ? (
              releaseProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))
            ) : (
              <option value="">No projects</option>
            )}
          </select>
          {canModify && selectedProjectId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const active = releaseProjects.find(rp => rp.id === selectedProjectId);
                if (active) handleDeleteProject(active.id, active.name);
              }}
              className="h-7 text-[10px] font-bold text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/5 cursor-pointer"
              title="Delete active project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {canModify && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsProjOpen(true)}
            className="h-8 text-xs font-bold cursor-pointer border-border hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
          </Button>
        )}
      </div>

      {/* Grid of Releases */}
      <div className="space-y-6">
        {filteredReleases.length > 0 ? (
          filteredReleases.map((rel) => {
            // Count issues
            const relIssues = issues.filter(i => i.release_id === rel.id && i.project_id === selectedProjectId);
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
                    {rel.release_date && (
                      <p className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-4 w-4" /> 
                        Release: {new Date(rel.release_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    )}
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
          })
        ) : (
          <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-card">
            <Rocket className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="font-semibold text-foreground/80">No releases for this project</p>
            <p className="text-xs mt-1">Create a release version to begin compiling changelogs.</p>
          </div>
        )}
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
          <FormGroup label="Target Project">
            <Select value={projectId} onChange={(e: any) => setProjectId(e.target.value)}>
              <option value="">No Project (Global)</option>
              {releaseProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormGroup>

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

      {/* Release project setup dialog */}
      <Dialog
        isOpen={isProjOpen}
        onClose={() => { setIsProjOpen(false); setNewProjName(''); }}
        title="Add Custom Release Project"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsProjOpen(false); setNewProjName(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddProject}>
              Add Project
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormGroup label="Project Name">
            <Input 
              value={newProjName} 
              onChange={(e) => setNewProjName(e.target.value)} 
              placeholder="e.g. DSDA Jakarta" 
            />
          </FormGroup>
        </div>
      </Dialog>
    </div>
  );
}
