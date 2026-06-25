'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  PlayCircle, ShieldAlert, Plus, Calendar, Activity, CheckCircle, 
  Flame, Trash2, BarChart4, RefreshCw, FileText, CheckCircle2, 
  XCircle, AlertTriangle, HelpCircle, User, Printer 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';

export default function TestRunsPage() {
  const router = useRouter();
  const { testRuns, releases, testRunResults, testCases, projects, projectShares, deleteTestRun, resetTestRun, users } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [reportingRun, setReportingRun] = React.useState<any | null>(null);

  const canCreate = !currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer';
  const canDelete = !currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer';

  const canResetRun = React.useCallback((run: any) => {
    if (!currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    
    // Find all cases inside this run
    const runResultsForRun = testRunResults.filter(r => r.test_run_id === run.id);
    const runCasesForRun = testCases.filter(tc => runResultsForRun.some(r => r.test_case_id === tc.id));
    const projectsInRun = new Set(runCasesForRun.map(c => c.project_id));
    if (projectsInRun.size === 0) return false;
    
    const canModifyProject = (projId: string) => {
      const shares = projectShares.filter(s => s.project_id === projId);
      if (shares.length === 0) return activeRole === 'Developer';
      const userShare = shares.find(s => s.user_id === currentUser?.id);
      return userShare?.role === 'Editor';
    };
    
    return Array.from(projectsInRun).every(projId => canModifyProject(projId));
  }, [currentUser, activeRole, testRunResults, testCases, projectShares]);

  const handleResetRun = async (run: any) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!canResetRun(run)) {
      addToast('Permissions denied. You must be an Editor on all projects in this run to reset it.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to reset the test run "${run.title}"? This will clear all execution results and revert its status to Draft.`)) {
      try {
        await resetTestRun(run.id);
        addToast(`Test run "${run.title}" reset successfully.`, 'success');
      } catch (err: any) {
        addToast(err.message || 'Failed to reset test run.', 'error');
      }
    }
  };

  const selectedRunData = React.useMemo(() => {
    if (!reportingRun) return null;
    const run = testRuns.find(r => r.id === reportingRun.id);
    if (!run) return null;
    
    const runResults = testRunResults.filter(r => r.test_run_id === run.id);
    const runCases = testCases.filter(tc => runResults.some(r => r.test_case_id === tc.id));
    
    const total = runCases.length;
    const passed = runResults.filter(r => r.result === 'Pass').length;
    const failed = runResults.filter(r => r.result === 'Fail').length;
    const blocked = runResults.filter(r => r.result === 'Blocked').length;
    const notRun = runResults.filter(r => r.result === 'Not Run' || !r.result).length;
    const rate = total > 0 ? Math.round(((total - notRun) / total) * 100) : 0;
    
    return {
      run,
      runResults,
      runCases,
      total,
      passed,
      failed,
      blocked,
      notRun,
      rate
    };
  }, [reportingRun, testRuns, testRunResults, testCases]);

  const handleDelete = async (id: string, title: string) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (confirm(`Are you sure you want to delete test run "${title}"?`)) {
      try {
        await deleteTestRun(id);
        addToast(`Test run "${title}" deleted successfully.`, 'success');
      } catch (err: any) {
        addToast(err.message || 'Failed to delete test run.', 'error');
      }
    }
  };

  const handleExportPDF = React.useCallback((data: any) => {
    if (!data) return;
    const { run, runResults, runCases, total, passed, failed, blocked, notRun, rate } = data;
    const releaseVersion = releases.find(r => r.id === run.release_id)?.version || 'Backlog';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Popups blocked! Please allow popups to export the PDF.', 'error');
      return;
    }

    const escapeHtml = (str: string) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const passedPercent = total > 0 ? (passed / total) * 100 : 0;
    const failedPercent = total > 0 ? (failed / total) * 100 : 0;
    const blockedPercent = total > 0 ? (blocked / total) * 100 : 0;
    const notRunPercent = total > 0 ? (notRun / total) * 100 : 0;

    const rowsHtml = runCases.map((tc: any) => {
      const res = runResults.find((r: any) => r.test_case_id === tc.id);
      const resultLabel = res?.result || 'Not Run';
      const execUser = res?.executed_by ? users.find(u => u.id === res.executed_by) : null;
      const executedByName = res?.result && res.result !== 'Not Run' ? (execUser ? execUser.name : 'Unknown QA') : '—';
      const notes = res?.actual_result || res?.notes || 'No output log';
      const isCustomNotes = !!(res?.actual_result || res?.notes);
      const notesClass = isCustomNotes ? 'notes' : 'notes-empty';
      
      let badgeClass = 'badge-notrun';
      if (res?.result === 'Pass') badgeClass = 'badge-pass';
      else if (res?.result === 'Fail') badgeClass = 'badge-fail';
      else if (res?.result === 'Blocked') badgeClass = 'badge-blocked';

      return `
        <tr>
          <td class="case-code">${escapeHtml(tc.code)}</td>
          <td class="case-title">${escapeHtml(tc.title)}</td>
          <td><span class="badge ${badgeClass}">${resultLabel}</span></td>
          <td><div class="executor">${escapeHtml(executedByName)}</div></td>
          <td class="${notesClass}">${escapeHtml(notes)}</td>
        </tr>
      `;
    }).join('');

    let statusBadgeClass = 'status-draft';
    if (run.status === 'Completed') statusBadgeClass = 'status-completed';
    else if (run.status === 'In Progress') statusBadgeClass = 'status-inprogress';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Run Report - ${escapeHtml(run.title)}</title>
          <style>
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #09090b;
              background-color: #ffffff;
              margin: 0;
              padding: 40px;
              font-size: 11px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 1px solid #e4e4e7;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title-section {
              flex: 1;
            }
            .report-type {
              font-size: 9px;
              font-weight: 800;
              color: #71717a;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              margin: 0 0 6px 0;
              color: #09090b;
            }
            .version {
              font-size: 11px;
              color: #71717a;
              margin: 0;
            }
            .version strong {
              color: #27272a;
            }
            .status-badge {
              font-size: 9px;
              font-weight: 700;
              padding: 3px 10px;
              border-radius: 9999px;
              border: 1px solid #e4e4e7;
              display: inline-block;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .status-completed {
              background-color: #ecfdf5 !important;
              color: #059669 !important;
              border-color: #a7f3d0 !important;
            }
            .status-inprogress {
              background-color: #fffbeb !important;
              color: #d97706 !important;
              border-color: #fde68a !important;
            }
            .status-draft {
              background-color: #f4f4f5 !important;
              color: #71717a !important;
              border-color: #e4e4e7 !important;
            }
            
            .description-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 24px;
            }
            .description-title {
              font-size: 8px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .description-text {
              margin: 0;
              font-size: 11px;
              color: #334155;
              line-height: 1.6;
            }

            .metrics {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 24px;
            }
            .metric-card {
              border: 1px solid #e4e4e7;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              background-color: #ffffff;
            }
            .metric-card.passed {
              background-color: #f0fdf4 !important;
              border-color: #bbf7d0 !important;
            }
            .metric-card.failed {
              background-color: #fef2f2 !important;
              border-color: #fecaca !important;
            }
            .metric-card.blocked {
              background-color: #fffbeb !important;
              border-color: #fef3c7 !important;
            }
            .metric-card.notrun {
              background-color: #f4f4f5 !important;
              border-color: #e4e4e7 !important;
            }
            .metric-label {
              font-size: 8px;
              font-weight: 700;
              color: #71717a;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .metric-value {
              font-size: 22px;
              font-weight: 900;
              margin: 4px 0 0 0;
              color: #09090b;
            }
            .metric-card.passed .metric-label, .metric-card.passed .metric-value { color: #15803d !important; }
            .metric-card.failed .metric-label, .metric-card.failed .metric-value { color: #b91c1c !important; }
            .metric-card.blocked .metric-label, .metric-card.blocked .metric-value { color: #b45309 !important; }
            .metric-card.notrun .metric-label, .metric-card.notrun .metric-value { color: #52525b !important; }
            
            .progress-section {
              margin-bottom: 28px;
            }
            .progress-header {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              font-weight: 800;
              color: #71717a;
              margin-bottom: 6px;
              letter-spacing: 0.05em;
            }
            .progress-bar-container {
              height: 10px;
              background-color: #f4f4f5;
              border-radius: 9999px;
              overflow: hidden;
              display: flex;
              border: 1px solid #e4e4e7;
            }
            .progress-segment {
              height: 100%;
            }
            .segment-passed { background-color: #22c55e !important; }
            .segment-failed { background-color: #ef4444 !important; }
            .segment-blocked { background-color: #f59e0b !important; }
            .segment-notrun { background-color: #d4d4d8 !important; }
            
            .table-section {
              margin-top: 24px;
            }
            .section-title {
              font-size: 9px;
              font-weight: 800;
              color: #09090b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 10px;
              border-bottom: 1px solid #09090b;
              padding-bottom: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
            }
            th {
              background-color: #f4f4f5 !important;
              color: #52525b;
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 8px 10px;
              border-bottom: 1px solid #d4d4d8;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #e4e4e7;
              vertical-align: middle;
            }
            .case-code {
              font-family: monospace;
              font-weight: 700;
              color: #09090b;
              width: 100px;
            }
            .case-title {
              font-weight: 600;
              color: #18181b;
            }
            .badge {
              font-size: 8px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 9999px;
              border: 1px solid transparent;
              display: inline-block;
              text-align: center;
              white-space: nowrap;
            }
            .badge-pass {
              background-color: #d1fae5 !important;
              color: #065f46 !important;
              border-color: #a7f3d0 !important;
            }
            .badge-fail {
              background-color: #fee2e2 !important;
              color: #991b1b !important;
              border-color: #fecaca !important;
            }
            .badge-blocked {
              background-color: #fef3c7 !important;
              color: #92400e !important;
              border-color: #fde68a !important;
            }
            .badge-notrun {
              background-color: #f4f4f5 !important;
              color: #3f3f46 !important;
              border-color: #e4e4e7 !important;
            }
            .executor {
              color: #52525b;
            }
            .notes {
              color: #52525b;
            }
            .notes-empty {
              color: #a1a1aa;
              font-style: italic;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <div class="report-type">Test Run Execution Report</div>
              <h1 class="title">${escapeHtml(run.title)}</h1>
              <p class="version">Release Version: <strong>${escapeHtml(releaseVersion)}</strong></p>
            </div>
            <div>
              <span class="status-badge ${statusBadgeClass}">${escapeHtml(run.status)}</span>
            </div>
          </div>

          ${run.description ? `
            <div class="description-box">
              <div class="description-title">Campaign Description</div>
              <p class="description-text">${escapeHtml(run.description)}</p>
            </div>
          ` : ''}

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-label">Total Cases</div>
              <div class="metric-value">${total}</div>
            </div>
            <div class="metric-card passed">
              <div class="metric-label">Passed</div>
              <div class="metric-value">${passed}</div>
            </div>
            <div class="metric-card failed">
              <div class="metric-label">Failed</div>
              <div class="metric-value">${failed}</div>
            </div>
            <div class="metric-card blocked">
              <div class="metric-label">Blocked</div>
              <div class="metric-value">${blocked}</div>
            </div>
            <div class="metric-card notrun">
              <div class="metric-label">Not Run</div>
              <div class="metric-value">${notRun}</div>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>EXECUTION RATE</span>
              <span>${rate}%</span>
            </div>
            <div class="progress-bar-container">
              ${passedPercent > 0 ? `<div class="progress-segment segment-passed" style="width: ${passedPercent}%"></div>` : ''}
              ${failedPercent > 0 ? `<div class="progress-segment segment-failed" style="width: ${failedPercent}%"></div>` : ''}
              ${blockedPercent > 0 ? `<div class="progress-segment segment-blocked" style="width: ${blockedPercent}%"></div>` : ''}
              ${notRunPercent > 0 ? `<div class="progress-segment segment-notrun" style="width: ${notRunPercent}%"></div>` : ''}
            </div>
          </div>

          <div class="table-section">
            <div class="section-title">Test Cases Execution Logs</div>
            <table>
              <thead>
                <tr>
                  <th>Case Code</th>
                  <th>Case Title</th>
                  <th>Result</th>
                  <th>Executed By</th>
                  <th>Execution Notes / Output</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <script>
            setTimeout(function() {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [releases, users, addToast]);

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

  // Calculate stats for each run, filtered by accessible projects
  const runsStats = React.useMemo(() => {
    return testRuns
      .map((run) => {
        const rel = releases.find((r) => r.id === run.release_id);
        
        // Get all results for this run that belong to accessible projects
        const runResults = testRunResults.filter((r) => {
          if (r.test_run_id !== run.id) return false;
          const tc = testCases.find(c => c.id === r.test_case_id);
          return tc && accessibleProjectIds.includes(tc.project_id);
        });

        const total = runResults.length;
        const passed = runResults.filter((r) => r.result === 'Pass').length;
        const failed = runResults.filter((r) => r.result === 'Fail').length;
        const blocked = runResults.filter((r) => r.result === 'Blocked').length;
        const completed = runResults.filter((r) => r.result !== 'Not Run').length;

        const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          ...run,
          releaseVersion: rel ? rel.version : 'Backlog',
          total,
          passed,
          failed,
          blocked,
          completed,
          progressPercent,
        };
      })
      // Only show runs that have test cases in accessible projects
      .filter((run) => run.total > 0);
  }, [testRuns, releases, testRunResults, testCases, accessibleProjectIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Test Runs</h1>
          <p className="text-sm text-muted-foreground">Initiate validation campaigns, log run failures, and review launch results.</p>
        </div>
        <div>
          {canCreate ? (
            <Button 
              onClick={() => {
                if (!currentUser) {
                  router.push('/login');
                  return;
                }
                router.push('/test-runs/create');
              }} 
              className="cursor-pointer font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Run
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Initiation locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Runs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {runsStats.length > 0 ? (
          runsStats.map((run) => {
            return (
              <div 
                key={run.id}
                className="bg-card rounded-xl border border-border p-5 hover:border-primary/20 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      run.status === 'Completed' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : run.status === 'In Progress' 
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                        : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                    }`}>
                      {run.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-primary" /> {run.test_type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground truncate">{run.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {run.description || 'No campaign notes logged.'}
                  </p>

                  {/* Progress bar info */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                      <span>Progress ({run.completed}/{run.total} cases)</span>
                      <span>{run.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${run.total > 0 ? (run.passed / run.total) * 100 : 0}%` }} title={`${run.passed} Passed`} />
                      <div className="h-full bg-red-500 transition-all" style={{ width: `${run.total > 0 ? (run.failed / run.total) * 100 : 0}%` }} title={`${run.failed} Failed`} />
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${run.total > 0 ? (run.blocked / run.total) * 100 : 0}%` }} title={`${run.blocked} Blocked`} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> 
                    {new Date(run.created_at).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 rounded-md cursor-pointer hover:bg-red-500/5 transition-all"
                        onClick={() => handleDelete(run.id, run.title)}
                        title="Delete test run"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold cursor-pointer border-border hover:bg-muted"
                      onClick={() => {
                        setReportingRun(run);
                        setIsReportOpen(true);
                      }}
                      title="View execution report"
                    >
                      <BarChart4 className="h-3.5 w-3.5 mr-1" />
                      Report
                    </Button>
                    <Link href={`/test-runs/${run.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold cursor-pointer">
                        <PlayCircle className="h-3.5 w-3.5 mr-1" />
                        {run.status === 'Completed' ? 'View Results' : 'Execute Run'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <PlayCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="font-semibold text-foreground/80">No active test runs</p>
            <p className="text-xs mt-1">Schedules are empty. Initiate a validation run for a target release.</p>
          </div>
        )}
      </div>

      <Dialog
        isOpen={isReportOpen}
        onClose={() => { setIsReportOpen(false); setReportingRun(null); }}
        title="Test Run Execution Report"
        size="xl"
      >
        {selectedRunData ? (
          <div className="space-y-6 text-left">
            {/* Header info */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">{selectedRunData.run.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Release Version: <strong className="text-foreground/80">{releases.find(r => r.id === selectedRunData.run.release_id)?.version || 'Backlog'}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedRunData.run.status === 'Completed' 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : selectedRunData.run.status === 'In Progress'
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                }`}>
                  {selectedRunData.run.status}
                </span>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] font-semibold text-foreground border-border hover:bg-muted cursor-pointer flex items-center gap-1"
                  onClick={() => handleExportPDF(selectedRunData)}
                >
                  <Printer className="h-3 w-3" />
                  Export PDF
                </Button>
                
                {canResetRun(selectedRunData.run) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] font-semibold text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/5 cursor-pointer flex items-center gap-1"
                    onClick={() => handleResetRun(selectedRunData.run)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset Run
                  </Button>
                )}
              </div>
            </div>

            {/* Campaign notes */}
            {selectedRunData.run.description && (
              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Campaign Description</span>
                <p className="text-xs text-foreground mt-1 leading-relaxed">{selectedRunData.run.description}</p>
              </div>
            )}

            {/* Metrics overview */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Total Cases</span>
                <p className="text-lg font-black text-foreground mt-1">{selectedRunData.total}</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-emerald-500 uppercase">Passed</span>
                <p className="text-lg font-black text-emerald-500 mt-1">{selectedRunData.passed}</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-red-500 uppercase">Failed</span>
                <p className="text-lg font-black text-red-500 mt-1">{selectedRunData.failed}</p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-amber-500 uppercase">Blocked</span>
                <p className="text-lg font-black text-amber-500 mt-1">{selectedRunData.blocked}</p>
              </div>
              <div className="bg-zinc-500/5 border border-zinc-500/10 rounded-xl p-3 text-center">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">Not Run</span>
                <p className="text-lg font-black text-zinc-500 mt-1">{selectedRunData.notRun}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                <span>EXECUTION RATE</span>
                <span>{selectedRunData.rate}%</span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex border border-border/50">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${selectedRunData.total > 0 ? (selectedRunData.passed / selectedRunData.total) * 100 : 0}%` }} title={`${selectedRunData.passed} Passed`} />
                <div className="h-full bg-red-500 transition-all" style={{ width: `${selectedRunData.total > 0 ? (selectedRunData.failed / selectedRunData.total) * 100 : 0}%` }} title={`${selectedRunData.failed} Failed`} />
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${selectedRunData.total > 0 ? (selectedRunData.blocked / selectedRunData.total) * 100 : 0}%` }} title={`${selectedRunData.blocked} Blocked`} />
                <div className="h-full bg-zinc-500/20 transition-all flex-1" title={`${selectedRunData.notRun} Not Run`} />
              </div>
            </div>

            {/* Case List Details */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Test Cases execution logs</h4>
              <div className="rounded-xl border border-border bg-card overflow-hidden max-h-[35vh] overflow-auto">
                <table className="w-full border-collapse text-left text-xs min-w-[750px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground text-[10px] uppercase">
                      <th className="p-3">Case Code</th>
                      <th className="p-3">Case Title</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">Executed By</th>
                      <th className="p-3">Execution Notes / Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {selectedRunData.runCases.map((tc) => {
                      const res = selectedRunData.runResults.find(r => r.test_case_id === tc.id);
                      const execUser = res?.executed_by ? users.find(u => u.id === res.executed_by) : null;
                      return (
                        <tr key={tc.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary">{tc.code}</td>
                          <td className="p-3 font-semibold text-foreground">{tc.title}</td>
                          <td className="p-3">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              res?.result === 'Pass' 
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : res?.result === 'Fail'
                                ? 'bg-red-500/15 text-red-500 border-red-500/30'
                                : res?.result === 'Blocked'
                                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30'
                            }`}>
                              {res?.result || 'Not Run'}
                            </span>
                          </td>
                          <td className="p-3">
                            {res?.result && res.result !== 'Not Run' ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar user={execUser} className="h-5 w-5 bg-primary/10 text-primary font-bold text-[8px]" fallbackChar="U" />
                                <span className="text-muted-foreground">{execUser ? execUser.name : 'Unknown QA'}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 italic">—</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-xs truncate" title={res?.actual_result || res?.notes || ''}>
                            {res?.actual_result || res?.notes || <span className="text-muted-foreground/30 italic">No output log</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading report details...</div>
        )}
      </Dialog>
    </div>
  );
}
