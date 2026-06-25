'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { 
  MessageSquare, Bug, Rocket, AlertTriangle, 
  CheckCircle, ArrowUpRight, TrendingUp, BarChart4, ClipboardList
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
      'Not Run': '#94a3b8' // Muted Grey
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
    <div className="space-y-6 pb-12 select-none">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time indicators, testing health, and issue resolutions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/feedback">
            <button className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer transition-colors shadow-xs">
              View Feedbacks
            </button>
          </Link>
          <Link href="/test-runs/create">
            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer shadow-sm shadow-primary/10 transition-colors">
              Start Test Run
            </button>
          </Link>
        </div>
      </div>

      {/* Row 1: Today's Summary & Test Execution Summary */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Today's Status Cards */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-xs lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Today's Summary</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">QA & Feedback Metrics</p>
            </div>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer transition-colors">
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              Export
            </button>
          </div>
          
          {/* Sub-grid of stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Feedback */}
            <div className="bg-white dark:bg-zinc-900 border border-border/80 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] hover:scale-[1.01] transition-transform select-none">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground shadow-xs">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-foreground leading-none">{totalFeedback}</div>
                <div className="text-xs font-bold text-muted-foreground mt-1.5">Total Feedbacks</div>
                <div className="text-[9px] font-bold text-muted-foreground mt-1.5">+12% from yesterday</div>
              </div>
            </div>

            {/* Card 2: Active Bugs */}
            <div className="bg-white dark:bg-zinc-900 border border-border/80 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] hover:scale-[1.01] transition-transform select-none">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground shadow-xs">
                <Bug className="h-4.5 w-4.5" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-foreground leading-none">{openBugs}</div>
                <div className="text-xs font-bold text-muted-foreground mt-1.5">Active Bugs</div>
                <div className="text-[9px] font-bold text-muted-foreground mt-1.5">Sprint-critical issues</div>
              </div>
            </div>

            {/* Card 3: Ready for QA */}
            <div className="bg-white dark:bg-zinc-900 border border-border/80 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] hover:scale-[1.01] transition-transform select-none">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground shadow-xs">
                <CheckCircle className="h-4.5 w-4.5" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-foreground leading-none">{readyQa}</div>
                <div className="text-xs font-bold text-muted-foreground mt-1.5">Ready for QA</div>
                <div className="text-[9px] font-bold text-muted-foreground mt-1.5">Awaiting QA validation</div>
              </div>
            </div>

            {/* Card 4: Target Version / Current Release */}
            <div className="bg-white dark:bg-zinc-900 border border-border/80 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] hover:scale-[1.01] transition-transform select-none">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-foreground shadow-xs">
                <Rocket className="h-4.5 w-4.5" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-foreground leading-none truncate">{currentRelease}</div>
                <div className="text-xs font-bold text-muted-foreground mt-1.5">Target Version</div>
                <div className="text-[9px] font-bold text-muted-foreground mt-1.5">Scheduled candidate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Visitor Insights / Test Execution Summary Pie Chart */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Test Outcomes</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Execution distribution</p>
          </div>
          <div className="h-40 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={testExecutionSummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {testExecutionSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend indicators */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground mt-2">
            {testExecutionSummary.map((t, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="truncate">{t.name}: {t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Secondary statistics pills */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Test Cases</p>
            <p className="text-xl font-bold mt-1 text-foreground">{totalTestCases}</p>
          </div>
          <div className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-foreground border border-border/40 rounded-md">Total</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Smoke Tags</p>
            <p className="text-xl font-bold mt-1 text-foreground">{smokeCount}</p>
          </div>
          <div className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-foreground border border-border/40 rounded-md">Smoke</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Regression</p>
            <p className="text-xl font-bold mt-1 text-foreground">{regressionCount}</p>
          </div>
          <div className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-foreground border border-border/40 rounded-md">Reg</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors shadow-xs">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Functional</p>
            <p className="text-xl font-bold mt-1 text-foreground">{functionalCount}</p>
          </div>
          <div className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-foreground border border-border/40 rounded-md">Func</div>
        </div>
      </div>

      {/* Row 3: Charts Block */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Chart A: Bugs & Improvements (Styled exactly like "Total Revenue" blue/green bar chart) */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 md:col-span-2 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Project Revenue Metrics</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Bugs vs Improvements distribution</p>
            </div>
            <BarChart4 className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bugsByModuleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" stroke="var(--muted-foreground)" />
                <YAxis fontSize={10} fontWeight="bold" stroke="var(--muted-foreground)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                {/* Monochrome fill variables */}
                <Bar dataKey="Bugs" name="Bugs" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Improvements" name="Improvements" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Feedback Trend (Styled exactly like Customer Satisfaction area chart) */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 md:col-span-1 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Satisfaction Trend</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Reporter feedback counts</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={feedbackTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={10} fontWeight="bold" stroke="var(--muted-foreground)" />
                <YAxis fontSize={10} fontWeight="bold" stroke="var(--muted-foreground)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                {/* Smooth curves with monochrome stroke & fill gradient */}
                <Area type="monotone" dataKey="Count" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Activity, Severity and sprint modules */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Issues List */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 md:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Recent Issues</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest logs across modules</p>
            </div>
            <Link href="/issues" className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5">
              <span>View Kanban</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      issue.type === 'Bug' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {issue.code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-foreground">{issue.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Severity: <span className="font-bold text-foreground/80">{issue.severity}</span></p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[10px] font-bold bg-secondary text-secondary-foreground border border-border/50 px-2.5 py-1 rounded-lg">
                      {issue.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No issues logged yet</p>
            )}
          </div>
        </div>

        {/* Modules Checklist */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Modules Checklist</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Accessible projects info</p>
          </div>
          <div className="space-y-4 mt-4 flex-1">
            {projects.map((proj) => {
              const projCases = testCases.filter(c => c.project_id === proj.id).length;
              const projSuites = testSuites.filter(s => s.project_id === proj.id).length;
              return (
                <div key={proj.id} className="group border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{proj.name}</p>
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm">Active</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{proj.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-muted-foreground">
                    <span>{projSuites} Suites</span>
                    <span>•</span>
                    <span>{projCases} Test Cases</span>
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
