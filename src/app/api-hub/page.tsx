'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Layers, Plus, Trash2, Import, Play, Activity, Folder, FileJson, Cpu, Globe, 
  History, Settings, ShieldAlert, CheckCircle, XCircle, ArrowRight, ExternalLink,
  Copy, Info, AlertTriangle, AlertCircle, RefreshCw, Eye, ListFilter, Send, Save
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
    testSuites,
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
    addIssue,
    addTestCase,
    addTestSuite
  } = useDataStore();

  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'collections' | 'environments' | 'history' | 'request'>('dashboard');

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

  // HTTP Request Client State
  const [requestMethod, setRequestMethod] = React.useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [requestUrl, setRequestUrl] = React.useState('https://httpbin.org/post');
  const [activeRequestSubtab, setActiveRequestSubtab] = React.useState<'auth' | 'headers' | 'params' | 'body' | 'settings'>('auth');
  const [requestAuthType, setRequestAuthType] = React.useState<'none' | 'bearer' | 'basic' | 'apikey'>('none');
  const [requestBearerToken, setRequestBearerToken] = React.useState('');
  const [requestBasicUsername, setRequestBasicUsername] = React.useState('');
  const [requestBasicPassword, setRequestBasicPassword] = React.useState('');
  const [requestApiKeyName, setRequestApiKeyName] = React.useState('');
  const [requestApiKeyValue, setRequestApiKeyValue] = React.useState('');

  const [requestHeaders, setRequestHeaders] = React.useState<{ key: string; value: string }[]>([]);
  const [newReqHeaderKey, setNewReqHeaderKey] = React.useState('');
  const [newReqHeaderVal, setNewReqHeaderVal] = React.useState('');

  const [requestParams, setRequestParams] = React.useState<{ key: string; value: string }[]>([]);
  const [newReqParamKey, setNewReqParamKey] = React.useState('');
  const [newReqParamVal, setNewReqParamVal] = React.useState('');

  const [requestBodyType, setRequestBodyType] = React.useState<'none' | 'json' | 'form' | 'urlencoded'>('none');
  const [requestBodyContent, setRequestBodyContent] = React.useState('');
  const [requestTimeout, setRequestTimeout] = React.useState('30000');

  // Response state
  const [isSendingRequest, setIsSendingRequest] = React.useState(false);
  const [requestResponse, setRequestResponse] = React.useState<{
    status: number;
    statusText: string;
    time: number;
    size: number;
    headers: any;
    body: string;
    error: string | null;
  } | null>(null);

  // Save Request Modal state
  const [isSaveRequestOpen, setIsSaveRequestOpen] = React.useState(false);
  const [saveTargetColId, setSaveTargetColId] = React.useState('');
  const [saveRequestName, setSaveRequestName] = React.useState('');
  const [newColNameForSave, setNewColNameForSave] = React.useState('');
  const [isCreatingNewColForSave, setIsCreatingNewColForSave] = React.useState(false);

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
      setSaveTargetColId(projectCollections[0].id);
    } else {
      setSelectedColId('');
      setSaveTargetColId('');
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
  // HTTP MANUAL REQUEST HANDLERS
  // ----------------------------------------------------
  const resolveVariables = (text: string) => {
    if (!text) return '';
    let resolved = text;
    const activeEnv = apiEnvironments.find(e => e.id === selectedEnvId);
    if (activeEnv && activeEnv.variables) {
      try {
        const variables = JSON.parse(activeEnv.variables);
        variables.forEach((v: any) => {
          const regex = new RegExp(`\\{\\{\\s*${v.key}\\s*\\}\\}`, 'g');
          resolved = resolved.replace(regex, v.value);
        });
      } catch (e) {}
    }
    return resolved;
  };

  const handleSendRequest = async () => {
    if (!requestUrl.trim()) {
      addToast('Please enter a request URL.', 'warning');
      return;
    }

    setIsSendingRequest(true);
    setRequestResponse(null);

    // 1. Resolve URL & Query params
    let resolvedUrl = resolveVariables(requestUrl.trim());
    
    const compiledParams = requestParams.filter(p => p.key.trim() !== '');
    if (compiledParams.length > 0) {
      try {
        const urlObj = new URL(resolvedUrl.startsWith('http') ? resolvedUrl : `http://${resolvedUrl}`);
        compiledParams.forEach(p => {
          urlObj.searchParams.append(resolveVariables(p.key), resolveVariables(p.value));
        });
        resolvedUrl = urlObj.toString();
      } catch (e) {
        // Fallback simple query append if URL object throws
        const queryStr = compiledParams.map(p => `${resolveVariables(p.key)}=${resolveVariables(p.value)}`).join('&');
        resolvedUrl += (resolvedUrl.includes('?') ? '&' : '?') + queryStr;
      }
    }

    // 2. Compile headers
    const compiledHeaders: Record<string, string> = {};
    
    if (requestBodyType === 'json') {
      compiledHeaders['Content-Type'] = 'application/json';
    } else if (requestBodyType === 'urlencoded') {
      compiledHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    requestHeaders.forEach(h => {
      if (h.key.trim() !== '') {
        compiledHeaders[resolveVariables(h.key)] = resolveVariables(h.value);
      }
    });

    if (requestAuthType === 'bearer' && requestBearerToken) {
      compiledHeaders['Authorization'] = `Bearer ${resolveVariables(requestBearerToken)}`;
    } else if (requestAuthType === 'basic') {
      const credentials = btoa(`${resolveVariables(requestBasicUsername)}:${resolveVariables(requestBasicPassword)}`);
      compiledHeaders['Authorization'] = `Basic ${credentials}`;
    } else if (requestAuthType === 'apikey' && requestApiKeyName && requestApiKeyValue) {
      compiledHeaders[resolveVariables(requestApiKeyName)] = resolveVariables(requestApiKeyValue);
    }

    // 3. Compile body
    let compiledBody = '';
    if (requestBodyType === 'json' || requestBodyType === 'urlencoded') {
      compiledBody = resolveVariables(requestBodyContent);
    }

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: resolvedUrl,
          method: requestMethod,
          headers: compiledHeaders,
          body: compiledBody || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status > 0) {
        const bodyStr = data.body || '';
        const size = bodyStr ? new Blob([bodyStr]).size : 0;
        
        let statusText = 'OK';
        if (data.status === 201) statusText = 'Created';
        else if (data.status === 400) statusText = 'Bad Request';
        else if (data.status === 401) statusText = 'Unauthorized';
        else if (data.status === 403) statusText = 'Forbidden';
        else if (data.status === 404) statusText = 'Not Found';
        else if (data.status === 500) statusText = 'Internal Server Error';

        setRequestResponse({
          status: data.status,
          statusText,
          time: data.duration_ms || 120,
          size,
          headers: data.headers || {},
          body: bodyStr,
          error: data.status >= 400 ? `HTTP Error: Request failed with status code ${data.status}` : null,
        });
      } else {
        setRequestResponse({
          status: data.status || 500,
          statusText: 'Error',
          time: 0,
          size: 0,
          headers: {},
          body: data.error || 'Connection failure or host is unreachable',
          error: data.error || 'Connection timed out or host is unreachable',
        });
      }
    } catch (err: any) {
      setRequestResponse({
        status: 500,
        statusText: 'Failed',
        time: 0,
        size: 0,
        headers: {},
        body: err.message || 'Failed to dispatch request to proxy',
        error: err.message || 'Failed to dispatch request to proxy',
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleSaveRequestSubmit = async () => {
    if (!saveRequestName.trim()) {
      addToast('Request name is required.', 'warning');
      return;
    }

    let targetColId = saveTargetColId;

    if (isCreatingNewColForSave) {
      if (!newColNameForSave.trim()) {
        addToast('New collection name is required.', 'warning');
        return;
      }
      const newCol = await addApiCollection({
        project_id: selectedProjectId,
        name: newColNameForSave,
        description: 'Custom created collection from manual HTTP request',
      });
      if (newCol) {
        targetColId = newCol.id;
      } else {
        addToast('Failed to create collection.', 'error');
        return;
      }
    }

    if (!targetColId) {
      addToast('Please select a collection.', 'warning');
      return;
    }

    const headersList = [...requestHeaders];
    if (requestAuthType === 'bearer' && requestBearerToken) {
      headersList.push({ key: 'Authorization', value: `Bearer ${requestBearerToken}` });
    } else if (requestAuthType === 'basic') {
      headersList.push({ key: 'Authorization', value: `Basic BasicAuth` });
    } else if (requestAuthType === 'apikey' && requestApiKeyName && requestApiKeyValue) {
      headersList.push({ key: requestApiKeyName, value: requestApiKeyValue });
    }

    try {
      await addApiEndpoint({
        collection_id: targetColId,
        name: saveRequestName,
        method: requestMethod,
        path: requestUrl,
        headers: JSON.stringify(headersList),
        params: JSON.stringify(requestParams),
        body: requestBodyContent,
        test_case_id: null,
      });

      setIsSaveRequestOpen(false);
      setSaveRequestName('');
      setNewColNameForSave('');
      addToast('Request saved to collection successfully!', 'success');
    } catch (e) {
      addToast('Failed to save request.', 'error');
    }
  };

  const handleOpenIssueModalFromRequest = () => {
    if (!requestResponse) return;
    
    setIssueTitle(`[HTTP Client Error] ${requestMethod} ${requestUrl}`);
    
    let resolvedBody = requestResponse.body || '';
    try {
      resolvedBody = JSON.stringify(JSON.parse(requestResponse.body || ''), null, 2);
    } catch (e) {}

    const mdDesc = `Manual API Request failed with status code ${requestResponse.status}.

**API Request details**:
- **Method**: ${requestMethod}
- **URL**: ${requestUrl}
- **Response Time**: ${requestResponse.time}ms
- **Environment**: ${apiEnvironments.find(e => e.id === selectedEnvId)?.name || 'Mock (No Env)'}
- **Error Message**: ${requestResponse.error || 'N/A'}

**Request Body**:
\`\`\`json
${requestBodyContent || 'None'}
\`\`\`

**Response Headers**:
\`\`\`json
${JSON.stringify(requestResponse.headers, null, 2)}
\`\`\`

**Response Body**:
\`\`\`json
${resolvedBody}
\`\`\``;

    setIssueDesc(mdDesc);
    setIsIssueOpen(true);
  };

  const handleGenerateTestCase = async () => {
    if (!requestUrl) return;
    try {
      let targetSuiteId = '';
      const projectSuites = testSuites.filter(s => s.project_id === selectedProjectId);
      
      if (projectSuites.length > 0) {
        targetSuiteId = projectSuites[0].id;
      } else {
        const newSuite = await addTestSuite(
          selectedProjectId, 
          'API Testing Suite', 
          'Auto-generated suite for manual sandbox HTTP requests'
        );
        if (newSuite) {
          targetSuiteId = newSuite.id;
        } else {
          throw new Error('Failed to create default Test Suite');
        }
      }

      let cleanPath = requestUrl;
      try {
        const urlWithoutQuery = requestUrl.split('?')[0];
        const urlObj = new URL(urlWithoutQuery.startsWith('http') ? urlWithoutQuery : 'http://' + urlWithoutQuery);
        cleanPath = urlObj.pathname;
      } catch (e) {
        cleanPath = requestUrl.split('?')[0];
      }

      await addTestCase({
        project_id: selectedProjectId,
        suite_id: targetSuiteId,
        title: `API Verification: ${requestMethod} ${cleanPath}`,
        description: `Verify that request to ${requestUrl} behaves correctly.`,
        steps: `1. Send ${requestMethod} request to ${requestUrl}.\n2. Assert response status is ${requestResponse?.status || 200}.\n3. Validate response payloads content.`,
        expected_result: `Request returns status ${requestResponse?.status || 200} with response body.`,
        tags: ['API-Automation'],
        is_automated: true,
        created_by: currentUser?.id || null,
        objective: 'Verify endpoint availability and status validation',
        precondition: 'Staging environment variables mapped correctly',
        post_condition: 'Connection closed successfully',
        test_data: requestBodyContent || '',
        status: 'Actual'
      } as any);

      addToast('Generated manual Test Case successfully!', 'success');
    } catch (e: any) {
      console.error("Test Case generation error:", e);
      addToast(`Failed to generate TestCase: ${e.message || e}`, 'error');
    }
  };

  const requestAiAnalysis = React.useMemo(() => {
    if (!requestResponse) return null;
    
    const insights: { title: string; desc: string; severity: 'low' | 'medium' | 'high' }[] = [];
    
    if (requestResponse.status >= 500) {
      insights.push({
        title: 'Server-side failure diagnostic',
        desc: 'The target server returned a 5xx response. Check server application logs, database connection thread pool configurations, or environment route paths.',
        severity: 'high',
      });
    } else if (requestResponse.status === 401 || requestResponse.status === 403) {
      insights.push({
        title: 'Authentication Header mismatch',
        desc: 'Access denied. Verify Bearer tokens or environment secret bindings are resolved correctly on the Environment subtab.',
        severity: 'high',
      });
    } else if (requestResponse.status >= 400) {
      insights.push({
        title: 'Invalid Request Payload boundary',
        desc: 'The server rejected the payload format. Double-check request query parameters spelling and raw body JSON brackets structure.',
        severity: 'medium',
      });
    }

    if (requestResponse.time > 200) {
      insights.push({
        title: 'Slow API Response Latency',
        desc: `API took ${requestResponse.time}ms. Ensure this endpoint is added to regression runs to monitor payload processing durations.`,
        severity: 'medium',
      });
    }

    insights.push({
      title: 'Suggested Negative Boundary Testing',
      desc: 'Attempt running requests with empty payloads or invalid auth credentials to verify proper 4xx validation codes are raised.',
      severity: 'low',
    });

    return insights;
  }, [requestResponse]);

  const playwrightCodeSnippet = React.useMemo(() => {
    const headers: any = {};
    requestHeaders.forEach(h => {
      if (h.key) headers[h.key] = h.value;
    });
    if (requestAuthType === 'bearer' && requestBearerToken) {
      headers['Authorization'] = `Bearer ${requestBearerToken}`;
    }
    
    let formattedData = 'undefined';
    if (requestBodyContent) {
      try {
        formattedData = JSON.stringify(JSON.parse(requestBodyContent), null, 4);
      } catch (e) {
        formattedData = JSON.stringify(requestBodyContent);
      }
    }

    return `import { test, expect } from '@playwright/test';

test('HTTP Request Validation', async ({ request }) => {
  const response = await request.${requestMethod.toLowerCase()}('${requestUrl}', {
    headers: ${JSON.stringify(headers, null, 4)},
    data: ${formattedData}
  });
  expect(response.status()).toBe(${requestResponse?.status || 200});
});`;
  }, [requestMethod, requestUrl, requestHeaders, requestBearerToken, requestAuthType, requestBodyContent, requestResponse]);

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
    const healthScore = successRate;

    return {
      collectionsCount,
      endpointsCount,
      successRate,
      avgResponseTime,
      healthScore,
    };
  }, [projectCollections, apiEndpoints, projectRuns]);

  const chartData = React.useMemo(() => {
    return [...projectRuns]
      .reverse()
      .slice(-10)
      .map((r, idx) => ({
        name: `Run #${idx + 1}`,
        Passed: r.passed_count,
        Failed: r.failed_count,
      }));
  }, [projectRuns]);

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

  const aiInsights = React.useMemo(() => {
    const insights: { type: string; title: string; desc: string; severity: 'low' | 'medium' | 'high' }[] = [];
    const endpoints = apiEndpoints.filter(e => projectCollections.some(c => c.id === e.collection_id));
    
    const unlinked = endpoints.filter(e => !e.test_case_id);
    if (unlinked.length > 0) {
      insights.push({
        type: 'Test Coverage',
        title: 'Untested Endpoint Mappings',
        desc: `Found ${unlinked.length} endpoints not linked to manual Test Cases. Map them to ensure failed endpoints automatically fail test case statuses.`,
        severity: 'medium',
      });
    }

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
          onClick={() => setActiveTab('request')} 
          className={`px-5 py-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'request' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          ⚡ HTTP Request
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

      {/* TAB 3: HTTP REQUEST WORKSPACE CLIENT */}
      {activeTab === 'request' && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Left panel: URL setup + Config options */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Manual HTTP Sandbox Client</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Test API calls directly using Environment variables bindings.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSaveRequestName(`Request-${Date.now().toString().slice(-4)}`);
                  setIsSaveRequestOpen(true);
                }}
                className="cursor-pointer text-xs font-bold gap-1.5 h-8.5"
              >
                <Save className="h-3.5 w-3.5" />
                Save Request
              </Button>
            </div>

            {/* URL input bar */}
            <div className="flex gap-2 items-center">
              <div className="w-28 shrink-0">
                <Select 
                  value={requestMethod} 
                  onChange={(e: any) => setRequestMethod(e.target.value)}
                  className="font-bold text-xs"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </Select>
              </div>
              
              <Input 
                value={requestUrl}
                onChange={(e) => setRequestUrl(e.target.value)}
                placeholder="https://httpbin.org/post"
                className="font-mono text-xs flex-1"
              />

              <Button 
                onClick={handleSendRequest}
                disabled={isSendingRequest}
                className="cursor-pointer px-5 font-bold text-xs gap-1.5 h-9 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                {isSendingRequest ? 'Sending...' : 'Send'}
              </Button>
            </div>

            {/* Subtabs for Auth, Headers, Params, Body */}
            <div className="space-y-4">
              <div className="flex border-b border-border text-[11px] font-bold uppercase tracking-wider">
                <button 
                  onClick={() => setActiveRequestSubtab('auth')} 
                  className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                    activeRequestSubtab === 'auth' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  🔒 Authorization
                </button>
                <button 
                  onClick={() => setActiveRequestSubtab('headers')} 
                  className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                    activeRequestSubtab === 'headers' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  📝 Headers ({requestHeaders.length})
                </button>
                <button 
                  onClick={() => setActiveRequestSubtab('params')} 
                  className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                    activeRequestSubtab === 'params' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  🔎 Query Params ({requestParams.length})
                </button>
                <button 
                  onClick={() => setActiveRequestSubtab('body')} 
                  className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                    activeRequestSubtab === 'body' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  📦 Body ({requestBodyType})
                </button>
                <button 
                  onClick={() => setActiveRequestSubtab('settings')} 
                  className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${
                    activeRequestSubtab === 'settings' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  ⚙️ Settings
                </button>
              </div>

              {/* Subtabs Contents */}
              {activeRequestSubtab === 'auth' && (
                <div className="space-y-4 text-xs">
                  <FormGroup label="Auth Mode">
                    <Select 
                      value={requestAuthType} 
                      onChange={(e: any) => setRequestAuthType(e.target.value)}
                      className="text-xs h-8.5"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </Select>
                  </FormGroup>

                  {requestAuthType === 'bearer' && (
                    <FormGroup label="Bearer Token">
                      <Input 
                        value={requestBearerToken} 
                        onChange={(e) => setRequestBearerToken(e.target.value)} 
                        placeholder="mapid-secret"
                        className="font-mono text-xs h-8.5"
                      />
                    </FormGroup>
                  )}

                  {requestAuthType === 'basic' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormGroup label="Username">
                        <Input 
                          value={requestBasicUsername} 
                          onChange={(e) => setRequestBasicUsername(e.target.value)} 
                          placeholder="e.g. admin"
                          className="text-xs h-8.5"
                        />
                      </FormGroup>
                      <FormGroup label="Password">
                        <Input 
                          type="password"
                          value={requestBasicPassword} 
                          onChange={(e) => setRequestBasicPassword(e.target.value)} 
                          placeholder="e.g. password"
                          className="text-xs h-8.5"
                        />
                      </FormGroup>
                    </div>
                  )}

                  {requestAuthType === 'apikey' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormGroup label="Key Name">
                        <Input 
                          value={requestApiKeyName} 
                          onChange={(e) => setRequestApiKeyName(e.target.value)} 
                          placeholder="e.g. X-API-KEY"
                          className="font-mono text-xs h-8.5"
                        />
                      </FormGroup>
                      <FormGroup label="Key Value">
                        <Input 
                          value={requestApiKeyValue} 
                          onChange={(e) => setRequestApiKeyValue(e.target.value)} 
                          placeholder="e.g. mapid-value"
                          className="font-mono text-xs h-8.5"
                        />
                      </FormGroup>
                    </div>
                  )}
                </div>
              )}

              {activeRequestSubtab === 'headers' && (
                <div className="space-y-4">
                  {requestHeaders.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3 py-1.5">Header Key</th>
                            <th className="px-3 py-1.5">Header Value</th>
                            <th className="px-3 py-1.5 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {requestHeaders.map((h, idx) => (
                            <tr key={idx} className="hover:bg-muted/5">
                              <td className="px-3 py-2 font-mono">{h.key}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{h.value}</td>
                              <td className="px-3 py-2 text-center">
                                <button 
                                  onClick={() => setRequestHeaders(requestHeaders.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex gap-3 text-xs items-end">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Header Key</span>
                      <Input value={newReqHeaderKey} onChange={(e) => setNewReqHeaderKey(e.target.value)} placeholder="e.g. Content-Type" className="h-8 text-xs" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Header Value</span>
                      <Input value={newReqHeaderVal} onChange={(e) => setNewReqHeaderVal(e.target.value)} placeholder="e.g. application/json" className="h-8 text-xs" />
                    </div>
                    <Button
                      onClick={() => {
                        if (!newReqHeaderKey.trim()) return;
                        setRequestHeaders([...requestHeaders, { key: newReqHeaderKey.trim(), value: newReqHeaderVal }]);
                        setNewReqHeaderKey('');
                        setNewReqHeaderVal('');
                      }}
                      size="sm"
                      className="cursor-pointer h-8 text-[11px] font-bold px-4"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {activeRequestSubtab === 'params' && (
                <div className="space-y-4">
                  {requestParams.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3 py-1.5">Param Key</th>
                            <th className="px-3 py-1.5">Param Value</th>
                            <th className="px-3 py-1.5 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {requestParams.map((p, idx) => (
                            <tr key={idx} className="hover:bg-muted/5">
                              <td className="px-3 py-2 font-mono">{p.key}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{p.value}</td>
                              <td className="px-3 py-2 text-center">
                                <button 
                                  onClick={() => setRequestParams(requestParams.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex gap-3 text-xs items-end">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Param Key</span>
                      <Input value={newReqParamKey} onChange={(e) => setNewReqParamKey(e.target.value)} placeholder="e.g. limit" className="h-8 text-xs" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Param Value</span>
                      <Input value={newReqParamVal} onChange={(e) => setNewReqParamVal(e.target.value)} placeholder="e.g. 50" className="h-8 text-xs" />
                    </div>
                    <Button
                      onClick={() => {
                        if (!newReqParamKey.trim()) return;
                        setRequestParams([...requestParams, { key: newReqParamKey.trim(), value: newReqParamVal }]);
                        setNewReqParamKey('');
                        setNewReqParamVal('');
                      }}
                      size="sm"
                      className="cursor-pointer h-8 text-[11px] font-bold px-4"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {activeRequestSubtab === 'body' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 font-semibold text-muted-foreground cursor-pointer">
                      <input type="radio" checked={requestBodyType === 'none'} onChange={() => setRequestBodyType('none')} />
                      None
                    </label>
                    <label className="flex items-center gap-1.5 font-semibold text-muted-foreground cursor-pointer">
                      <input type="radio" checked={requestBodyType === 'json'} onChange={() => setRequestBodyType('json')} />
                      Raw JSON
                    </label>
                    <label className="flex items-center gap-1.5 font-semibold text-muted-foreground cursor-pointer">
                      <input type="radio" checked={requestBodyType === 'urlencoded'} onChange={() => setRequestBodyType('urlencoded')} />
                      x-www-form-urlencoded
                    </label>
                  </div>

                  {requestBodyType !== 'none' && (
                    <FormGroup label={requestBodyType === 'json' ? 'Raw JSON String payload' : 'Raw Urlenoced query string (e.g. key1=val1&key2=val2)'}>
                      <Textarea
                        value={requestBodyContent}
                        onChange={(e) => setRequestBodyContent(e.target.value)}
                        placeholder={requestBodyType === 'json' ? '{\n  "email": "qa@mapid.io"\n}' : 'email=qa@mapid.io'}
                        rows={6}
                        className="font-mono text-xs"
                      />
                    </FormGroup>
                  )}
                </div>
              )}

              {activeRequestSubtab === 'settings' && (
                <div className="space-y-4 text-xs">
                  <FormGroup label="Connection Timeout (ms)">
                    <Input value={requestTimeout} onChange={(e) => setRequestTimeout(e.target.value)} type="number" className="h-8.5" />
                  </FormGroup>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Response details */}
          <div className="space-y-6">
            {!requestResponse ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground space-y-2">
                <Globe className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-semibold">Response Sandbox</p>
                <p className="text-xs">Fill in URL parameters above and click Send to visual response logs.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div className="border-b border-border pb-4 space-y-3">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">API Response</span>
                  
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`px-2 py-0.5 rounded ${
                      requestResponse.status >= 200 && requestResponse.status < 400 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {requestResponse.status} {requestResponse.statusText}
                    </span>
                    <span className="text-muted-foreground">{requestResponse.time} ms</span>
                    <span className="text-muted-foreground">{(requestResponse.size / 1024).toFixed(2)} KB</span>
                  </div>
                </div>

                {requestResponse.error && (
                  <div className="bg-red-500/5 border border-red-500/20 text-red-500 rounded-lg p-3 flex gap-2 font-semibold text-xs leading-relaxed">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span>Error details: {requestResponse.error}</span>
                  </div>
                )}

                {/* Quick actions panel */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Response Quick Actions</span>
                  <div className="flex flex-wrap gap-2">
                    {requestResponse.status >= 400 && (
                      <Button 
                        onClick={handleOpenIssueModalFromRequest}
                        size="sm"
                        className="cursor-pointer text-[10px] h-7 bg-red-500 hover:bg-red-600 font-bold gap-1"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Create Issue
                      </Button>
                    )}
                    <Button 
                      onClick={handleGenerateTestCase}
                      size="sm"
                      variant="outline"
                      className="cursor-pointer text-[10px] h-7 font-bold gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Generate Test Case
                    </Button>
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(playwrightCodeSnippet);
                        addToast('Playwright automation script copied!', 'success');
                      }}
                      size="sm"
                      variant="outline"
                      className="cursor-pointer text-[10px] h-7 font-bold gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Playwright Script
                    </Button>
                  </div>
                </div>

                {/* Body display */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Response Body</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(requestResponse.body);
                        addToast('Response body copied to clipboard!', 'success');
                      }}
                      className="text-primary hover:underline text-[10px] font-bold cursor-pointer"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-lg overflow-x-auto font-mono text-[10px] leading-relaxed max-h-[300px] text-left">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(requestResponse.body), null, 2);
                      } catch (e) {
                        return requestResponse.body || 'Empty Response';
                      }
                    })()}
                  </pre>
                </div>

                {/* AI Recommendations */}
                {requestAiAnalysis && requestAiAnalysis.length > 0 && (
                  <div className="border border-border/60 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Cpu className="h-4 w-4 text-indigo-500 animate-pulse" />
                      AI Sandbox Diagnostic Recommendations
                    </span>
                    <div className="space-y-2.5">
                      {requestAiAnalysis.map((ins, i) => (
                        <div key={i} className="text-xs leading-normal">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ins.severity === 'high' ? 'bg-red-500' : ins.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <p className="font-bold text-foreground">{ins.title}</p>
                          </div>
                          <p className="text-muted-foreground pl-3 mt-0.5 text-[11px]">{ins.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ENVIRONMENTS */}
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

      {/* TAB 5: AUTOMATION HISTORY */}
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

      {/* SAVE REQUEST TO COLLECTION DIALOG */}
      <Dialog
        isOpen={isSaveRequestOpen}
        onClose={() => setIsSaveRequestOpen(false)}
        title="Save Sandbox Request to Collection"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSaveRequestOpen(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveRequestSubmit} className="cursor-pointer text-xs font-bold">
              Save Request
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left text-xs">
          <FormGroup label="Request Name">
            <Input value={saveRequestName} onChange={(e) => setSaveRequestName(e.target.value)} placeholder="e.g. Get User details" />
          </FormGroup>

          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <input 
              type="checkbox" 
              checked={isCreatingNewColForSave} 
              onChange={() => setIsCreatingNewColForSave(!isCreatingNewColForSave)} 
              id="new-col-save-checkbox"
            />
            <label htmlFor="new-col-save-checkbox" className="font-bold text-foreground cursor-pointer">
              Save inside a new Collection container
            </label>
          </div>

          {isCreatingNewColForSave ? (
            <FormGroup label="New Collection Name">
              <Input value={newColNameForSave} onChange={(e) => setNewColNameForSave(e.target.value)} placeholder="e.g. User Profiles Scope" />
            </FormGroup>
          ) : (
            <FormGroup label="Target Collection">
              <Select value={saveTargetColId} onChange={(e) => setSaveTargetColId(e.target.value)}>
                <option value="" disabled>Select target...</option>
                {projectCollections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormGroup>
          )}
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
