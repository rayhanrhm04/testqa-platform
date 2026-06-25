'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Rocket, Calendar, Link2, Settings, User, 
  ChevronRight, AlertCircle, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

function ReleaseNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { releases, projects, users } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  const queryProject = searchParams.get('project') || '';
  const queryVersion = searchParams.get('version') || '';

  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [selectedVersion, setSelectedVersion] = React.useState('');

  // 1. Initialize project selection
  React.useEffect(() => {
    if (projects.length > 0) {
      if (queryProject && projects.some(p => p.id === queryProject)) {
        setSelectedProjectId(queryProject);
      } else {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, queryProject]);

  // 2. Filter releases for the selected project
  const projectReleases = React.useMemo(() => {
    return releases
      .filter(r => r.project_id === selectedProjectId)
      .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
  }, [releases, selectedProjectId]);

  // 3. Initialize version selection
  React.useEffect(() => {
    if (projectReleases.length > 0) {
      if (queryVersion && projectReleases.some(r => r.version === queryVersion)) {
        setSelectedVersion(queryVersion);
      } else {
        setSelectedVersion(projectReleases[0].version);
      }
    } else {
      setSelectedVersion('');
    }
  }, [projectReleases, queryVersion]);

  // 4. Update url query parameters
  const updateUrlParams = (projectId: string, versionStr: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set('project', projectId);
    if (versionStr) params.set('version', versionStr);
    router.push(`/release-notes?${params.toString()}`);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const releasesForProj = releases
      .filter(r => r.project_id === projectId)
      .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
    
    const defaultVer = releasesForProj.length > 0 ? releasesForProj[0].version : '';
    setSelectedVersion(defaultVer);
    updateUrlParams(projectId, defaultVer);
  };

  const handleVersionChange = (versionStr: string) => {
    setSelectedVersion(versionStr);
    updateUrlParams(selectedProjectId, versionStr);
  };

  // 5. Get current selected release details
  const activeRelease = React.useMemo(() => {
    return projectReleases.find(r => r.version === selectedVersion);
  }, [projectReleases, selectedVersion]);

  const activeProject = React.useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Copy shareable link to clipboard
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/release-notes?project=${selectedProjectId}&version=${selectedVersion}`;
    navigator.clipboard.writeText(shareUrl);
    addToast('Shareable link copied to clipboard!', 'success');
  };

  // Check editing permissions
  const canManage = currentUser && (activeRole === 'Admin' || activeRole === 'QA Engineer');

  // Custom Markdown parser to style headings, lists, and spacing
  const renderChangelog = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-5 mb-2.5">
            {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={idx} className="text-sm font-bold text-foreground mt-6 mb-3 border-b border-border pb-1">
            {trimmed.replace(/^##\s*/, '')}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={idx} className="text-base font-extrabold text-foreground mt-7 mb-4">
            {trimmed.replace(/^#\s*/, '')}
          </h2>
        );
      }
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed pl-1 my-1 font-medium">
            <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>{trimmed.replace(/^[*+-]\s*/, '')}</span>
          </div>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs text-foreground/80 my-1 leading-relaxed font-semibold">
          {trimmed}
        </p>
      );
    });
  };

  // Mock release editor metadata details
  const releaseAuthor = 'Rayhan Rahman';

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Header bar actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Release Notes</h1>
          <p className="text-sm text-muted-foreground">Browse changelogs, updates, and feature histories across projects.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/releases')}
              className="cursor-pointer font-semibold text-xs h-9 flex items-center gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage Releases
            </Button>
          )}
          {activeRelease && (
            <Button 
              onClick={handleCopyLink}
              className="cursor-pointer font-semibold text-xs h-9 flex items-center gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy Share Link
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Left selector sidebar */}
        <div className="md:col-span-1 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Project</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full text-xs font-bold bg-card border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary cursor-pointer text-foreground shadow-xs"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
            <div className="bg-muted/40 px-4 py-3 border-b border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Versions</span>
            </div>
            <div className="divide-y divide-border/60 max-h-[50vh] overflow-y-auto">
              {projectReleases.length > 0 ? (
                projectReleases.map((rel) => {
                  const isSelected = rel.version === selectedVersion;
                  return (
                    <button
                      key={rel.id}
                      onClick={() => handleVersionChange(rel.version)}
                      className={`w-full text-left px-4 py-3 text-xs transition-colors flex items-center justify-between font-medium cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f0f2f5] dark:bg-zinc-800 text-foreground font-semibold border-l-2 border-primary' 
                          : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>v{rel.version}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  No versions created
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right main details */}
        <div className="md:col-span-3 bg-card border border-border rounded-xl p-6 md:p-8 min-h-[50vh] shadow-xs relative">
          {activeRelease ? (
            <div className="space-y-6">
              {/* Release version titles */}
              <div className="border-b border-border pb-4 space-y-2">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  Release Notes {activeProject?.name || ''}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[8px]">
                      R
                    </div>
                    <span>{releaseAuthor}</span>
                  </div>
                  <span className="text-border/80">•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Released on {new Date(activeRelease.release_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                  </div>
                </div>
              </div>

              {/* Version pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-bold border border-border">
                <Rocket className="h-3.5 w-3.5 text-primary" />
                <span>v{activeRelease.version}</span>
              </div>

              {/* Changelog text notes */}
              <div className="bg-muted/10 border border-border/40 rounded-xl p-5 md:p-6 space-y-1 font-sans">
                {activeRelease.notes ? (
                  renderChangelog(activeRelease.notes)
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
                    No detailed logs written for this version.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-foreground/80">No release details selected</p>
              <p className="text-xs mt-1">Select a project and version from the sidebar to view detailed notes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReleaseNotesPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Loading notes...</span>
        </div>
      </div>
    }>
      <ReleaseNotesContent />
    </React.Suspense>
  );
}
