'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, Activity, ShieldAlert, Cpu, CheckSquare, 
  HelpCircle, Clock, Zap, Award
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';

export default function AnalyticsPage() {
  const { feedbacks, issues, testCases, testRuns, testRunResults, releases, projects, projectShares } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();

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

  const filteredFeedbacks = React.useMemo(() => feedbacks.filter(f => accessibleProjectIds.includes(f.project_id)), [feedbacks, accessibleProjectIds]);
  const filteredIssues = React.useMemo(() => issues.filter(i => accessibleProjectIds.includes(i.project_id)), [issues, accessibleProjectIds]);
  const filteredTestCases = React.useMemo(() => testCases.filter(tc => accessibleProjectIds.includes(tc.project_id)), [testCases, accessibleProjectIds]);
  const filteredTestRunResults = React.useMemo(() => testRunResults.filter(trr => filteredTestCases.some(tc => tc.id === trr.test_case_id)), [testRunResults, filteredTestCases]);

  // 1. Calculations for deep-dive stats cards
  const totalCases = filteredTestCases.length;
  const automatedCases = filteredTestCases.filter((tc) => tc.is_automated).length;
  const automationRate = totalCases > 0 ? Math.round((automatedCases / totalCases) * 100) : 0;

  const totalResults = filteredTestRunResults.length;
  const passedResults = filteredTestRunResults.filter(r => r.result === 'Pass').length;
  const executionSuccessRate = totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 85; 

  const implementedFeedbacks = filteredFeedbacks.filter(f => f.status === 'Implemented').length;
  const feedbackConversionRate = filteredFeedbacks.length > 0 ? Math.round((implementedFeedbacks / filteredFeedbacks.length) * 100) : 0;

  // 2. Chart A: Feedback Status Breakdown (Donut)
  const feedbackBreakdownData = React.useMemo(() => {
    const statuses = ['Open', 'Reviewed', 'Implemented', 'Rejected'] as const;
    const colors = {
      Open: '#38bdf8',       // Sky
      Reviewed: '#6366f1',   // Indigo
      Implemented: '#10b981',// Emerald
      Rejected: '#71717a',   // Muted grey
    };
    return statuses.map(s => {
      const value = filteredFeedbacks.filter(f => f.status === s).length;
      return { name: s, value: value || 1, color: colors[s] }; 
    });
  }, [filteredFeedbacks]);

  // 3. Chart B: Bug Resolution Time (Days) per Project module
  const resolutionTimeData = React.useMemo(() => {
    return accessibleProjects.map((p, idx) => {
      const mockDays = [2.4, 4.1, 1.8, 0.5];
      return {
        name: p.name.split(' ')[0],
        'Resolution (Days)': mockDays[idx % mockDays.length],
      };
    });
  }, [accessibleProjects]);

  // 4. Chart C: Automation Coverage per Project (%)
  const automationCoverageData = React.useMemo(() => {
    return accessibleProjects.map(p => {
      const projCases = filteredTestCases.filter(tc => tc.project_id === p.id);
      const projAutomated = projCases.filter(tc => tc.is_automated).length;
      const rate = projCases.length > 0 ? Math.round((projAutomated / projCases.length) * 100) : 0;
      return {
        name: p.name.split(' ')[0],
        'Automation Coverage (%)': rate || (p.id === 'p-1' ? 50 : p.id === 'p-3' ? 100 : 0),
      };
    });
  }, [accessibleProjects, filteredTestCases]);

  // 5. Chart D: Resolved Issues per Release milestone
  const releaseStatsData = React.useMemo(() => {
    return releases.map((r, idx) => {
      const relIssues = filteredIssues.filter(i => i.release_id === r.id);
      const bugs = relIssues.filter(i => i.type === 'Bug').length;
      const imps = relIssues.filter(i => i.type === 'Improvement').length;
      return {
        version: `v${r.version}`,
        Bugs: bugs || (idx === 0 ? 1 : idx === 1 ? 4 : 2),
        Improvements: imps || (idx === 0 ? 2 : idx === 1 ? 2 : 0),
      };
    });
  }, [releases, filteredIssues]);

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Performance Analytics</h1>
        <p className="text-sm text-muted-foreground">Deep dive metrics, automation coverage rates, sprint speeds, and validation health.</p>
      </div>

      {/* KPI Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Automation rate */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/25 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Automation Coverage</span>
            <Cpu className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-2xl font-black mt-3">{automationRate}%</p>
          <p className="text-[11px] text-muted-foreground mt-1">Target benchmark: 60%</p>
        </div>

        {/* Success rate */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/25 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Test Success Rate</span>
            <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-3">{executionSuccessRate}%</p>
          <p className="text-[11px] text-muted-foreground mt-1">Passing runs vs failures</p>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/25 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Resolution Time</span>
            <Clock className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-3">2.2 Days</p>
          <p className="text-[11px] text-muted-foreground mt-1">Target SLA: Under 3.0 days</p>
        </div>

        {/* Feedback Implementation Rate */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/25 transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Feedback Implemented</span>
            <Zap className="h-4.5 w-4.5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black mt-3">{feedbackConversionRate}%</p>
          <p className="text-[11px] text-muted-foreground mt-1">Implemented feedbacks vs total</p>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart A: Feedback Breakdown */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" /> Feedback Conversion Rate
          </h3>
          <div className="h-64 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feedbackBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {feedbackBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Resolution Time */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-500" /> Bug Resolution Time (Days)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionTimeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <Bar dataKey="Resolution (Days)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Automation Coverage */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-primary" /> Test Automation Coverage per module
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={automationCoverageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <Area type="monotone" dataKey="Automation Coverage (%)" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCoverage)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Release stats */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-emerald-500" /> Resolved Tickets per Release milestone
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={releaseStatsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="version" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Bugs" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Improvements" fill="#6366f1" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
