'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Layers, Plus, Trash2, Import, Play, Activity, Folder, FileJson, Cpu, Globe, 
  History, Settings, ShieldAlert, CheckCircle, XCircle, ArrowRight, ExternalLink,
  Copy, Info, AlertTriangle, AlertCircle, RefreshCw, Eye, ListFilter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiCollection, ApiEndpoint, ApiEnvironment, ApiTestRun, ApiTestResult } from '@/lib/validators';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

export default function ApiTestingHubPage() {
  const { 
    apiCollections, 
    apiEndpoints, 
    apiEnvironments, 
    apiTestRuns, 
    apiTestResults,
    projects, 
    testCases, 
    users,
    addApiCollection,
    deleteApiCollection,
    addApiEndpoint,
    updateApiEndpoint,
    deleteApiEndpoint,
    addApiEnvironment,
    updateApiEnvironment,
    deleteApiEnvironment,
    importPostmanCollection,
    runApiEndpoint,
    runApiCollection,
    addIssue
  } = useDataStore();

  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'collections' | 'environments' | 'history'>('dashboard');

  // Selected states
  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [selectedColId, setSelectedColId] = React.useState('');
  const [selectedEnvId, setSelectedEnvId] = React.useState('');

  // Modals state
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isCreateColOpen, setIsCreateColOpen] = React.useState(false);
  const [isCreateEnvOpen, setIsCreateEnvOpen] = React.useState(false);
  const [isIssueOpen, setIsIssueOpen] = React.useState(false);
  const [isRunDetailOpen, setIsRunDetailOpen] = React.useState(false);
  const [activeRunDetail, setActiveRunDetail] = React.useState<ApiTestRun | null>(null);

  // Endpoint runner result state
  const [activeEndpointResult, setActiveEndpointResult] = React.useState<ApiTestResult | null>(null);
  const [runningEndpointId, setRunningEndpointId] = React.useState('');
  const [isExecutingCol, setIsExecutingCol] = React.useState(false);

  // Forms state
  const [colName, setColName] = React.useState('');
  const [colDesc, setColDesc] = React.useState('');
  const [envName, setEnvName] = React.useState('');
  const [postmanJson, setPostmanJson] = React.useState('');
  const [postmanFileError, setPostmanFileError] = React.useState('');

  // Environment variables state (Key-Value Builder)
  const [envVariables, setEnvVariables] = React.useState<{ key: string; value: string }[]>([]);
  const [newVarKey, setNewVarKey] = React.useState('');
  const [newVarVal, setNewVarVal] = React.useState('');

  // Issue creation modal fields
  const [issueTitle, setIssueTitle] = React.useState('');
  const [issueDesc, setIssueDesc] = React.useState('');
  const [issueSeverity, setIssueSeverity] = React.useState<'Low' | 'Medium' | 'High' | 'Critical'>('High');

  // Search & Filters
  const [collectionSearch, setCollectionSearch] = React.useState('');

  // Default project selection
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Sync collections target
  const projectCollections = React.useMemo(() => {
    return apiCollections.filter(c => c.project_id === selectedProjectId);
  }, [apiCollections, selectedProjectId]);

  // Default collection selection
  React.useEffect(() => {
    if (projectCollections.length > 0) {
      setSelectedColId(projectCollections[0].id);
    } else {
      setSelectedColId('');
    }
  }, [projectCollections]);

  // Sync environments target
  const projectEnvironments = React.useMemo(() => {
    return apiEnvironments.filter(e => e.project_id === selectedProjectId);
  }, [apiEnvironments, selectedProjectId]);

  // Default environment selection
  React.useEffect(() => {
    if (projectEnvironments.length > 0) {
      setSelectedEnvId(projectEnvironments[0].id);
    } else {
      setSelectedEnvId('');
    }
  }, [projectEnvironments]);

  // Variables sync when selected environment changes
  React.useEffect(() => {
    const activeEnv = apiEnvironments.find(e => e.id === selectedEnvId);
    if (activeEnv && activeEnv.variables) {
      try {
        setEnvVariables(JSON.parse(activeEnv.variables));
      } catch (err) {
        setEnvVariables([]);
      }
    } else {
      setEnvVariables([]);
    }
  }, [selectedEnvId, apiEnvironments]);

  // ----------------------------------------------------
  // IMPORTER HANDLERS
  // ----------------------------------------------------
  const handlePostmanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setPostmanFileError('Invalid file format. Must be a valid Postman JSON collection.');
      setPostmanJson('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.info || !parsed.item) {
          setPostmanFileError('JSON format is valid, but missing Postman collection schemas.');
          setPostmanJson('');
          return;
        }
        setPostmanJson(event.target?.result as string);
        setPostmanFileError('');
      } catch (err) {
        setPostmanFileError('Corrupted file: Failed to parse JSON content.');
        setPostmanJson('');
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!postmanJson) {
      addToast('Please upload a valid Postman collection.', 'warning');
      return;
    }
    try {
      await importPostmanCollection(selectedProjectId, postmanJson);
      setIsImportOpen(false);
      setPostmanJson('');
      addToast('Postman Collection imported successfully!', 'success');
    } catch (e) {
      addToast('Postman import failed.', 'error');
    }
  };

  const handleCreateCollection = async () => {
    if (!colName.trim()) {
      addToast('Collection name is required.', 'warning');
      return;
    }
    try {
      await addApiCollection({
        project_id: selectedProjectId,
        name: colName,
        description: colDesc,
      });
      setIsCreateColOpen(false);
      setColName('');
      setColDesc('');
      addToast('Created new API collection!', 'success');
    } catch (e) {
      addToast('Failed to create collection.', 'error');
    }
  };

  // ----------------------------------------------------
  // RUNNERS HANDLERS
  // ----------------------------------------------------
  const handleRunEndpoint = async (endpointId: string) => {
    setRunningEndpointId(endpointId);
    try {
      const res = await runApiEndpoint(endpointId, selectedEnvId, currentUser?.id || null);
      setActiveEndpointResult(res);
      addToast('Endpoint run completed!', res.status === 'Passed' ? 'success' : 'error');
    } catch (e) {
      addToast('Execution crash error.', 'error');
    } finally {
      setRunningEndpointId('');
    }
  };

  const handleRunCollection = async (collectionId: string) => {
    setIsExecutingCol(true);
    try {
      const run = await runApiCollection(collectionId, selectedEnvId, currentUser?.id || null);
      addToast(`Collection execution finished! ${run.passed_count} Passed, ${run.failed_count} Failed.`, 'success');
      // Set to view this run details automatically
      setActiveRunDetail(run);
      setIsRunDetailOpen(true);
    } catch (e) {
      addToast('Collection execution aborted.', 'error');
    } finally {
      setIsExecutingCol(false);
    }
  };

  // ----------------------------------------------------
  // ENVIRONMENT VARIABLE HANDLERS
  // ----------------------------------------------------
  const handleAddVariable = async () => {
    if (!newVarKey.trim()) return;
    const nextVars = [...envVariables.filter(v => v.key !== newVarKey), { key: newVarKey.trim(), value: newVarVal }];
    
    setEnvVariables(nextVars);
    setNewVarKey('');
    setNewVarVal('');

    if (selectedEnvId) {
      await updateApiEnvironment(selectedEnvId, { variables: JSON.stringify(nextVars) });
    }
  };

  const handleRemoveVariable = async (key: string) => {
    const nextVars = envVariables.filter(v => v.key !== key);
    setEnvVariables(nextVars);
    if (selectedEnvId) {
      await updateApiEnvironment(selectedEnvId, { variables: JSON.stringify(nextVars) });
    }
  };

  const handleCreateEnvironment = async () => {
    if (!envName.trim()) {
      addToast('Environment name is required.', 'warning');
      return;
    }
    try {
      await addApiEnvironment({
        project_id: selectedProjectId,
        name: envName,
        variables: '[]',
      });
      setIsCreateEnvOpen(false);
      setEnvName('');
      addToast('Environment created successfully!', 'success');
    } catch (e) {
      addToast('Failed to create environment.', 'error');
    }
  };

  // ----------------------------------------------------
  // ISSUE INTEGRATION
  // ----------------------------------------------------
  const handleOpenIssueModal = (res: ApiTestResult) => {
    const endpoint = apiEndpoints.find(e => e.id === res.endpoint_id);
    if (!endpoint) return;

    setIssueTitle(`[API Failure] ${endpoint.method} ${endpoint.path}`);
    
    let resolvedBody = res.response_payload || '';
    try {
      resolvedBody = JSON.stringify(JSON.parse(res.response_payload || ''), null, 2);
    } catch (e) {}

    const mdDesc = `API Request failed with status code ${res.status_code}.

**API Details**:
- **Method**: ${endpoint.method}
- **Endpoint Link**: ${endpoint.path}
- **Response Time**: ${res.response_time_ms}ms
- **Errors**: ${res.error_message || 'N/A'}

**Request Payload**:
\`\`\`json
${res.request_payload || 'N/A'}
\`\`\`

**Response Headers**:
\`\`\`json
${res.response_headers || 'N/A'}
\`\`\`

**Response Body**:
\`\`\`json
${resolvedBody}
\`\`\``;

    setIssueDesc(mdDesc);
    setIsIssueOpen(true);
  };

  const handleIssueSubmit = async () => {
    if (!issueTitle.trim() || !issueDesc.trim()) return;
    try {
      await addIssue({
        project_id: selectedProjectId,
        type: 'Bug',
        title: issueTitle,
        description: issueDesc,
        severity: issueSeverity,
        status: 'Open',
      });
      setIsIssueOpen(false);
      addToast('Issue successfully filed on Scrumboard!', 'success');
    } catch (e) {
      addToast('Failed to log issue.', 'error');
    }
  };

  // ----------------------------------------------------
  // ANALYTICS COMPUTATIONS
  // ----------------------------------------------------
  const projectRuns = React.useMemo(() => {
    return apiTestRuns.filter(r => {
      const col = apiCollections.find(c => c.id === r.collection_id);
      return col && col.project_id === selectedProjectId;
    });
  }, [apiTestRuns, apiCollections, selectedProjectId]);

  const stats = React.useMemo(() => {
    const collectionsCount = projectCollections.length;
    const endpointsCount = apiEndpoints.filter(e => projectCollections.some(c => c.id === e.collection_id)).length;
    
    let passedTotal = 0;
    let failedTotal = 0;
    let durationTotal = 0;

    projectRuns.forEach((r) => {
      passedTotal += r.passed_count;
      failedTotal += r.failed_count;
      durationTotal += r.duration_ms;
    });

    const totalRunsCount = passedTotal + failedTotal;
    const successRate = totalRunsCount > 0 ? Math.round((passedTotal / totalRunsCount) * 100) : 100;
    const avgResponseTime = totalRunsCount > 0 ? Math.round(durationTotal / totalRunsCount) : 0;
    const healthScore = successRate; // Health correlates directly to pass rate

    return {
      collectionsCount,
      endpointsCount,
      successRate,
      avgResponseTime,
      healthScore,
    };
  }, [projectCollections, apiEndpoints, projectRuns]);

  // Chart trend data
  const chartData = React.useMemo(() => {
    return [...projectRuns]
      .reverse()
      .slice(-10) // last 10 runs
      .map((r, idx) => ({
        name: `Run #${idx + 1}`,
        Passed: r.passed_count,
        Failed: r.failed_count,
      }));
  }, [projectRuns]);

  // Leaderboard of failed endpoints
  const failedLeaderboard = React.useMemo(() => {
    const failCounts: Record<string, number> = {};
    const endpointsInProject = apiEndpoints.filter(e => projectCollections.some(c => c.id === e.collection_id));
    
    apiTestResults.forEach((res) => {
      if (res.status === 'Failed') {
        failCounts[res.endpoint_id] = (failCounts[res.endpoint_id] || 0) + 1;
      }
    });

    return endpointsInProject
      .map((e) => ({
        endpoint: e,
        count: failCounts[e.id] || 0,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [apiEndpoints, apiTestResults, projectCollections]);

  // AI suggestions list
  const aiInsights = React.useMemo(() => {
    const insights: { type: string; title: string; desc: string; severity: 'low' | 'medium' | 'high' }[] = [];
    const endpoints = apiEndpoints.filter(e => projectCollections.some(c => c.id === e.collection_id));
    
    // 1. Untested manual test cases mapping check
    const unlinked = endpoints.filter(e => !e.test_case_id);
    if (unlinked.length > 0) {
      insights.push({
        type: 'Test Coverage',
        title: 'Untested Endpoint Mappings',
        desc: `Found ${unlinked.length} endpoints not linked to manual Test Cases. Map them to ensure failed endpoints automatically fail test case statuses.`,
        severity: 'medium',
      });
    }

    // 2. Slow endpoints audit
    const slowResults = apiTestResults.filter(r => r.response_time_ms && r.response_time_ms > 100);
    if (slowResults.length > 0) {
      const slowIds = Array.from(new Set(slowResults.map(r => r.endpoint_id)));
      const slowEndpoints = endpoints.filter(e => slowIds.includes(e.id));
      if (slowEndpoints.length > 0) {
        insights.push({
          type: 'Performance Warning',
          title: 'Latent Endpoint Detection',
          desc: `Endpoints like "${slowEndpoints[0].name}" average > 100ms response time. Consider adding them to regression suites.`,
          severity: 'low',
        });
      }
    }

    // 3. Negative testing recommendations
    const postEndpoints = endpoints.filter(e => e.method === 'POST' || e.method === 'PUT');
    if (postEndpoints.length > 0) {
      insights.push({
        type: 'AI Suggestion',
        title: 'Input payload boundary validations',
        desc: `Validate "${postEndpoints[0].name}" with negative values, empty variables, or unsupported characters to verify 400 Bad Request error returns.`,
        severity: 'high',
      });
    }

    return insights;
  }, [apiEndpoints, apiTestResults, projectCollections]);

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            API Testing Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Centrally manage, mock, run, and link Postman collections directly to manual Test Cases and issues tracker.
          </p>
        </div>

        {/* Project Selector mapping */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-muted-foreground">Scope:</span>
          <Select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-48 h-9 text-xs"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          {activeTab === 'collections' && (
            <Button 
              onClick={() => {
                setPostmanFileError('');
                setIsImportOpen(true);
              }}
              size="sm"
              className="cursor-pointer text-xs font-bold gap-1.5"
            >
              <Import className="h-4 w-4" />
              Import Collection
            </Button>
          )}
        </div>
      </div>

      {/* Tabs navigation bar */}
      <div className="flex border-b border-border text-xs font-bold uppercase tracking-wider">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📈 Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('collections')} 
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'collections' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📂 Collections & Runs
        </button>
        <button 
          onClick={() => setActiveTab('environments')} 
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'environments' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          ⚙️ Environments
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          🕒 Automation History
        </button>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Collections</span>
              <p className="text-xl font-bold text-foreground">{stats.collectionsCount} collections</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Endpoints</span>
              <p className="text-xl font-bold text-foreground">{stats.endpointsCount} paths</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Success Rate</span>
              <p className="text-xl font-bold text-emerald-500">{stats.successRate}% Passed</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Avg Response Time</span>
              <p className="text-xl font-bold text-foreground">{stats.avgResponseTime} ms</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Health Score</span>
              <p className="text-xl font-bold text-indigo-500">{stats.healthScore} / 100</p>
            </div>
          </div>

          {/* Graphical Trends & Failure leaderboard */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left: Trend Graph */}
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">API Runs Execution Trends</span>
              {chartData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No historical execution trends available yet.</div>
              ) : (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                      <YAxis stroke="#a1a1aa" fontSize={10} />
                      <Tooltip />
                      <Area type="monotone" dataKey="Passed" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="Failed" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right: Error leaderboard */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Top Failed Endpoints</span>
              
              {failedLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">No failing endpoints detected! API is healthy.</div>
              ) : (
                <div className="space-y-3.5">
                  {failedLeaderboard.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-border bg-zinc-50 dark:bg-zinc-900/40">
                      <div className="space-y-0.5 min-w-0 flex-1 mr-3">
                        <p className="font-bold text-foreground truncate">{item.endpoint.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.endpoint.method} {item.endpoint.path}</p>
                      </div>
                      <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-black text-[10px] shrink-0">
                        {item.count} fails
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Insights */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-indigo-500 animate-pulse" />
              API AI Recommendations & Security Audits
            </span>

            {aiInsights.length === 0 ? (
              <div className="text-xs text-muted-foreground">Import and run API collections to trigger recommendations analyses.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="border border-border p-4 rounded-xl space-y-2 bg-zinc-50/40 dark:bg-zinc-900/10 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="bg-zinc-100 dark:bg-zinc-900 text-muted-foreground font-black px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">
                        {ins.type}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        ins.severity === 'high' ? 'bg-red-500/10 text-red-500' : ins.severity === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {ins.severity} priority
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground">{ins.title}</h4>
                    <p className="text-muted-foreground leading-relaxed mt-1">{ins.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COLLECTIONS & RUNS */}
      {activeTab === 'collections' && (
        <div className="grid gap-6 lg:grid-cols-4 items-start">
          {/* Sidebar Collections lists */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className="text-xs font-bold text-foreground">API Collections</span>
                <button 
                  onClick={() => setIsCreateColOpen(true)}
                  className="text-primary hover:underline text-xs font-bold cursor-pointer"
                >
                  + Create
                </button>
              </div>

              {projectCollections.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">No collections found.</div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  {projectCollections.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedColId(c.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        selectedColId === c.id 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'hover:bg-muted/15 text-muted-foreground hover:text-foreground border border-transparent'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <Folder className="h-4.5 w-4.5 shrink-0" />
                        {c.name}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete collection "${c.name}"?`)) deleteApiCollection(c.id);
                        }}
                        className="text-muted-foreground hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Collection Workspace */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedColId ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground space-y-2">
                <FileJson className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-semibold">Select or import a Collection to get started</p>
                <p className="text-xs">Import a Postman schema JSON or create an empty container.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                {/* Top variables and runner bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Collection: {apiCollections.find(c => c.id === selectedColId)?.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Endpoints: {apiEndpoints.filter(e => e.collection_id === selectedColId).length} items
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">Target Env:</span>
                    <Select 
                      value={selectedEnvId} 
                      onChange={(e) => setSelectedEnvId(e.target.value)}
                      className="w-36 h-8 text-xs py-0"
                    >
                      <option value="">No Environment (Mock)</option>
                      {projectEnvironments.map(env => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                      ))}
                    </Select>

                    <Button 
                      onClick={() => handleRunCollection(selectedColId)}
                      disabled={isExecutingCol}
                      size="sm"
                      className="cursor-pointer text-xs font-bold gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {isExecutingCol ? 'Executing...' : 'Run Collection'}
                    </Button>
                  </div>
                </div>

                {/* Endpoints list table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Endpoints Paths</h4>
                  
                  {apiEndpoints.filter(e => e.collection_id === selectedColId).length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      No paths declared. import Postman collection to fill paths automatically.
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5 w-24">Method</th>
                            <th className="px-4 py-2.5">Endpoint Name & Link</th>
                            <th className="px-4 py-2.5 w-56">Link Test Case</th>
                            <th className="px-4 py-2.5 w-24 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {apiEndpoints
                            .filter(e => e.collection_id === selectedColId)
                            .map((endpoint) => (
                              <tr key={endpoint.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                    endpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-500' :
                                    endpoint.method === 'POST' ? 'bg-emerald-500/10 text-emerald-500' :
                                    endpoint.method === 'PUT' ? 'bg-orange-500/10 text-orange-500' :
                                    'bg-red-500/10 text-red-500'
                                  }`}>
                                    {endpoint.method}
                                  </span>
                                </td>
                                <td className="px-4 py-3 min-w-0">
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-foreground">{endpoint.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono truncate max-w-sm" title={endpoint.path}>
                                      {endpoint.path}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Select
                                    value={endpoint.test_case_id || ''}
                                    onChange={(e) => updateApiEndpoint(endpoint.id, { test_case_id: e.target.value || null })}
                                    className="h-7 text-[10px] py-0"
                                  >
                                    <option value="">Unlinked (Manual)</option>
                                    {testCases.filter(tc => tc.project_id === selectedProjectId).map(tc => (
                                      <option key={tc.id} value={tc.id}>{tc.code} - {tc.title}</option>
                                    ))}
                                  </Select>
                                </td>
                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleRunEndpoint(endpoint.id)}
                                    disabled={runningEndpointId === endpoint.id}
                                    className="h-7 text-[10px] font-bold gap-1 cursor-pointer"
                                  >
                                    <Play className="h-2.5 w-2.5 fill-current text-primary" />
                                    {runningEndpointId === endpoint.id ? '...' : 'Run'}
                                  </Button>
                                  <button 
                                    onClick={() => deleteApiEndpoint(endpoint.id)}
                                    className="text-muted-foreground hover:text-red-500 cursor-pointer p-1"
                                  >
                                    <Trash2 className="h-4.5 w-4.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ENVIRONMENTS */}
      {activeTab === 'environments' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Environment Management</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage config variables for Dev, Staging, UAT, and Production.</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => setIsCreateEnvOpen(true)}
                className="text-primary hover:underline text-xs font-bold cursor-pointer"
              >
                + Add Environment
              </button>

              <Select 
                value={selectedEnvId} 
                onChange={(e) => setSelectedEnvId(e.target.value)}
                className="w-48 h-8.5 text-xs py-0"
              >
                <option value="" disabled>Select Environment...</option>
                {projectEnvironments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </Select>

              {selectedEnvId && (
                <button 
                  onClick={() => {
                    if (confirm(`Delete active environment?`)) {
                      deleteApiEnvironment(selectedEnvId);
                      setSelectedEnvId('');
                    }
                  }}
                  className="text-red-500 hover:underline text-xs font-bold cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {!selectedEnvId ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Select or create an environment config mapping above.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Variable Builder grid input */}
              <div className="md:col-span-2 space-y-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Environment Variables Builder</span>
                
                {envVariables.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No variables declared. Add key-values like baseUrl, Token, or apiKey.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-2">Variable Key</th>
                          <th className="px-4 py-2">Variable Value</th>
                          <th className="px-4 py-2 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {envVariables.map((v) => (
                          <tr key={v.key} className="hover:bg-muted/5">
                            <td className="px-4 py-2.5 font-bold font-mono text-foreground">{v.key}</td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground break-all">{v.value}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button 
                                onClick={() => handleRemoveVariable(v.key)}
                                className="text-red-500 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Variable Sidecard */}
              <div className="border border-border bg-zinc-50/50 dark:bg-zinc-900/10 p-5 rounded-xl space-y-4 text-xs">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Add Variable</span>
                
                <FormGroup label="Variable Key (Must be alphanumeric)">
                  <Input 
                    value={newVarKey} 
                    onChange={(e) => setNewVarKey(e.target.value)} 
                    placeholder="e.g. baseUrl" 
                    className="h-8.5 text-xs"
                  />
                </FormGroup>
                
                <FormGroup label="Variable Value">
                  <Input 
                    value={newVarVal} 
                    onChange={(e) => setNewVarVal(e.target.value)} 
                    placeholder="e.g. https://api.mapid.io" 
                    className="h-8.5 text-xs"
                  />
                </FormGroup>

                <Button 
                  onClick={handleAddVariable}
                  className="w-full text-xs font-bold py-1.5 h-8.5 cursor-pointer"
                >
                  Save Variable
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUTOMATION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-4 border-b border-border/40 pb-2.5">
            API Collection Execution Log history
          </span>

          {projectRuns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No previous API executions logged in this project scope.
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Execution Time</th>
                    <th className="px-4 py-2.5">Collection Name</th>
                    <th className="px-4 py-2.5">Environment</th>
                    <th className="px-4 py-2.5">Executed By</th>
                    <th className="px-4 py-2.5">Duration</th>
                    <th className="px-4 py-2.5">Results (Pass/Fail)</th>
                    <th className="px-4 py-2.5 w-24 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {projectRuns.map((run) => {
                    const col = apiCollections.find(c => c.id === run.collection_id);
                    const env = apiEnvironments.find(e => e.id === run.environment_id);
                    const user = users.find(u => u.id === run.executed_by);
                    
                    return (
                      <tr key={run.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {new Date(run.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{col?.name || 'Collection'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-zinc-100 dark:bg-zinc-800 text-muted-foreground px-2.5 py-0.5 rounded border border-border font-bold">
                            {env?.name || 'Mock (No Env)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{user?.name || 'System Auto'}</td>
                        <td className="px-4 py-3 font-semibold">{run.duration_ms} ms</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                              {run.passed_count} Passed
                            </span>
                            <span className="text-red-500 font-bold flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              {run.failed_count} Failed
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setActiveRunDetail(run);
                              setIsRunDetailOpen(true);
                            }}
                            className="h-7 text-[10px] font-bold cursor-pointer"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* IMPORT POSTMAN COLLECTION DIALOG */}
      <Dialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Postman Collection"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleImportSubmit} className="cursor-pointer text-xs font-bold">
              Import Schema
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-muted-foreground">
            Select a Postman Collection exported file (.json) to import all routes, requests payloads, variables, and headers mappings.
          </p>
          <FormGroup label="Postman Collection file (.json)" error={postmanFileError}>
            <Input 
              type="file" 
              accept=".json" 
              onChange={handlePostmanFileChange} 
              className="text-xs h-9 py-1 bg-muted/10 hover:bg-muted/20"
            />
          </FormGroup>
        </div>
      </Dialog>

      {/* CREATE API COLLECTION DIALOG */}
      <Dialog
        isOpen={isCreateColOpen}
        onClose={() => setIsCreateColOpen(false)}
        title="Create API Collection Container"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateColOpen(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleCreateCollection} className="cursor-pointer text-xs font-bold">
              Save Collection
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <FormGroup label="Collection Name">
            <Input value={colName} onChange={(e) => setColName(e.target.value)} placeholder="e.g. Auth Gateway API v2" />
          </FormGroup>
          <FormGroup label="Description">
            <Textarea value={colDesc} onChange={(e) => setColDesc(e.target.value)} placeholder="Provide information on API scopes..." rows={3} />
          </FormGroup>
        </div>
      </Dialog>

      {/* CREATE ENVIRONMENT DIALOG */}
      <Dialog
        isOpen={isCreateEnvOpen}
        onClose={() => setIsCreateEnvOpen(false)}
        title="Create Environment Profile"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateEnvOpen(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleCreateEnvironment} className="cursor-pointer text-xs font-bold">
              Create Env
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <FormGroup label="Environment Name">
            <Input value={envName} onChange={(e) => setEnvName(e.target.value)} placeholder="e.g. UAT Server" />
          </FormGroup>
        </div>
      </Dialog>

      {/* CREATE BUG ISSUE FOR API FAILURE DIALOG */}
      <Dialog
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        title="Log API Bug to Scrumboard"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsIssueOpen(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleIssueSubmit} className="cursor-pointer text-xs font-bold">
              Submit Bug Ticket
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <FormGroup label="Bug Title">
            <Input value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
          </FormGroup>
          
          <FormGroup label="Bug Description (Pre-filled Logs)">
            <Textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} rows={6} className="font-mono text-xs leading-normal" />
          </FormGroup>

          <FormGroup label="Severity Priority">
            <Select value={issueSeverity} onChange={(e: any) => setIssueSeverity(e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>
          </FormGroup>
        </div>
      </Dialog>

      {/* ENDPOINT EXECUTION RESPONSE DIALOG */}
      {activeEndpointResult && (
        <Dialog
          isOpen={activeEndpointResult !== null}
          onClose={() => setActiveEndpointResult(null)}
          title={`Execution Log: ${apiEndpoints.find(e => e.id === activeEndpointResult.endpoint_id)?.name}`}
          size="lg"
          footer={
            <div className="flex justify-between w-full">
              {activeEndpointResult.status === 'Failed' ? (
                <Button 
                  onClick={() => {
                    handleOpenIssueModal(activeEndpointResult);
                    setActiveEndpointResult(null);
                  }}
                  className="cursor-pointer text-xs font-bold bg-red-500 hover:bg-red-600 gap-1.5"
                >
                  <AlertCircle className="h-4 w-4" />
                  Create Issue
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={() => setActiveEndpointResult(null)} className="cursor-pointer text-xs font-bold">
                Close Log
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-left text-xs">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  activeEndpointResult.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {activeEndpointResult.status}
                </span>
                <span className="font-bold text-foreground">
                  Status Code: {activeEndpointResult.status_code || 'N/A'}
                </span>
              </div>
              <span className="text-muted-foreground font-semibold">
                Response Time: {activeEndpointResult.response_time_ms} ms
              </span>
            </div>

            {/* Error Message banner */}
            {activeEndpointResult.error_message && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-500 rounded-lg p-3 flex gap-2 font-semibold">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>Error details: {activeEndpointResult.error_message}</span>
              </div>
            )}

            {/* Grid for headers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Request Headers</span>
                <pre className="p-2.5 bg-muted/15 border border-border/40 rounded-lg overflow-x-auto font-mono text-[10px] leading-normal max-h-[100px]">
                  {activeEndpointResult.request_headers || 'N/A'}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Response Headers</span>
                <pre className="p-2.5 bg-muted/15 border border-border/40 rounded-lg overflow-x-auto font-mono text-[10px] leading-normal max-h-[100px]">
                  {activeEndpointResult.response_headers || 'N/A'}
                </pre>
              </div>
            </div>

            {/* Payloads */}
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Request Payload</span>
                <pre className="p-2.5 bg-muted/15 border border-border/40 rounded-lg overflow-x-auto font-mono text-[10px] leading-normal max-h-[80px]">
                  {activeEndpointResult.request_payload || 'Empty Body'}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Response Body</span>
                <pre className="p-2.5 bg-zinc-900 text-zinc-100 rounded-lg overflow-x-auto font-mono text-[10px] leading-normal max-h-[220px]">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(activeEndpointResult.response_payload || ''), null, 2);
                    } catch (e) {
                      return activeEndpointResult.response_payload || 'Empty Response';
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* COLLECTION BATCH RUN DETAILS DIALOG */}
      {isRunDetailOpen && activeRunDetail && (
        <Dialog
          isOpen={isRunDetailOpen}
          onClose={() => { setIsRunDetailOpen(false); setActiveRunDetail(null); }}
          title={`Collection Run Summary: #${activeRunDetail.id}`}
          size="lg"
          footer={
            <Button onClick={() => { setIsRunDetailOpen(false); setActiveRunDetail(null); }} className="cursor-pointer text-xs font-bold">
              Close Report
            </Button>
          }
        >
          <div className="space-y-4 text-left text-xs">
            {/* Summary statistics */}
            <div className="grid gap-3 sm:grid-cols-4 border-b border-border pb-4">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">Duration</span>
                <p className="font-bold text-foreground text-sm">{activeRunDetail.duration_ms} ms</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">Endpoints</span>
                <p className="font-bold text-foreground text-sm">
                  {activeRunDetail.passed_count + activeRunDetail.failed_count}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">Passed</span>
                <p className="font-bold text-emerald-500 text-sm">{activeRunDetail.passed_count}</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">Failed</span>
                <p className="font-bold text-red-500 text-sm">{activeRunDetail.failed_count}</p>
              </div>
            </div>

            {/* List results inside this run */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Batch Execution List</span>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {apiTestResults
                  .filter(r => r.run_id === activeRunDetail.id)
                  .map((res) => {
                    const endpoint = apiEndpoints.find(e => e.id === res.endpoint_id);
                    if (!endpoint) return null;
                    return (
                      <div key={res.id} className="border border-border p-3.5 rounded-xl flex items-center justify-between gap-4 bg-zinc-50/20 dark:bg-zinc-900/10 text-xs">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              endpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {endpoint.method}
                            </span>
                            <span className="font-bold text-foreground truncate">{endpoint.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-md">{endpoint.path}</p>
                          {res.error_message && (
                            <p className="text-[10px] text-red-500 font-semibold">Error: {res.error_message}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={`font-black uppercase tracking-wide text-[10px] ${
                              res.status === 'Passed' ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {res.status} ({res.status_code || 'N/A'})
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{res.response_time_ms} ms</p>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setActiveEndpointResult(res)}
                            className="h-7 text-[10px] font-bold cursor-pointer"
                          >
                            Logs
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
