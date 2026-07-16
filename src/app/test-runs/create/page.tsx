'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { ChevronLeft, Plus, Play, Sparkles, FolderIcon, ShieldAlert, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';

export default function CreateTestRunPage() {
  const router = useRouter();
  const { releases, testCases, projects, projectShares, addTestRun, logActivity } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  if (activeRole !== 'Admin' && activeRole !== 'QA Engineer') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-2" />
        <h3 className="text-base font-bold text-foreground">Access Denied</h3>
        <p className="text-xs text-muted-foreground mt-1">You do not have permission to initiate a test run campaign.</p>
        <Link href="/test-runs" className="mt-4">
          <Button variant="outline" size="sm">Back to Test Runs</Button>
        </Link>
      </div>
    );
  }

  // Filter projects by sharing rules
  const accessibleProjects = React.useMemo(() => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') {
      return projects;
    }
    return projects.filter(p => {
      const shares = projectShares.filter(s => s.project_id === p.id);
      if (shares.length === 0) return true; // public project
      return shares.some(s => s.user_id === currentUser?.id);
    });
  }, [projects, projectShares, activeRole, currentUser]);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  
  // Release target states: 'existing' | 'manual' | 'none'
  const [releaseMode, setReleaseMode] = React.useState<'existing' | 'manual' | 'none'>('existing');
  const [releaseId, setReleaseId] = React.useState('');
  const [manualReleaseName, setManualReleaseName] = React.useState('');

  // Test Case selection states: 'tag' | 'custom'
  const [selectionMode, setSelectionMode] = React.useState<'tag' | 'custom'>('tag');
  const [testType, setTestType] = React.useState('Regression');
  const [selectedCaseIds, setSelectedCaseIds] = React.useState<string[]>([]);
  const [tcSearch, setTcSearch] = React.useState('');

  // Initialize selected project
  React.useEffect(() => {
    if (accessibleProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(accessibleProjects[0].id);
    }
  }, [accessibleProjects, selectedProjectId]);

  // Filter releases of the selected project
  const projectReleases = React.useMemo(() => {
    return releases.filter(r => r.project_id === selectedProjectId);
  }, [releases, selectedProjectId]);

  // Auto-set release when project changes
  React.useEffect(() => {
    if (projectReleases.length > 0) {
      setReleaseId(projectReleases[0].id);
    } else {
      setReleaseId('');
    }
  }, [projectReleases]);

  // Get test cases of the selected project
  const projectTestCases = React.useMemo(() => {
    return testCases.filter(tc => tc.project_id === selectedProjectId);
  }, [testCases, selectedProjectId]);

  // Count tag-matching cases
  const tagMatchingCases = React.useMemo(() => {
    return projectTestCases.filter(tc => tc.tags.includes(testType));
  }, [projectTestCases, testType]);

  // Search filter for custom picker list
  const filteredCustomCases = React.useMemo(() => {
    return projectTestCases.filter(tc => {
      return tc.title.toLowerCase().includes(tcSearch.toLowerCase()) || 
             tc.code.toLowerCase().includes(tcSearch.toLowerCase());
    });
  }, [projectTestCases, tcSearch]);

  const finalCasesCount = selectionMode === 'tag' ? tagMatchingCases.length : selectedCaseIds.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Title is required.', 'warning');
      return;
    }

    if (releaseMode === 'existing' && !releaseId) {
      addToast('Please select a target release.', 'warning');
      return;
    }

    if (releaseMode === 'manual' && !manualReleaseName.trim()) {
      addToast('Manual release name cannot be empty.', 'warning');
      return;
    }

    if (finalCasesCount === 0) {
      addToast('Please select at least 1 test case to run.', 'warning');
      return;
    }

    try {
      const targetReleaseId = releaseMode === 'existing' ? releaseId : null;
      const targetManualRelease = releaseMode === 'manual' ? manualReleaseName : null;
      const targetCaseIds = selectionMode === 'custom' ? selectedCaseIds : tagMatchingCases.map(c => c.id);

      await addTestRun(
        selectedProjectId,
        targetReleaseId,
        targetManualRelease,
        title,
        testType,
        description,
        targetCaseIds
      );

      if (currentUser) {
        await logActivity(currentUser.id, `Created test run campaign: ${title}`);
      }
      addToast('Test run created successfully!', 'success');
      router.push('/test-runs');
    } catch (err) {
      addToast('Failed to create run.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-xl text-left">
      {/* Back button */}
      <div>
        <Link href="/test-runs" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold">
          <ChevronLeft className="h-4 w-4" />
          Back to Test Runs
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Initiate Test Campaign</h2>
          <p className="text-xs text-muted-foreground mt-1">Select a project, define release scopes, and choose test cases.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Select Project context">
              <Select 
                value={selectedProjectId} 
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedCaseIds([]);
                }}
              >
                {accessibleProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Run Title">
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Smoke Run v2.56.02" 
              />
            </FormGroup>
          </div>

          <FormGroup label="Description / Scope Details">
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Provide context on changes to test, device configurations..." 
              rows={2} 
            />
          </FormGroup>

          {/* Release Target options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Release Target</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  releaseMode === 'existing'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => setReleaseMode('existing')}
              >
                Select Release
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  releaseMode === 'manual'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => setReleaseMode('manual')}
              >
                Manual Input
              </button>
              <button
                type="button"
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  releaseMode === 'none'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => setReleaseMode('none')}
              >
                None
              </button>
            </div>

            {releaseMode === 'existing' && (
              <div className="pt-1.5 animate-fadeIn">
                <Select value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
                  <option value="">-- Choose Release --</option>
                  {projectReleases.map(r => (
                    <option key={r.id} value={r.id}>v{r.version} ({r.status})</option>
                  ))}
                </Select>
              </div>
            )}

            {releaseMode === 'manual' && (
              <div className="pt-1.5 animate-fadeIn">
                <Input 
                  value={manualReleaseName} 
                  onChange={(e) => setManualReleaseName(e.target.value)} 
                  placeholder="e.g. v3.1.4-hotfix" 
                />
              </div>
            )}
          </div>

          {/* Test Case Selection Mode options */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase">Test Cases Selection</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode('tag')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    selectionMode === 'tag'
                      ? 'bg-primary/15 text-primary border-primary/20'
                      : 'bg-muted/35 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  By Tag Filter
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('custom')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    selectionMode === 'custom'
                      ? 'bg-primary/15 text-primary border-primary/20'
                      : 'bg-muted/35 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  Choose Custom
                </button>
              </div>
            </div>

            {selectionMode === 'tag' ? (
              <div className="space-y-3 animate-fadeIn">
                <FormGroup label="Select test tag">
                  <Select value={testType} onChange={(e) => setTestType(e.target.value)}>
                    <option value="Smoke">Smoke</option>
                    <option value="Regression">Regression</option>
                    <option value="Functional">Functional</option>
                  </Select>
                </FormGroup>

                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 animate-pulse" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">Matching Test Cases Detected</p>
                    <p className="text-muted-foreground">
                      We indexed <strong className="text-primary">{tagMatchingCases.length} cases</strong> with the tag <strong className="text-foreground">"{testType}"</strong> in this project.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 animate-fadeIn">
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  {/* Search / Selection bar */}
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border-b border-border">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input 
                        type="text"
                        placeholder="Search test cases..."
                        value={tcSearch}
                        onChange={(e) => setTcSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-bold px-2.5 cursor-pointer"
                      onClick={() => {
                        if (selectedCaseIds.length === projectTestCases.length) {
                          setSelectedCaseIds([]);
                        } else {
                          setSelectedCaseIds(projectTestCases.map(tc => tc.id));
                        }
                      }}
                    >
                      {selectedCaseIds.length === projectTestCases.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  {/* Checklist grid list */}
                  <div className="max-h-[180px] overflow-y-auto divide-y divide-border/60">
                    {filteredCustomCases.length > 0 ? (
                      filteredCustomCases.map(tc => {
                        const isChecked = selectedCaseIds.includes(tc.id);
                        return (
                          <label 
                            key={tc.id} 
                            className="flex items-start gap-2.5 p-2.5 hover:bg-muted/10 cursor-pointer transition-colors text-xs select-none"
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedCaseIds(selectedCaseIds.filter(id => id !== tc.id));
                                } else {
                                  setSelectedCaseIds([...selectedCaseIds, tc.id]);
                                }
                              }}
                              className="mt-0.5 rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                            />
                            <div className="space-y-0.5">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-primary">{tc.code}</span>
                                <span>{tc.title}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{tc.description || 'No description'}</p>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No test cases match your search.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">Selected Test Cases Count: </span>
                    <strong className="text-primary">{selectedCaseIds.length}</strong> / <strong>{projectTestCases.length} cases</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Link href="/test-runs">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={finalCasesCount === 0} className="font-semibold cursor-pointer">
              <Play className="h-3.5 w-3.5 mr-1" />
              Launch Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
