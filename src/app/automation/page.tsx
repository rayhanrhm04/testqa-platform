'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Download,
  FileJson,
  Play,
  Search,
  ShieldAlert,
  TestTube2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { TestCase } from '@/lib/validators';

type CypressResultStatus = 'Pass' | 'Fail' | 'Skipped' | 'Not Matched';

interface CypressCaseResult {
  testCaseId: string;
  testCaseCode: string;
  title: string;
  status: CypressResultStatus;
  durationMs: number;
  errorMessage?: string;
  spec?: string;
}

interface CypressRunReport {
  id: string;
  title: string;
  projectId: string;
  environment: string;
  browser: string;
  command: string;
  selectedCaseIds: string[];
  results: CypressCaseResult[];
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    notMatched: number;
    durationMs: number;
  };
  createdAt: string;
}

interface MochawesomeError {
  message?: string;
  estack?: string;
}

interface MochawesomeTest {
  fullTitle?: string;
  title?: string;
  state?: string;
  duration?: number;
  err?: MochawesomeError;
  file?: string;
}

interface MochawesomeNode {
  tests?: MochawesomeTest[];
  suites?: MochawesomeNode[];
  results?: MochawesomeNode[];
}

const STORAGE_KEY = 'qa_cypress_automation_reports';

const readReports = (): CypressRunReport[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeReports = (reports: CypressRunReport[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
};

const collectMochawesomeTests = (input: unknown): MochawesomeTest[] => {
  const tests: MochawesomeTest[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const current = node as MochawesomeNode;
    if (Array.isArray(current.tests)) {
      tests.push(...current.tests);
    }
    if (Array.isArray(current.suites)) {
      current.suites.forEach(visit);
    }
    if (Array.isArray(current.results)) {
      current.results.forEach(visit);
    }
  };
  visit(input);
  return tests;
};

const normalizeState = (state: string | undefined): CypressResultStatus => {
  const next = (state || '').toLowerCase();
  if (next === 'passed' || next === 'pass') return 'Pass';
  if (next === 'failed' || next === 'fail') return 'Fail';
  if (next === 'pending' || next === 'skipped') return 'Skipped';
  return 'Not Matched';
};

const buildCommand = (specPattern: string, browser: string, environment: string) => {
  const specPart = specPattern.trim() ? ` --spec "${specPattern.trim()}"` : '';
  const browserPart = browser.trim() ? ` --browser ${browser.trim().toLowerCase()}` : '';
  const envPart = environment.trim() ? ` --env qaEnvironment=${environment.trim()}` : '';
  return `npx cypress run${specPart}${browserPart}${envPart}`;
};

export default function AutomationTestingPage() {
  const {
    projects,
    testSuites,
    testCases,
    projectShares,
    logActivity,
  } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [selectedSuiteId, setSelectedSuiteId] = React.useState('all');
  const [runTitle, setRunTitle] = React.useState('');
  const [environment, setEnvironment] = React.useState('Staging');
  const [browser, setBrowser] = React.useState('Chrome');
  const [specPattern, setSpecPattern] = React.useState('cypress/e2e/**/*.cy.ts');
  const [notes, setNotes] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedCaseIds, setSelectedCaseIds] = React.useState<string[]>([]);
  const [reportJson, setReportJson] = React.useState('');
  const [reports, setReports] = React.useState<CypressRunReport[]>(() => readReports());

  const accessibleProjects = React.useMemo(() => {
    if (!currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer') return projects;
    return projects.filter((project) => {
      const shares = projectShares.filter((share) => share.project_id === project.id);
      if (shares.length === 0) return true;
      return shares.some((share) => share.user_id === currentUser.id);
    });
  }, [activeRole, currentUser, projectShares, projects]);

  const currentProjectId = selectedProjectId || accessibleProjects[0]?.id || '';

  const projectSuites = React.useMemo(() => {
    return testSuites.filter((suite) => suite.project_id === currentProjectId);
  }, [currentProjectId, testSuites]);

  const projectCases = React.useMemo(() => {
    return testCases.filter((testCase) => {
      if (testCase.project_id !== currentProjectId) return false;
      if (selectedSuiteId !== 'all' && testCase.suite_id !== selectedSuiteId) return false;
      const keyword = search.toLowerCase();
      return testCase.code.toLowerCase().includes(keyword) || testCase.title.toLowerCase().includes(keyword);
    });
  }, [currentProjectId, search, selectedSuiteId, testCases]);

  const selectedCases = React.useMemo(() => {
    return testCases.filter((testCase) => selectedCaseIds.includes(testCase.id));
  }, [selectedCaseIds, testCases]);

  const latestReport = reports[0];
  const command = buildCommand(specPattern, browser, environment);

  const toggleCase = (id: string) => {
    setSelectedCaseIds((current) => (
      current.includes(id) ? current.filter((caseId) => caseId !== id) : [...current, id]
    ));
  };

  const selectVisibleCases = () => {
    const visibleIds = projectCases.map((testCase) => testCase.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCaseIds.includes(id));
    setSelectedCaseIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const parseReport = () => {
    if (selectedCases.length === 0) {
      addToast('Please select test cases first.', 'warning');
      return;
    }
    if (!runTitle.trim()) {
      addToast('Run title is required.', 'warning');
      return;
    }

    let rawTests: MochawesomeTest[] = [];
    if (reportJson.trim()) {
      try {
        rawTests = collectMochawesomeTests(JSON.parse(reportJson) as unknown);
      } catch {
        addToast('Invalid Cypress/Mochawesome JSON.', 'error');
        return;
      }
    }

    const results = selectedCases.map((testCase) => {
      const matched = rawTests.find((test) => {
        const fullTitle = [test.fullTitle, test.title].filter(Boolean).join(' ');
        return fullTitle.includes(testCase.code);
      });

      const status = matched ? normalizeState(matched.state) : 'Not Matched';
      return {
        testCaseId: testCase.id,
        testCaseCode: testCase.code,
        title: testCase.title,
        status,
        durationMs: Number(matched?.duration || 0),
        errorMessage: matched?.err?.message || matched?.err?.estack || undefined,
        spec: matched?.file || undefined,
      };
    });

    const totals = {
      total: results.length,
      passed: results.filter((result) => result.status === 'Pass').length,
      failed: results.filter((result) => result.status === 'Fail').length,
      skipped: results.filter((result) => result.status === 'Skipped').length,
      notMatched: results.filter((result) => result.status === 'Not Matched').length,
      durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
    };

    const nextReport: CypressRunReport = {
      id: `cy-${Date.now()}`,
      title: runTitle.trim(),
      projectId: currentProjectId,
      environment,
      browser,
      command,
      selectedCaseIds,
      results,
      totals,
      createdAt: new Date().toISOString(),
    };

    const nextReports = [nextReport, ...reports].slice(0, 20);
    setReports(nextReports);
    writeReports(nextReports);
    if (currentUser) {
      logActivity(currentUser.id, `Created Cypress automation report: ${nextReport.title}`, notes);
    }
    addToast('Cypress automation report generated.', 'success');
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setReportJson(text);
    addToast('Cypress report loaded. Generate the report when ready.', 'info');
  };

  const exportLatestReport = () => {
    if (!latestReport) return;
    const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${latestReport.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cypress-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const canManage = activeRole === 'Admin' || activeRole === 'QA Engineer';

  if (!canManage) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="mb-2 h-10 w-10 text-amber-500" />
        <h3 className="text-base font-bold text-foreground">Access Denied</h3>
        <p className="mt-1 text-xs text-muted-foreground">Only QA Engineer and Admin roles can manage Cypress automation runs.</p>
        <Link href="/test-runs" className="mt-4">
          <Button variant="outline" size="sm">Back to Test Runs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <TestTube2 className="h-6 w-6 text-primary" />
            Automation Testing
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Prepare Cypress runs, choose test cases first, and import results into a report.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={exportLatestReport} disabled={!latestReport}>
            <Download className="mr-1.5 h-4 w-4" />
            Export Report
          </Button>
          <Link href="/test-runs/create">
            <Button type="button" variant="secondary">
              <Play className="mr-1.5 h-4 w-4" />
              Manual Runner
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Run Setup</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">This prepares a Cypress command and report scope; it does not execute code on the production server.</p>
              </div>
              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-600">Staging Safe</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormGroup label="Project">
                <Select
                  value={currentProjectId}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value);
                    setSelectedSuiteId('all');
                    setSelectedCaseIds([]);
                  }}
                >
                  {accessibleProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Run Title">
                <Input value={runTitle} onChange={(event) => setRunTitle(event.target.value)} placeholder="e.g. Cypress Smoke Run v2.56.03" />
              </FormGroup>
              <FormGroup label="Environment">
                <Select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                  <option value="Staging">Staging</option>
                  <option value="Preview">Preview</option>
                  <option value="Production Smoke">Production Smoke</option>
                  <option value="Local">Local</option>
                </Select>
              </FormGroup>
              <FormGroup label="Browser">
                <Select value={browser} onChange={(event) => setBrowser(event.target.value)}>
                  <option value="Chrome">Chrome</option>
                  <option value="Edge">Edge</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Electron">Electron</option>
                </Select>
              </FormGroup>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
              <FormGroup label="Spec Pattern">
                <Input value={specPattern} onChange={(event) => setSpecPattern(event.target.value)} placeholder="cypress/e2e/**/*.cy.ts" />
              </FormGroup>
              <FormGroup label="Notes">
                <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope, branch, preview URL, or build number" />
              </FormGroup>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-1 text-[10px] font-black uppercase text-muted-foreground">Generated Cypress Command</div>
              <code className="block overflow-x-auto whitespace-nowrap text-xs font-semibold text-foreground">{command}</code>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">Choose Test Cases</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Pick exactly which test cases should be covered by this Cypress run.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={selectVisibleCases}>
                  <ChevronDown className="mr-1.5 h-4 w-4" />
                  Toggle Visible
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                <Select value={selectedSuiteId} onChange={(event) => setSelectedSuiteId(event.target.value)}>
                  <option value="all">All Suites</option>
                  {projectSuites.map((suite) => (
                    <option key={suite.id} value={suite.id}>{suite.name}</option>
                  ))}
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by code or title" />
                </div>
              </div>
            </div>

            <div className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
              {projectCases.length > 0 ? (
                projectCases.map((testCase) => {
                  const checked = selectedCaseIds.includes(testCase.id);
                  const suite = testSuites.find((item) => item.id === testCase.suite_id);
                  return (
                    <label key={testCase.id} className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-muted/20">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCase(testCase.id)}
                        className="mt-1 h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-black text-primary">{testCase.code}</span>
                          <span className="text-sm font-bold text-foreground">{testCase.title}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{testCase.objective || testCase.description || 'No test objective recorded.'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <span className="rounded border border-border bg-muted/40 px-2 py-0.5">{suite?.name || 'No suite'}</span>
                          {testCase.tags.map((tag) => (
                            <span key={tag} className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary">{tag}</span>
                          ))}
                          {testCase.automation_link && <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-600">Automated</span>}
                        </div>
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">No test cases found for this filter.</div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold text-foreground">Selected Scope</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-2xl font-black text-foreground">{selectedCaseIds.length}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Selected</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-2xl font-black text-foreground">{selectedCases.filter((testCase) => testCase.automation_link).length}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Automated</div>
              </div>
            </div>
            <div className="mt-4 max-h-[180px] space-y-2 overflow-y-auto">
              {selectedCases.length > 0 ? selectedCases.map((testCase: TestCase) => (
                <div key={testCase.id} className="rounded-lg border border-border p-2">
                  <div className="font-mono text-[10px] font-black text-primary">{testCase.code}</div>
                  <div className="truncate text-xs font-bold text-foreground">{testCase.title}</div>
                </div>
              )) : (
                <p className="py-6 text-center text-xs text-muted-foreground">Choose test cases to build the run scope.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Import Cypress Result</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Paste or upload Mochawesome JSON. Test titles should include test case codes like [TC-001].</p>
              </div>
              <FileJson className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-xs font-bold text-muted-foreground hover:bg-muted/30">
                <Upload className="h-4 w-4" />
                Upload JSON
                <input type="file" accept=".json,application/json" className="hidden" onChange={(event) => handleFileUpload(event.target.files?.[0] || null)} />
              </label>
              <Textarea
                value={reportJson}
                onChange={(event) => setReportJson(event.target.value)}
                rows={8}
                placeholder='Paste mochawesome.json here. Leave empty to create a planned run report.'
              />
              <Button type="button" className="w-full" onClick={parseReport} disabled={selectedCaseIds.length === 0}>
                <Play className="mr-1.5 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-bold text-foreground">Latest Report</h2>
            {latestReport ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-sm font-bold text-foreground">{latestReport.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{new Date(latestReport.createdAt).toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Passed" value={latestReport.totals.passed} tone="pass" />
                  <Metric label="Failed" value={latestReport.totals.failed} tone="fail" />
                  <Metric label="Skipped" value={latestReport.totals.skipped} tone="skip" />
                  <Metric label="Not Matched" value={latestReport.totals.notMatched} tone="neutral" />
                </div>
                <div className="max-h-[260px] space-y-2 overflow-y-auto">
                  {latestReport.results.map((result) => (
                    <div key={result.testCaseId} className="rounded-lg border border-border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-black text-primary">{result.testCaseCode}</span>
                        <StatusBadge status={result.status} />
                      </div>
                      <div className="mt-1 truncate text-xs font-bold text-foreground">{result.title}</div>
                      {result.errorMessage && <p className="mt-1 line-clamp-2 text-[10px] text-red-500">{result.errorMessage}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-border bg-muted/20 p-5 text-center text-xs text-muted-foreground">No Cypress report generated yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'pass' | 'fail' | 'skip' | 'neutral' }) {
  const toneClass = {
    pass: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    fail: 'text-red-600 bg-red-500/10 border-red-500/20',
    skip: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    neutral: 'text-muted-foreground bg-muted/20 border-border',
  }[tone];

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-xl font-black">{value}</div>
      <div className="text-[10px] font-black uppercase">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: CypressResultStatus }) {
  if (status === 'Pass') {
    return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-600"><CheckCircle className="h-3 w-3" />Pass</span>;
  }
  if (status === 'Fail') {
    return <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-600"><XCircle className="h-3 w-3" />Fail</span>;
  }
  if (status === 'Skipped') {
    return <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-600"><AlertTriangle className="h-3 w-3" />Skipped</span>;
  }
  return <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-black text-muted-foreground">Not Matched</span>;
}
