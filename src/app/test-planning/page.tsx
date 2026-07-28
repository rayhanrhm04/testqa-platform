'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Filter,
  Layers,
  ListChecks,
  PlayCircle,
  Search,
  ShieldAlert,
  Target,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { Issue, TestCase } from '@/lib/validators';

type ActiveTab = 'coverage' | 'regression';

interface RegressionPack {
  projectId: string;
  name: string;
  caseIds: string[];
  updatedAt: string;
}

const STORAGE_KEY = 'qa_regression_packs_v1';

const csvEscape = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export default function TestPlanningPage() {
  const router = useRouter();
  const {
    projects,
    projectShares,
    testSuites,
    testCases,
    testRuns,
    testRunResults,
    issues,
    releases,
    addTestRun
  } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('coverage');
  const [activeProject, setActiveProject] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [suiteFilter, setSuiteFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [packName, setPackName] = React.useState('Core Regression Pack');
  const [releaseId, setReleaseId] = React.useState('none');
  const [manualReleaseName, setManualReleaseName] = React.useState('');
  const [savedPacks, setSavedPacks] = React.useState<RegressionPack[]>([]);

  const accessibleProjects = React.useMemo(() => {
    if (!currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer') return projects;
    return projects.filter((project) => {
      const shares = projectShares.filter((share) => share.project_id === project.id);
      if (shares.length === 0) return true;
      return shares.some((share) => share.user_id === currentUser.id);
    });
  }, [activeRole, currentUser, projectShares, projects]);

  React.useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some((project) => project.id === activeProject)) {
      setActiveProject(accessibleProjects[0].id);
    }
  }, [accessibleProjects, activeProject]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setSavedPacks(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch (error) {
      setSavedPacks([]);
    }
  }, []);

  React.useEffect(() => {
    setSelectedIds([]);
    setSuiteFilter('all');
    setRiskFilter('all');
  }, [activeProject]);

  const projectSuites = React.useMemo(
    () => testSuites.filter((suite) => suite.project_id === activeProject),
    [activeProject, testSuites]
  );

  const projectCases = React.useMemo(
    () => testCases.filter((testCase) => testCase.project_id === activeProject && testCase.status !== 'Deprecated'),
    [activeProject, testCases]
  );

  const projectIssues = React.useMemo(
    () => issues.filter((issue) => issue.project_id === activeProject),
    [activeProject, issues]
  );

  const getSuiteName = React.useCallback(
    (suiteId: string) => testSuites.find((suite) => suite.id === suiteId)?.name || 'Unmapped Suite',
    [testSuites]
  );

  const getLatestResult = React.useCallback((testCaseId: string) => {
    const results = testRunResults
      .filter((result) => result.test_case_id === testCaseId)
      .sort((a, b) => new Date(b.executed_at || 0).getTime() - new Date(a.executed_at || 0).getTime());
    return results[0]?.result || 'Not Run';
  }, [testRunResults]);

  const getRelatedIssues = React.useCallback((testCase: TestCase) => {
    const haystack = [
      testCase.title,
      testCase.objective,
      testCase.expected_result,
      testCase.tags?.join(' '),
      getSuiteName(testCase.suite_id)
    ].join(' ').toLowerCase();

    return projectIssues.filter((issue) => {
      const issueText = [
        issue.title,
        issue.description,
        issue.expected_result,
        issue.actual_result,
        issue.steps_to_reproduce
      ].join(' ').toLowerCase();
      return issueText.includes(testCase.title.toLowerCase().slice(0, 20)) ||
        testCase.tags?.some((tag) => issueText.includes(tag.toLowerCase())) ||
        haystack.includes(issue.title.toLowerCase().slice(0, 20));
    });
  }, [getSuiteName, projectIssues]);

  const getRiskLevel = React.useCallback((testCase: TestCase) => {
    const relatedIssues = getRelatedIssues(testCase);
    const hasCriticalIssue = relatedIssues.some((issue) => issue.severity === 'Critical' || issue.severity === 'High');
    const isCriticalCase = testCase.priority === 'High' ||
      testCase.severity === 'Blocker' ||
      testCase.severity === 'Critical' ||
      testCase.tags?.some((tag) => ['Smoke', 'Regression', 'Critical'].includes(tag));
    if (hasCriticalIssue || isCriticalCase) return 'High';
    if (relatedIssues.length > 0 || testCase.priority === 'Medium' || testCase.is_flaky) return 'Medium';
    return 'Low';
  }, [getRelatedIssues]);

  const filteredCases = React.useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return projectCases.filter((testCase) => {
      const matchesQuery = !lowerQuery ||
        testCase.code.toLowerCase().includes(lowerQuery) ||
        testCase.title.toLowerCase().includes(lowerQuery) ||
        getSuiteName(testCase.suite_id).toLowerCase().includes(lowerQuery) ||
        testCase.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery));
      const matchesSuite = suiteFilter === 'all' || testCase.suite_id === suiteFilter;
      const matchesRisk = riskFilter === 'all' || getRiskLevel(testCase) === riskFilter;
      return matchesQuery && matchesSuite && matchesRisk;
    });
  }, [getRiskLevel, getSuiteName, projectCases, query, riskFilter, suiteFilter]);

  const coverageRows = React.useMemo(() => {
    return projectSuites.map((suite) => {
      const cases = projectCases.filter((testCase) => testCase.suite_id === suite.id);
      const automated = cases.filter((testCase) => testCase.is_automated).length;
      const regression = cases.filter((testCase) => testCase.tags?.includes('Regression')).length;
      const smoke = cases.filter((testCase) => testCase.tags?.includes('Smoke')).length;
      const highRisk = cases.filter((testCase) => getRiskLevel(testCase) === 'High').length;
      const passed = cases.filter((testCase) => getLatestResult(testCase.id) === 'Pass').length;
      const failed = cases.filter((testCase) => getLatestResult(testCase.id) === 'Fail').length;
      const blocked = cases.filter((testCase) => getLatestResult(testCase.id) === 'Blocked').length;
      const notRun = cases.length - passed - failed - blocked;
      const coverage = cases.length > 0 ? Math.round(((passed + failed + blocked) / cases.length) * 100) : 0;
      return { suite, cases, automated, regression, smoke, highRisk, passed, failed, blocked, notRun, coverage };
    });
  }, [getLatestResult, getRiskLevel, projectCases, projectSuites]);

  const totals = React.useMemo(() => {
    const totalCases = projectCases.length;
    const automated = projectCases.filter((testCase) => testCase.is_automated).length;
    const highRisk = projectCases.filter((testCase) => getRiskLevel(testCase) === 'High').length;
    const runTouched = projectCases.filter((testCase) => getLatestResult(testCase.id) !== 'Not Run').length;
    const openIssues = projectIssues.filter((issue) => !['Verified', 'Closed'].includes(issue.status)).length;
    return {
      totalCases,
      automated,
      highRisk,
      openIssues,
      coverage: totalCases > 0 ? Math.round((runTouched / totalCases) * 100) : 0,
      automationRate: totalCases > 0 ? Math.round((automated / totalCases) * 100) : 0
    };
  }, [getLatestResult, getRiskLevel, projectCases, projectIssues]);

  const suggestedRegressionCases = React.useMemo(() => {
    return filteredCases.filter((testCase) => {
      const risk = getRiskLevel(testCase);
      return risk === 'High' ||
        testCase.tags?.some((tag) => ['Regression', 'Smoke'].includes(tag)) ||
        getLatestResult(testCase.id) === 'Fail' ||
        getLatestResult(testCase.id) === 'Blocked';
    });
  }, [filteredCases, getLatestResult, getRiskLevel]);

  const selectedCases = React.useMemo(
    () => projectCases.filter((testCase) => selectedIds.includes(testCase.id)),
    [projectCases, selectedIds]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const selectSuggested = () => {
    setSelectedIds(Array.from(new Set(suggestedRegressionCases.map((testCase) => testCase.id))));
    addToast('Suggested regression cases selected.', 'success');
  };

  const saveRegressionPack = () => {
    if (!activeProject || selectedIds.length === 0) {
      addToast('Select at least one test case first.', 'warning');
      return;
    }
    const nextPack: RegressionPack = {
      projectId: activeProject,
      name: packName.trim() || 'Regression Pack',
      caseIds: selectedIds,
      updatedAt: new Date().toISOString()
    };
    const nextPacks = [
      nextPack,
      ...savedPacks.filter((pack) => !(pack.projectId === activeProject && pack.name === nextPack.name))
    ];
    setSavedPacks(nextPacks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPacks));
    addToast('Regression pack saved locally.', 'success');
  };

  const loadPack = (pack: RegressionPack) => {
    setActiveProject(pack.projectId);
    setPackName(pack.name);
    setSelectedIds(pack.caseIds);
    setActiveTab('regression');
    addToast(`Loaded ${pack.name}.`, 'info');
  };

  const createRegressionRun = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (selectedIds.length === 0) {
      addToast('Select at least one test case before creating a run.', 'warning');
      return;
    }
    const project = projects.find((item) => item.id === activeProject);
    const title = `${packName.trim() || 'Regression Pack'} - ${project?.name || 'Project'}`;
    try {
      await addTestRun(
        activeProject,
        releaseId === 'none' ? null : releaseId,
        releaseId === 'none' ? (manualReleaseName.trim() || null) : null,
        title,
        'Regression',
        `Generated from Test Planning with ${selectedIds.length} selected cases.`,
        selectedIds
      );
      addToast('Regression test run created.', 'success');
      router.push('/test-runs');
    } catch (error: any) {
      addToast(error.message || 'Failed to create regression run.', 'error');
    }
  };

  const exportCoverageCsv = () => {
    const header = ['Suite', 'Total Cases', 'Coverage %', 'Automated', 'Regression', 'Smoke', 'High Risk', 'Passed', 'Failed', 'Blocked', 'Not Run'];
    const rows = coverageRows.map((row) => [
      row.suite.name,
      row.cases.length,
      row.coverage,
      row.automated,
      row.regression,
      row.smoke,
      row.highRisk,
      row.passed,
      row.failed,
      row.blocked,
      row.notRun
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projects.find((project) => project.id === activeProject)?.name || 'project'}-coverage-matrix.csv`;
    link.click();
    addToast('Coverage matrix exported.', 'success');
  };

  const exportRegressionCsv = () => {
    if (selectedCases.length === 0) {
      addToast('Select test cases before exporting.', 'warning');
      return;
    }
    const header = ['Code', 'Title', 'Suite', 'Risk', 'Latest Result', 'Automated', 'Tags'];
    const rows = selectedCases.map((testCase) => [
      testCase.code,
      testCase.title,
      getSuiteName(testCase.suite_id),
      getRiskLevel(testCase),
      getLatestResult(testCase.id),
      testCase.is_automated ? 'Yes' : 'No',
      testCase.tags?.join('; ') || ''
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${packName.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'regression-pack'}.csv`;
    link.click();
    addToast('Regression checklist exported.', 'success');
  };

  const riskBadgeClass = (risk: string) => {
    if (risk === 'High') return 'border-red-500/20 bg-red-500/10 text-red-600';
    if (risk === 'Medium') return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700';
  };

  const resultBadgeClass = (result: string) => {
    if (result === 'Pass') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700';
    if (result === 'Fail') return 'border-red-500/20 bg-red-500/10 text-red-600';
    if (result === 'Blocked') return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
    return 'border-zinc-300 bg-zinc-100 text-zinc-600';
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
            <ListChecks className="h-6 w-6 text-primary" />
            Test Planning
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Build project coverage views and reusable regression packs from existing suites, cases, issues, and run results.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
          <Select value={activeProject} onChange={(event) => setActiveProject(event.target.value)}>
            {accessibleProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search case, suite, tag..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as ActiveTab)}
        tabs={[
          { id: 'coverage', label: 'Coverage Matrix', icon: <BarChart3 className="h-4 w-4" /> },
          { id: 'regression', label: 'Regression Builder', icon: <ShieldAlert className="h-4 w-4" /> }
        ]}
      />

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard icon={<ClipboardList className="h-4 w-4" />} label="Total Cases" value={totals.totalCases} />
        <MetricCard icon={<Target className="h-4 w-4" />} label="Coverage" value={`${totals.coverage}%`} />
        <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Automated" value={`${totals.automationRate}%`} />
        <MetricCard icon={<ShieldAlert className="h-4 w-4" />} label="High Risk" value={totals.highRisk} />
        <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Open Issues" value={totals.openIssues} />
      </div>

      {activeTab === 'coverage' ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Select value={suiteFilter} onChange={(event) => setSuiteFilter(event.target.value)} className="w-48">
                  <option value="all">All suites</option>
                  {projectSuites.map((suite) => (
                    <option key={suite.id} value={suite.id}>{suite.name}</option>
                  ))}
                </Select>
                <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="w-40">
                  <option value="all">All risk</option>
                  <option value="High">High risk</option>
                  <option value="Medium">Medium risk</option>
                  <option value="Low">Low risk</option>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={exportCoverageCsv} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Suite / Module</th>
                    <th className="px-4 py-3 text-center">Cases</th>
                    <th className="px-4 py-3 text-center">Coverage</th>
                    <th className="px-4 py-3 text-center">Auto</th>
                    <th className="px-4 py-3 text-center">Regression</th>
                    <th className="px-4 py-3 text-center">High Risk</th>
                    <th className="px-4 py-3 text-center">Latest Results</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {coverageRows.filter((row) => suiteFilter === 'all' || row.suite.id === suiteFilter).map((row) => (
                    <tr key={row.suite.id} className="hover:bg-muted/20">
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{row.suite.name}</div>
                        <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{row.suite.description || 'No description'}</div>
                      </td>
                      <td className="px-4 py-4 text-center font-bold">{row.cases.length}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${row.coverage}%` }} />
                          </div>
                          <span className="w-9 text-right font-bold">{row.coverage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">{row.automated}</td>
                      <td className="px-4 py-4 text-center">{row.regression}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`rounded-md border px-2 py-1 font-bold ${row.highRisk > 0 ? 'border-red-500/20 bg-red-500/10 text-red-600' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}>
                          {row.highRisk}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-1.5">
                          <ResultPill label="P" value={row.passed} className="bg-emerald-500/10 text-emerald-700" />
                          <ResultPill label="F" value={row.failed} className="bg-red-500/10 text-red-600" />
                          <ResultPill label="B" value={row.blocked} className="bg-amber-500/10 text-amber-700" />
                          <ResultPill label="N" value={row.notRun} className="bg-zinc-100 text-zinc-600" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black text-foreground">Coverage Gaps</h2>
              </div>
              <div className="space-y-3">
                {coverageRows.filter((row) => row.coverage < 80 || row.highRisk > 0 || row.cases.length === 0).slice(0, 6).map((row) => (
                  <div key={row.suite.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-foreground">{row.suite.name}</span>
                      <span className="text-[10px] font-black text-muted-foreground">{row.coverage}% covered</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {row.cases.length === 0
                        ? 'No test cases mapped to this suite yet.'
                        : row.highRisk > 0
                          ? `${row.highRisk} high-risk cases need focused regression attention.`
                          : 'Coverage is below the recommended 80% threshold.'}
                    </p>
                  </div>
                ))}
                {coverageRows.every((row) => row.coverage >= 80 && row.highRisk === 0 && row.cases.length > 0) && (
                  <p className="text-xs text-muted-foreground">No major coverage gaps detected for this project.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black text-foreground">Recent Releases</h2>
              </div>
              <div className="space-y-2">
                {releases.slice(0, 4).map((release) => (
                  <div key={release.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                    <span className="font-bold text-foreground">v{release.version}</span>
                    <span className="text-muted-foreground">{release.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]">
                <Input value={packName} onChange={(event) => setPackName(event.target.value)} placeholder="Regression pack name" />
                <Select value={suiteFilter} onChange={(event) => setSuiteFilter(event.target.value)}>
                  <option value="all">All suites</option>
                  {projectSuites.map((suite) => (
                    <option key={suite.id} value={suite.id}>{suite.name}</option>
                  ))}
                </Select>
                <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                  <option value="all">All risk</option>
                  <option value="High">High risk</option>
                  <option value="Medium">Medium risk</option>
                  <option value="Low">Low risk</option>
                </Select>
                <Button variant="outline" size="sm" onClick={selectSuggested} className="gap-2">
                  <Filter className="h-4 w-4" />
                  Select Suggested
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredCases.map((testCase) => {
                const risk = getRiskLevel(testCase);
                const latestResult = getLatestResult(testCase.id);
                const relatedIssues = getRelatedIssues(testCase);
                const selected = selectedIds.includes(testCase.id);
                return (
                  <button
                    key={testCase.id}
                    onClick={() => toggleSelected(testCase.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-black text-zinc-600">{testCase.code}</span>
                          <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${riskBadgeClass(risk)}`}>{risk} Risk</span>
                          <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${resultBadgeClass(latestResult)}`}>{latestResult}</span>
                          {testCase.is_automated && <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-700">Automated</span>}
                        </div>
                        <h3 className="mt-3 text-sm font-black text-foreground">{testCase.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{testCase.objective || testCase.expected_result || 'No objective provided.'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-muted-foreground">
                          <span>{getSuiteName(testCase.suite_id)}</span>
                          <span>{testCase.tags?.join(', ') || 'No tags'}</span>
                          <span>{relatedIssues.length} related issue</span>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white">
                        {selected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-zinc-300" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredCases.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                  <ClipboardList className="mx-auto h-10 w-10 text-zinc-300" />
                  <p className="mt-3 text-sm font-bold text-foreground">No test cases match the current filters.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try another suite, risk level, or search keyword.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-foreground">Regression Checklist</h2>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">{selectedCases.length} cases</span>
              </div>
              <div className="mt-4 space-y-3">
                <Select value={releaseId} onChange={(event) => setReleaseId(event.target.value)}>
                  <option value="none">No release mapping</option>
                  {releases.map((release) => (
                    <option key={release.id} value={release.id}>v{release.version} - {release.status}</option>
                  ))}
                </Select>
                {releaseId === 'none' && (
                  <Input value={manualReleaseName} onChange={(event) => setManualReleaseName(event.target.value)} placeholder="Manual release name, optional" />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={saveRegressionPack}>Save Pack</Button>
                  <Button variant="outline" size="sm" onClick={exportRegressionCsv} className="gap-2">
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
                <Button onClick={createRegressionRun} className="w-full gap-2" disabled={selectedCases.length === 0}>
                  <PlayCircle className="h-4 w-4" />
                  Create Test Run
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-black text-foreground">Pack Summary</h2>
              <div className="space-y-2 text-xs">
                <SummaryLine label="High risk" value={selectedCases.filter((testCase) => getRiskLevel(testCase) === 'High').length} />
                <SummaryLine label="Automated" value={selectedCases.filter((testCase) => testCase.is_automated).length} />
                <SummaryLine label="Latest failed" value={selectedCases.filter((testCase) => getLatestResult(testCase.id) === 'Fail').length} />
                <SummaryLine label="Latest blocked" value={selectedCases.filter((testCase) => getLatestResult(testCase.id) === 'Blocked').length} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-black text-foreground">Saved Packs</h2>
              <div className="space-y-2">
                {savedPacks.filter((pack) => pack.projectId === activeProject).map((pack) => (
                  <button
                    key={`${pack.projectId}-${pack.name}`}
                    onClick={() => loadPack(pack)}
                    className="w-full rounded-lg border border-border/60 px-3 py-2 text-left hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-foreground">{pack.name}</span>
                      <span className="text-[10px] font-black text-muted-foreground">{pack.caseIds.length} cases</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(pack.updatedAt).toLocaleString()}</p>
                  </button>
                ))}
                {savedPacks.filter((pack) => pack.projectId === activeProject).length === 0 && (
                  <p className="text-xs text-muted-foreground">No saved regression packs for this project yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ResultPill({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <span className={`rounded-md px-2 py-1 text-[10px] font-black ${className}`}>
      {label}:{value}
    </span>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="font-black text-foreground">{value}</span>
    </div>
  );
}
