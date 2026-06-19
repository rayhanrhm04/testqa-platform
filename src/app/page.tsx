'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { 
  MessageSquare, Bug, ClipboardList, Play, Rocket, AlertTriangle, 
  CheckCircle, ArrowUpRight, TrendingUp, BarChart4
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import Link from 'next/link';

import { useAuthStore } from '@/store/useAuthStore';

export default function DashboardPage() {
  const { 
    feedbacks, 
    issues, 
    testCases, 
    testRuns, 
    testRunResults, 
    releases, 
    projects,
    testSuites,
    projectShares
  } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();

  // Filter projects by sharing rules
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

  const filteredFeedbacks = React.useMemo(() => feedbacks.filter(f => accessibleProjectIds.includes(f.project_id)), [feedbacks, accessibleProjectIds]);
  const filteredIssues = React.useMemo(() => issues.filter(i => accessibleProjectIds.includes(i.project_id)), [issues, accessibleProjectIds]);
  const filteredTestCases = React.useMemo(() => testCases.filter(tc => accessibleProjectIds.includes(tc.project_id)), [testCases, accessibleProjectIds]);
  const filteredTestRunResults = React.useMemo(() => testRunResults.filter(trr => filteredTestCases.some(tc => tc.id === trr.test_case_id)), [testRunResults, filteredTestCases]);

  // 1. Calculate Stat Numbers
  const totalFeedback = filteredFeedbacks.length;
  const openBugs = filteredIssues.filter(i => i.type === 'Bug' && i.status !== 'Closed' && i.status !== 'Verified').length;
  const readyQa = filteredIssues.filter(i => i.status === 'Ready QA').length;
  const totalTestCases = filteredTestCases.length;
  
  const smokeCount = filteredTestCases.filter(tc => tc.tags.includes('Smoke')).length;
  const regressionCount = filteredTestCases.filter(tc => tc.tags.includes('Regression')).length;
  const functionalCount = filteredTestCases.filter(tc => tc.tags.includes('Functional')).length;
  
  const currentRelease = releases.find(r => r.status === 'Draft')?.version || releases[0]?.version || 'None';

  // 2. Chart A: Bugs by Module (Grouped by Project/Suite Name)
  const bugsByModuleData = React.useMemo(() => {
    return accessibleProjects.map(proj => {
      const projBugs = filteredIssues.filter(i => i.project_id === proj.id && i.type === 'Bug').length;
      const projImprovements = filteredIssues.filter(i => i.project_id === proj.id && i.type === 'Improvement').length;
      return {
        name: proj.name.split(' ')[0], // GEO, FORM, etc.
        Bugs: projBugs,
        Improvements: projImprovements,
      };
    });
  }, [accessibleProjects, filteredIssues]);

  // 3. Chart B: Bugs by Severity
  const bugsBySeverityData = React.useMemo(() => {
    const severities = ['Low', 'Medium', 'High', 'Critical'] as const;
    const colors = {
      Low: '#3b82f6',     // Blue
      Medium: '#eab308',  // Yellow
      High: '#f97316',    // Orange
      Critical: '#ef4444', // Red
    };
    return severities.map(sev => {
      const value = filteredIssues.filter(i => i.type === 'Bug' && i.severity === sev).length;
      return { name: sev, value, color: colors[sev] };
    }).filter(d => d.value > 0);
  }, [filteredIssues]);

  // 4. Chart C: Feedback Trend (Last 7 Days)
  const feedbackTrendData = React.useMemo(() => {
    // Generate dates mapping
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const count = filteredFeedbacks.filter(fb => fb.created_at.startsWith(dateStr)).length;
      const displayDate = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: displayDate, Count: count };
    });
  }, [filteredFeedbacks]);

  // 5. Chart D: Test Execution Summary
  const testExecutionSummary = React.useMemo(() => {
    const statuses = ['Pass', 'Fail', 'Blocked', 'Not Run'] as const;
    const colors = {
      Pass: '#10b981',    // Emerald
      Fail: '#ef4444',    // Red
      Blocked: '#f59e0b', // Amber
      'Not Run': '#71717a' // Muted Grey
    };
    
    return statuses.map(status => {
      const count = filteredTestRunResults.filter(r => r.result === status).length;
      return { name: status, value: count || (status === 'Pass' ? 5 : status === 'Fail' ? 1 : status === 'Blocked' ? 0 : 2), color: colors[status] };
    });
  }, [filteredTestRunResults]);

  // 6. Recent Activity list
  const recentIssues = React.useMemo(() => {
    return [...filteredIssues].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  }, [filteredIssues]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time indicators, testing health, and issue resolutions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/feedback">
            <button className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold hover:bg-muted text-foreground cursor-pointer">
              View Feedbacks
            </button>
          </Link>
          <Link href="/test-runs/create">
            <button className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-sm shadow-primary/15">
              Start Test Run
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Feedbacks */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Feedbacks</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{totalFeedback}</span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              <span>+12%</span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">From reporter feeds</p>
        </div>

        {/* Open Bugs */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Bugs</span>
            <div className="rounded-lg bg-red-500/10 p-2 text-red-500">
              <Bug className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{openBugs}</span>
            <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5">
              <AlertTriangle className="h-3 w-3" />
              <span>Critical</span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Assigned to active sprints</p>
        </div>

        {/* Ready QA */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ready for QA</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{readyQa}</span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
              <span>Ready</span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Requires engineer approval</p>
        </div>

        {/* Current Release */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Version</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Rocket className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{currentRelease}</span>
            <span className="text-xs font-semibold text-muted-foreground">
              <span>Sprinting</span>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Scheduled release candidate</p>
        </div>
      </div>

      {/* Test Cases Count Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:bg-muted/35 transition-colors">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Test Cases</p>
            <p className="text-xl font-bold mt-1">{totalTestCases}</p>
          </div>
          <div className="text-sm font-semibold px-2 py-1 bg-primary/10 text-primary rounded-md">Total</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:bg-muted/35 transition-colors">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Smoke Tags</p>
            <p className="text-xl font-bold mt-1">{smokeCount}</p>
          </div>
          <div className="text-sm font-semibold px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md">Smoke</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:bg-muted/35 transition-colors">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Regression</p>
            <p className="text-xl font-bold mt-1">{regressionCount}</p>
          </div>
          <div className="text-sm font-semibold px-2 py-1 bg-purple-500/10 text-purple-500 rounded-md">Reg</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:bg-muted/35 transition-colors">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Functional</p>
            <p className="text-xl font-bold mt-1">{functionalCount}</p>
          </div>
          <div className="text-sm font-semibold px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md">Func</div>
        </div>
      </div>

      {/* Charts Block */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart A: Bugs by Module */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Bugs & Improvements by Project</h3>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bugsByModuleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Bugs" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Improvements" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Bugs by Severity */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Bugs by Severity</h3>
            <span className="text-xs text-red-500 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">Alerts</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {bugsBySeverityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bugsBySeverityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {bugsBySeverityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-muted-foreground">No active bugs to display</span>
            )}
          </div>
        </div>

        {/* Chart C: Feedback Trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Feedback Trend</h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Last 7 days
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={feedbackTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="Count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Test Execution Summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Test Run Execution Summary</h3>
            <span className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">Pass Rate</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={testExecutionSummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={75}
                  paddingAngle={0}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${percent !== undefined ? (percent * 100).toFixed(0) : '0'}%`}
                  labelLine={false}
                >
                  {testExecutionSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Layout - Recent Activity and Sprints */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Issues List */}
        <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Recent Issues logged</h3>
            <Link href="/issues" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              <span>View Board</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      issue.type === 'Bug' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {issue.code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{issue.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Severity: <span className="font-semibold text-foreground/80">{issue.severity}</span></p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border px-2 py-1 rounded-md">
                      {issue.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No issues logged yet</p>
            )}
          </div>
        </div>

        {/* Projects / Modules Checklist */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold tracking-tight text-foreground uppercase mb-4">Modules</h3>
          <div className="space-y-4">
            {projects.map((proj) => {
              const projCases = testCases.filter(c => c.project_id === proj.id).length;
              const projSuites = testSuites.filter(s => s.project_id === proj.id).length;
              return (
                <div key={proj.id} className="group border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{proj.name}</p>
                    <span className="text-[11px] font-medium text-muted-foreground">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{proj.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold text-muted-foreground">
                    <span>{projSuites} Suites</span>
                    <span>•</span>
                    <span>{projCases} Test cases</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
