'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { parseSteps } from '@/lib/validators';
import { 
  ChevronLeft, CheckCircle2, XCircle, AlertTriangle, HelpCircle, 
  BookOpen, Play, Check, RefreshCw, Terminal, Calendar, UserCheck, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, FormGroup } from '@/components/ui/input';
import Link from 'next/link';

export default function TestRunExecutionPage() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { testRuns, testCases, testRunResults, updateTestRunResult, updateTestRunStatus, logActivity, projects, projectShares, resetTestRun } = useDataStore();
  const { currentUser, activeRole, mockUsers } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeCaseId, setActiveCaseId] = React.useState<string | null>(null);
  
  // Execution details inputs
  const [actualResult, setActualResult] = React.useState('');
  const [executionNotes, setExecutionNotes] = React.useState('');

  const runId = pathname.split('/').pop();
  
  const run = React.useMemo(() => {
    return testRuns.find((r) => r.id === runId);
  }, [testRuns, runId]);

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

  const accessibleProjectIds = React.useMemo(() => accessibleProjects.map(p => p.id), [accessibleProjects]);

  const hasAccess = React.useMemo(() => {
    if (!run) return false;
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    
    // Check if the run has any cases in accessible projects.
    const runTotalCases = testCases.filter((tc) => 
      testRunResults.some((r) => r.test_run_id === runId && r.test_case_id === tc.id)
    );
    if (runTotalCases.length === 0) return true;
    
    return runTotalCases.some(tc => accessibleProjectIds.includes(tc.project_id));
  }, [run, runId, testCases, testRunResults, accessibleProjectIds, activeRole]);

  const runResults = React.useMemo(() => {
    return testRunResults.filter((r) => {
      if (r.test_run_id !== runId) return false;
      const tc = testCases.find(c => c.id === r.test_case_id);
      return tc && accessibleProjectIds.includes(tc.project_id);
    });
  }, [testRunResults, runId, testCases, accessibleProjectIds]);

  const runCases = React.useMemo(() => {
    return testCases.filter((tc) => 
      accessibleProjectIds.includes(tc.project_id) && 
      runResults.some((r) => r.test_case_id === tc.id)
    );
  }, [testCases, runResults, accessibleProjectIds]);

  // Set first case active initially
  React.useEffect(() => {
    if (runCases.length > 0 && !activeCaseId) {
      setActiveCaseId(runCases[0].id);
    }
  }, [runCases, activeCaseId]);

  const activeCase = React.useMemo(() => {
    return runCases.find((c) => c.id === activeCaseId);
  }, [runCases, activeCaseId]);

  const activeResult = React.useMemo(() => {
    return runResults.find((r) => r.test_case_id === activeCaseId);
  }, [runResults, activeCaseId]);

  // Sync inputs on active case change
  React.useEffect(() => {
    if (activeResult) {
      setActualResult(activeResult.actual_result || '');
      setExecutionNotes(activeResult.notes || '');
    } else {
      setActualResult('');
      setExecutionNotes('');
    }
  }, [activeCaseId, activeResult]);

  if (!run || !hasAccess) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-2" />
        <h3 className="text-base font-bold text-foreground">Access Denied</h3>
        <p className="text-xs text-muted-foreground mt-1">You do not have access to the projects in this test run.</p>
        <Link href="/test-runs" className="mt-4">
          <Button variant="outline" size="sm">Back to Test Runs</Button>
        </Link>
      </div>
    );
  }

  // Statistics calculation
  const total = runCases.length;
  const passed = runResults.filter(r => r.result === 'Pass').length;
  const failed = runResults.filter(r => r.result === 'Fail').length;
  const blocked = runResults.filter(r => r.result === 'Blocked').length;
  const executed = runResults.filter(r => r.result !== 'Not Run').length;
  const rate = total > 0 ? Math.round((executed / total) * 100) : 0;

  // Enforce project-level modify permissions
  const canModifyProject = React.useCallback((projId: string) => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === projId);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser?.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, currentUser]);

  const canCompleteRun = React.useMemo(() => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const projectsInRun = new Set(runCases.map(c => c.project_id));
    if (projectsInRun.size === 0) return false;
    return Array.from(projectsInRun).every(projId => canModifyProject(projId));
  }, [activeRole, runCases, canModifyProject]);

  const canExecuteActiveCase = React.useMemo(() => {
    if (!activeCase) return false;
    return canModifyProject(activeCase.project_id);
  }, [activeCase, canModifyProject]);

  // Handle saving result
  const handleLogResult = async (resultType: 'Pass' | 'Fail' | 'Blocked') => {
    if (!activeCaseId || !activeCase) return;
    if (!canModifyProject(activeCase.project_id)) {
      addToast('Permissions denied. You must be an Editor on this project to submit results.', 'error');
      return;
    }

    try {
      // 1. If status was Draft, move run to In Progress
      if (run.status === 'Draft') {
        await updateTestRunStatus(run.id, 'In Progress');
      }

      // 2. Submit test result
      await updateTestRunResult(
        run.id, 
        activeCaseId, 
        resultType, 
        resultType === 'Pass' ? 'Expected outcome matches.' : actualResult, 
        executionNotes,
        currentUser?.id
      );

      addToast(`Logged test case result as ${resultType}`, 'success');

      // 3. Auto advance to the next "Not Run" test case
      const currentIndex = runCases.findIndex(c => c.id === activeCaseId);
      const nextCases = [
        ...runCases.slice(currentIndex + 1),
        ...runCases.slice(0, currentIndex)
      ];
      
      const nextNotRun = nextCases.find(c => {
        const res = runResults.find(r => r.test_case_id === c.id);
        return !res || res.result === 'Not Run';
      });

      if (nextNotRun) {
        setActiveCaseId(nextNotRun.id);
      } else {
        // If all are run, suggest completing the run campaign
        addToast('All test cases executed! Review results and click Complete Run.', 'info');
      }
    } catch (err) {
      addToast('Failed to log test run execution.', 'error');
    }
  };

  const handleCompleteRun = async () => {
    if (!canCompleteRun) {
      addToast('Permissions denied. You must be an Editor on all projects in this run to complete it.', 'error');
      return;
    }
    try {
      await updateTestRunStatus(run.id, 'Completed');
      if (currentUser) {
        await logActivity(currentUser.id, `Completed test run campaign: ${run.title}`);
      }
      addToast('Test run marked as Completed!', 'success');
      router.push('/test-runs');
    } catch (err) {
      addToast('Failed to complete run campaign.', 'error');
    }
  };

  const handleResetRun = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!canCompleteRun) {
      addToast('Permissions denied. You must be an Editor on all projects in this run to reset it.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to reset this test run campaign? This will clear all execution results and revert its status to Draft.`)) {
      try {
        await resetTestRun(run.id);
        addToast('Test run campaign reset successfully.', 'success');
        if (runCases.length > 0) {
          setActiveCaseId(runCases[0].id);
        }
      } catch (err: any) {
        addToast(err.message || 'Failed to reset test run campaign.', 'error');
      }
    }
  };

  // Icon maps for status list
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pass':
        return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />;
      case 'Fail':
        return <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />;
      case 'Blocked':
        return <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
      default:
        return <HelpCircle className="h-4.5 w-4.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div className="space-y-1">
          <Link href="/test-runs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold">
            <ChevronLeft className="h-4 w-4" />
            Back to Test Runs
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            {run.title}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              run.status === 'Completed' 
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' 
                : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
            }`}>
              {run.status}
            </span>
          </h1>
        </div>

        {/* Actions header */}
        <div className="flex gap-2">
          {canCompleteRun && (
            <Button 
              variant="outline" 
              onClick={handleResetRun} 
              className="cursor-pointer font-semibold text-red-500 border-red-500/20 hover:bg-red-500/5 hover:text-red-600"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reset Run
            </Button>
          )}
          {run.status !== 'Completed' && canCompleteRun && (
            <Button onClick={handleCompleteRun} className="cursor-pointer font-semibold bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4 mr-1.5" />
              Complete Run Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Progress metrics widget */}
      <div className="bg-card rounded-xl border border-border p-4 grid gap-4 sm:grid-cols-4 items-center">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Run Completion</span>
          <p className="text-lg font-black mt-0.5">{rate}%</p>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1.5 flex">
            <div className="bg-emerald-500" style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }} />
            <div className="bg-red-500" style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }} />
            <div className="bg-amber-500" style={{ width: `${total > 0 ? (blocked / total) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="flex justify-between sm:justify-start items-center gap-2 border-l border-border/40 pl-4">
          <div className="bg-emerald-500/10 text-emerald-500 rounded-lg p-2"><CheckCircle2 className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Passed</p>
            <p className="text-base font-bold">{passed}</p>
          </div>
        </div>

        <div className="flex justify-between sm:justify-start items-center gap-2 border-l border-border/40 pl-4">
          <div className="bg-red-500/10 text-red-500 rounded-lg p-2"><XCircle className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Failed</p>
            <p className="text-base font-bold">{failed}</p>
          </div>
        </div>

        <div className="flex justify-between sm:justify-start items-center gap-2 border-l border-border/40 pl-4">
          <div className="bg-amber-500/10 text-amber-500 rounded-lg p-2"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Blocked</p>
            <p className="text-base font-bold">{blocked}</p>
          </div>
        </div>
      </div>

      {/* Main split screens */}
      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Left pane checklist */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
            Execution Checklist
          </h3>
          <div className="space-y-1.5">
            {runCases.map((c) => {
              const res = runResults.find(r => r.test_case_id === c.id);
              const isActive = activeCaseId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCaseId(c.id)}
                  className={`w-full text-left flex items-start gap-2.5 p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent'
                  }`}
                >
                  {getStatusIcon(res?.result || 'Not Run')}
                  <div className="min-w-0">
                    <p className="font-bold truncate text-foreground/80">{c.code}</p>
                    <p className="truncate mt-0.5">{c.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right pane execution screen */}
        <div className="md:col-span-3 space-y-6">
          {activeCase ? (
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              {/* Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                    {activeCase.code}
                  </span>
                  <h2 className="text-base font-bold text-foreground mt-2">{activeCase.title}</h2>
                </div>

                <div className="text-right text-[10px] text-muted-foreground">
                  {activeResult?.executed_by && (
                    <p className="font-semibold flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" /> Executed by: {mockUsers.find(u => u.id === activeResult.executed_by)?.name}
                    </p>
                  )}
                  {activeResult?.executed_at && (
                    <p className="mt-0.5">Time: {new Date(activeResult.executed_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* Scope details */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1 bg-muted/25 p-3 rounded-lg border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> Test Objective
                  </span>
                  <p className="mt-1 leading-relaxed">{activeCase.objective || 'No objective logged.'}</p>
                </div>

                <div className="space-y-1 bg-muted/25 p-3 rounded-lg border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Preconditions
                  </span>
                  <p className="mt-1 leading-relaxed">{activeCase.precondition || 'No preconditions.'}</p>
                </div>
              </div>

              {/* Instructions steps */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Steps instructions</span>
                <div className="space-y-2">
                  {(() => {
                    const parsedSteps = parseSteps(activeCase.steps, activeCase.expected_result);
                    return parsedSteps.map((step, idx) => (
                      <div key={idx} className="bg-card border border-border/60 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase border-b border-border/40 pb-1">
                          <span>Step {idx + 1}</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-bold">Action</span>
                            <p className="mt-0.5 leading-relaxed font-medium text-foreground whitespace-pre-wrap">{step.action || 'No action specified'}</p>
                          </div>
                          {step.data && (
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-bold">Data (Test Data)</span>
                              <p className="mt-0.5 leading-relaxed font-mono text-blue-500 whitespace-pre-wrap bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10 w-fit">{step.data}</p>
                            </div>
                          )}
                          {step.expected_result && (
                            <div>
                              <span className="text-[10px] text-emerald-500 block font-bold">Expected Result</span>
                              <p className="mt-0.5 leading-relaxed font-medium text-emerald-500/90 whitespace-pre-wrap">{step.expected_result}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Interactive Execution actions */}
              {run.status !== 'Completed' && canExecuteActiveCase ? (
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Log Result</h3>
                  
                  {/* Notes fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormGroup label="Actual Result (Mandatory on Fail/Blocked)">
                      <Input 
                        value={actualResult} 
                        onChange={(e) => setActualResult(e.target.value)} 
                        placeholder="Expected outcome matches / details on errors..." 
                        className="h-8.5 text-xs"
                      />
                    </FormGroup>
                    <FormGroup label="Notes / Comments">
                      <Input 
                        value={executionNotes} 
                        onChange={(e) => setExecutionNotes(e.target.value)} 
                        placeholder="Tested on Chrome / specific versions..." 
                        className="h-8.5 text-xs"
                      />
                    </FormGroup>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => handleLogResult('Pass')} 
                      className="cursor-pointer font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Mark Pass
                    </Button>
                    <Button 
                      onClick={() => handleLogResult('Fail')} 
                      variant="destructive"
                      className="cursor-pointer font-bold text-xs bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Mark Fail
                    </Button>
                    <Button 
                      onClick={() => handleLogResult('Blocked')} 
                      className="cursor-pointer font-bold text-xs bg-amber-500 text-white hover:bg-amber-600"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1.5" />
                      Mark Blocked
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border pt-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                  <span>
                    {run.status === 'Completed' 
                      ? 'Campaign is Completed. Execution records are locked.' 
                      : 'You do not have Editor permissions for this project to log results.'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              <Play className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2 animate-pulse" />
              <p className="font-semibold text-foreground/80">Select a test case to execute</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
