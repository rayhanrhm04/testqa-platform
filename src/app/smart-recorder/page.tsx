'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Video, Plus, Trash2, Copy, Download, RefreshCw, FileCode, CheckCircle, 
  Play, Square, ExternalLink, HelpCircle, Layers, FileCode2, Terminal, AlertTriangle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RecorderSession, RecorderStep, TestCase } from '@/lib/validators';

export default function SmartRecorderPage() {
  const { 
    recorderSessions, 
    recorderSteps, 
    projects, 
    testSuites,
    addRecorderSession,
    updateRecorderSession,
    deleteRecorderSession,
    addRecorderStep,
    updateRecorderStep,
    deleteRecorderStep,
    convertSessionToTestCase
  } = useDataStore();

  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  // Navigation states
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<RecorderSession | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Script and preview states
  const [selectedFramework, setSelectedFramework] = React.useState<'playwright' | 'cypress' | 'selenium'>('playwright');
  const [isConverting, setIsConverting] = React.useState(false);
  const [targetSuite, setTargetSuite] = React.useState('');

  // Recording config form
  const [title, setTitle] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [suiteId, setSuiteId] = React.useState('');
  const [browser, setBrowser] = React.useState('Chrome');
  const [environment, setEnvironment] = React.useState('Staging');
  const [startUrl, setStartUrl] = React.useState('https://');

  // Elapsed timer state
  const [seconds, setSeconds] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync suites filter
  const suitesFiltered = React.useMemo(() => {
    return testSuites.filter(s => s.project_id === projectId);
  }, [testSuites, projectId]);

  // Set default project mapping
  React.useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Sync suites defaults
  React.useEffect(() => {
    if (suitesFiltered.length > 0) {
      setSuiteId(suitesFiltered[0].id);
    } else {
      setSuiteId('');
    }
  }, [suitesFiltered]);

  // Start recording timer
  React.useEffect(() => {
    if (activeSession && activeSession.status === 'Recording') {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!title.trim() || !startUrl.trim()) {
      addToast('Title and Start URL are required.', 'warning');
      return;
    }
    try {
      const sess = await addRecorderSession({
        title,
        project_id: projectId,
        suite_id: suiteId || null,
        case_id: null,
        browser,
        environment,
        start_url: startUrl,
      });

      if (sess) {
        // Automatically set session to recording status
        await updateRecorderSession(sess.id, { status: 'Recording' });
        const updatedSess = { ...sess, status: 'Recording' as const };
        setActiveSession(updatedSess);
        
        // Add initial navigate step
        await addRecorderStep({
          session_id: sess.id,
          step_number: 1,
          action_type: 'Navigate',
          target_element: 'Browser',
          value: startUrl,
          notes: 'Initial navigation page load',
        });

        setIsConfigOpen(false);
        addToast('Interactive Recording Session started!', 'success');
      }
    } catch (e) {
      addToast('Failed to initialize session.', 'error');
    }
  };

  const handleStopRecording = async () => {
    if (!activeSession) return;
    try {
      await updateRecorderSession(activeSession.id, { status: 'Completed' });
      setActiveSession(null);
      addToast('Recording completed! Code templates and AI analysis compiled.', 'success');
    } catch (e) {
      addToast('Failed to complete session.', 'error');
    }
  };

  const handleAddStep = async (type: any) => {
    if (!activeSession) return;
    const sessionSteps = recorderSteps.filter(st => st.session_id === activeSession.id);
    const nextNum = sessionSteps.length + 1;

    let defaultVal = '';
    let defaultTarget = '';
    let defaultNotes = '';

    if (type === 'Navigate') {
      defaultVal = 'https://';
      defaultTarget = 'URL Path';
    } else if (type === 'Click') {
      defaultTarget = 'button[type=submit]';
      defaultNotes = 'Click target button';
    } else if (type === 'Input') {
      defaultTarget = '#input-field';
      defaultVal = 'Test Input Value';
    } else if (type === 'Assert') {
      defaultTarget = '.alert-success';
      defaultVal = 'Success Message displays';
    }

    await addRecorderStep({
      session_id: activeSession.id,
      step_number: nextNum,
      action_type: type,
      target_element: defaultTarget,
      value: defaultVal,
      notes: defaultNotes,
    });
  };

  const handleStepChange = async (stepId: string, fields: Partial<RecorderStep>) => {
    await updateRecorderStep(stepId, fields);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, stepId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast("File size too large (Max 2MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateRecorderStep(stepId, {
        attachment_url: base64,
        attachment_name: file.name,
      });
      addToast(`Evidence ${file.name} uploaded!`, "success");
    };
    reader.readAsDataURL(file);
  };

  const handleClearEvidence = (stepId: string) => {
    updateRecorderStep(stepId, {
      attachment_url: null,
      attachment_name: null,
    });
  };

  // Compile Code scripts
  const generateScript = (sess: RecorderSession) => {
    const steps = recorderSteps
      .filter(s => s.session_id === sess.id)
      .sort((a, b) => a.step_number - b.step_number);

    if (selectedFramework === 'playwright') {
      let code = `import { test, expect } from '@playwright/test';\n\n`;
      code += `test('Smart Recorder: ${sess.title}', async ({ page }) => {\n`;
      code += `  // Environment: ${sess.environment} | Browser: ${sess.browser}\n`;
      steps.forEach((st) => {
        code += `  // Step ${st.step_number}: ${st.action_type}\n`;
        switch (st.action_type) {
          case 'Navigate':
            code += `  await page.goto('${st.value || sess.start_url}');\n`;
            break;
          case 'Click':
            code += `  await page.locator('${st.target_element || 'button'}').click();\n`;
            break;
          case 'Input':
            code += `  await page.locator('${st.target_element || 'input'}').fill('${st.value || ''}');\n`;
            break;
          case 'Dropdown':
            code += `  await page.locator('${st.target_element || 'select'}').selectOption('${st.value || ''}');\n`;
            break;
          case 'Upload':
            code += `  await page.locator('${st.target_element || 'input[type=file]'}').setInputFiles('${st.attachment_name || 'file.txt'}');\n`;
            break;
          case 'Scroll':
            code += `  await page.evaluate(() => window.scrollBy(0, 500));\n`;
            break;
          case 'Assert':
            code += `  await expect(page.locator('${st.target_element || 'body'}')).toBeVisible();\n`;
            break;
          default:
            code += `  // ${st.notes || 'Custom Step Execution'}\n`;
        }
      });
      code += `});\n`;
      return code;
    } else if (selectedFramework === 'cypress') {
      let code = `describe('Smart Recorder: ${sess.title}', () => {\n`;
      code += `  it('executes recorded steps', () => {\n`;
      code += `    // Environment: ${sess.environment} | Browser: ${sess.browser}\n`;
      steps.forEach((st) => {
        code += `    // Step ${st.step_number}: ${st.action_type}\n`;
        switch (st.action_type) {
          case 'Navigate':
            code += `    cy.visit('${st.value || sess.start_url}');\n`;
            break;
          case 'Click':
            code += `    cy.get('${st.target_element || 'button'}').click();\n`;
            break;
          case 'Input':
            code += `    cy.get('${st.target_element || 'input'}').type('${st.value || ''}');\n`;
            break;
          case 'Dropdown':
            code += `    cy.get('${st.target_element || 'select'}').select('${st.value || ''}');\n`;
            break;
          case 'Upload':
            code += `    cy.get('${st.target_element || 'input[type=file]'}').selectFile('${st.attachment_name || 'file.txt'}');\n`;
            break;
          case 'Scroll':
            code += `    cy.scrollTo('bottom');\n`;
            break;
          case 'Assert':
            code += `    cy.get('${st.target_element || 'body'}').should('be.visible');\n`;
            break;
          default:
            code += `    // ${st.notes || 'Custom Step Execution'}\n`;
        }
      });
      code += `  });\n`;
      code += `});\n`;
      return code;
    } else {
      let code = `const { Builder, By, Key, until } = require('selenium-webdriver');\n\n`;
      code += `(async function execute() {\n`;
      code += `  let driver = await new Builder().forBrowser('chrome').build();\n`;
      code += `  try {\n`;
      code += `    // Environment: ${sess.environment} | Browser: ${sess.browser}\n`;
      steps.forEach((st) => {
        code += `    // Step ${st.step_number}: ${st.action_type}\n`;
        switch (st.action_type) {
          case 'Navigate':
            code += `    await driver.get('${st.value || sess.start_url}');\n`;
            break;
          case 'Click':
            code += `    await driver.findElement(By.css('${st.target_element || 'button'}')).click();\n`;
            break;
          case 'Input':
            code += `    await driver.findElement(By.css('${st.target_element || 'input'}')).sendKeys('${st.value || ''}');\n`;
            break;
          case 'Dropdown':
            code += `    await driver.findElement(By.css('${st.target_element || 'select'}')).sendKeys('${st.value || ''}');\n`;
            break;
          case 'Upload':
            code += `    await driver.findElement(By.css('${st.target_element || 'input[type=file]'}')).sendKeys('${st.attachment_name || 'file.txt'}');\n`;
            break;
          case 'Scroll':
            code += `    await driver.executeScript("window.scrollBy(0, 500)");\n`;
            break;
          case 'Assert':
            code += `    await driver.wait(until.elementLocated(By.css('${st.target_element || 'body'}')), 5000);\n`;
            break;
          default:
            code += `    // ${st.notes || 'Custom Step Execution'}\n`;
        }
      });
      code += `  } finally {\n`;
      code += `    await driver.quit();\n`;
      code += `  }\n`;
      code += `})();\n`;
      return code;
    }
  };

  // Compile AI suggestions dynamically
  const generateAISuggestions = (sess: RecorderSession) => {
    const steps = recorderSteps.filter(s => s.session_id === sess.id);
    const suggestions: { type: string; title: string; desc: string }[] = [];

    // Analyze target elements & values
    const hasLogin = steps.some(st => {
      const trg = (st.target_element || '').toLowerCase();
      const val = (st.value || '').toLowerCase();
      return trg.includes('login') || trg.includes('password') || trg.includes('email') || val.includes('login') || val.includes('admin');
    });

    const hasNumbers = steps.some(st => {
      const trg = (st.target_element || '').toLowerCase();
      return trg.includes('number') || trg.includes('amount') || trg.includes('price') || trg.includes('quantity') || trg.includes('phone');
    });

    const hasUpload = steps.some(st => st.action_type === 'Upload');
    const hasClick = steps.some(st => st.action_type === 'Click');

    if (hasLogin) {
      suggestions.push({
        type: 'Negative Testing',
        title: 'Authentication Format validation',
        desc: 'Verify response and client-side alerts when submitting email fields with invalid syntax (e.g. user@, missing domain, special character injections).'
      });
      suggestions.push({
        type: 'Edge Case',
        title: 'Session Timeout Lifecycle',
        desc: 'Ensure session cookies expire properly and the user is redirected back to the login page immediately upon attempting retro-actions after expiration.'
      });
      suggestions.push({
        type: 'Security Case',
        title: 'Credential Injection Prevention',
        desc: 'Inject simple SQL command payloads (e.g. `\' OR \'1\'=\'1`) into the credential fields to confirm the application escapes input strings properly.'
      });
    }

    if (hasNumbers) {
      suggestions.push({
        type: 'Boundary Value',
        title: 'Zero and Negative Quantities',
        desc: 'Test forms mapping by submitting negative amounts (-10) or empty values. Form validation should restrict submit triggers.'
      });
      suggestions.push({
        type: 'Edge Case',
        title: 'Numeric overflow limits',
        desc: 'Insert values exceeding double float limits or extremely long numeric streams in the mapped fields to verify database robustness.'
      });
    }

    if (hasUpload) {
      suggestions.push({
        type: 'Boundary Value',
        title: 'Upload Size limits validation',
        desc: 'Test uploading file sizes exceeding 10MB to verify that appropriate file size constraint warning notifications display.'
      });
      suggestions.push({
        type: 'Negative Testing',
        title: 'Restricted Extensions filter',
        desc: 'Attempt uploading executable files (e.g., .exe, .bat, .sh) and verify the browser filters reject the files safely.'
      });
    }

    if (hasClick) {
      suggestions.push({
        type: 'Edge Case',
        title: 'Double Submit clicking resistance',
        desc: 'Rapidly double-click submit buttons to verify request throttling holds and prevents redundant duplicate transactions in database storage.'
      });
    }

    // Default suggestions
    suggestions.push({
      type: 'Compatibility',
      title: 'Responsive scales & Layouts',
      desc: 'Verify step workflows execute cleanly when browser width is throttled to 375px (standard mobile scales) to check drawer menus.'
    });

    suggestions.push({
      type: 'Robustness',
      title: 'Offline mode status recovery',
      desc: 'Disconnect network adapter mid-flow and verify error notification states render helper messages correctly.'
    });

    return suggestions;
  };

  const handleCopyCode = (sess: RecorderSession) => {
    const code = generateScript(sess);
    navigator.clipboard.writeText(code);
    addToast('Script copied to clipboard!', 'success');
  };

  const handleDownloadCode = (sess: RecorderSession) => {
    const code = generateScript(sess);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    let ext = '.js';
    if (selectedFramework === 'playwright') ext = '.spec.js';
    else if (selectedFramework === 'cypress') ext = '.cy.js';
    
    link.href = url;
    link.download = `${sess.title.toLowerCase().replace(/\s+/g, '-')}${ext}`;
    link.click();
    addToast('Script downloaded successfully!', 'success');
  };

  const handleConvertClick = (sess: RecorderSession) => {
    const filteredSuites = testSuites.filter(s => s.project_id === sess.project_id);
    if (filteredSuites.length > 0) {
      setTargetSuite(filteredSuites[0].id);
    } else {
      setTargetSuite('');
    }
    setIsConverting(true);
  };

  const handleConvertSubmit = async (sessId: string) => {
    if (!targetSuite) {
      addToast('Please select a target Test Suite.', 'warning');
      return;
    }
    try {
      await convertSessionToTestCase(sessId, targetSuite);
      setIsConverting(false);
      addToast('Smart Recorder session converted to standard Test Case successfully!', 'success');
    } catch (e) {
      addToast('Failed to convert session.', 'error');
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredSessions = React.useMemo(() => {
    return recorderSessions.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.browser.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.environment.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recorderSessions, searchQuery]);

  return (
    <div className="space-y-6 text-left">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Smart Recorder
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Record manual steps interactively to build Test Cases, AI Edge suggestions, and automation scripts instantly.
          </p>
        </div>
        {!activeSession && (
          <Button 
            onClick={() => {
              setTitle('');
              setStartUrl('https://');
              setIsConfigOpen(true);
            }} 
            className="cursor-pointer text-xs font-bold gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Recording
          </Button>
        )}
      </div>

      {/* ACTIVE RECORDING WORKSPACE */}
      {activeSession && (
        <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden shadow-sm">
          {/* Workspace Status Bar */}
          <div className="bg-red-500/5 border-b border-red-500/10 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">Active Session: {activeSession.title}</h3>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                  <span>Browser: <strong className="text-foreground">{activeSession.browser}</strong></span>
                  <span>Environment: <strong className="text-foreground">{activeSession.environment}</strong></span>
                  <a href={activeSession.start_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                    URL: {activeSession.start_url}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="font-mono text-sm bg-zinc-100 dark:bg-zinc-900 border border-border px-3 py-1 rounded-md text-foreground font-bold">
                {formatDuration(seconds)}
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleStopRecording} 
                className="cursor-pointer text-xs font-bold gap-1"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop Recording
              </Button>
            </div>
          </div>

          {/* Interactive Steps Builder Workspace */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Log Testing Event Action</h4>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleAddStep('Navigate')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  🌐 Navigate
                </button>
                <button onClick={() => handleAddStep('Click')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  🖱️ Click Element
                </button>
                <button onClick={() => handleAddStep('Input')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  ⌨️ Input Text
                </button>
                <button onClick={() => handleAddStep('Dropdown')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  🗂️ Dropdown Value
                </button>
                <button onClick={() => handleAddStep('Upload')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  📂 Upload File
                </button>
                <button onClick={() => handleAddStep('Scroll')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  📜 Scroll Page
                </button>
                <button onClick={() => handleAddStep('Assert')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  ✅ Assertion Verify
                </button>
                <button onClick={() => handleAddStep('Custom')} className="px-3 py-1.5 border border-border rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground cursor-pointer transition-colors">
                  ➕ Custom Step
                </button>
              </div>
            </div>

            {/* Editable Steps list table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recorded Steps Checklist</h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">No</th>
                      <th className="px-4 py-2.5 w-32">Action Type</th>
                      <th className="px-4 py-2.5 w-48">Target Selector / Label</th>
                      <th className="px-4 py-2.5 w-48">Input Value / Expected</th>
                      <th className="px-4 py-2.5">Catatan / Keterangan</th>
                      <th className="px-4 py-2.5 w-48">Evidence (Screenshot)</th>
                      <th className="px-4 py-2.5 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recorderSteps
                      .filter(s => s.session_id === activeSession.id)
                      .sort((a, b) => a.step_number - b.step_number)
                      .map((st) => (
                        <tr key={st.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-center font-bold text-muted-foreground">{st.step_number}</td>
                          <td className="px-4 py-3">
                            <Select 
                              value={st.action_type} 
                              onChange={(e: any) => handleStepChange(st.id, { action_type: e.target.value })}
                              className="h-7 text-xs py-0"
                            >
                              <option value="Navigate">Navigate</option>
                              <option value="Click">Click</option>
                              <option value="Input">Input</option>
                              <option value="Dropdown">Dropdown</option>
                              <option value="Upload">Upload</option>
                              <option value="Scroll">Scroll</option>
                              <option value="Assert">Assert</option>
                              <option value="Custom">Custom</option>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              value={st.target_element || ''} 
                              onChange={(e) => handleStepChange(st.id, { target_element: e.target.value })}
                              placeholder="e.g. #login-btn"
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              value={st.value || ''} 
                              onChange={(e) => handleStepChange(st.id, { value: e.target.value })}
                              placeholder="e.g. admin@mapid.io"
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              value={st.notes || ''} 
                              onChange={(e) => handleStepChange(st.id, { notes: e.target.value })}
                              placeholder="Keterangan langkah..."
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5">
                              {st.attachment_name ? (
                                <div className="flex items-center justify-between gap-2 border border-border bg-zinc-50 dark:bg-zinc-900/20 px-2 py-0.5 rounded text-[10px]">
                                  <span className="truncate max-w-[100px] font-semibold">{st.attachment_name}</span>
                                  <button onClick={() => handleClearEvidence(st.id)} className="text-red-500 hover:text-red-600 font-bold cursor-pointer">
                                    Clear
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center gap-1 border border-dashed border-border hover:border-primary/40 rounded px-2 py-1 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-bold text-foreground cursor-pointer transition-colors justify-center">
                                  <span>+ Evidence</span>
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => handleFileChange(e, st.id)}
                                    accept="image/*"
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => deleteRecorderStep(st.id)}
                              className="text-red-500 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL SESSIONS & COMPLETED WORKSPACE */}
      {!activeSession && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left / Mid: Recording List & Workspace Detail */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-4">
                <h3 className="text-sm font-bold text-foreground">Recording History</h3>
                <div className="w-full sm:w-64">
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sessions..." 
                    className="h-8.5 text-xs" 
                  />
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Video className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-semibold">No recording sessions found</p>
                  <p className="text-xs">Create a new session to begin recording steps.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSessions.map((sess) => {
                    const sessionSteps = recorderSteps.filter(s => s.session_id === sess.id);
                    return (
                      <div key={sess.id} className="border border-border hover:border-primary/20 rounded-xl p-5 hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10 transition-all flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-foreground">{sess.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                                {projects.find(p => p.id === sess.project_id)?.name || 'Project'}
                              </span>
                              <span>Browser: <strong className="text-foreground">{sess.browser}</strong></span>
                              <span>Env: <strong className="text-foreground">{sess.environment}</strong></span>
                              <span>Steps: <strong className="text-foreground">{sessionSteps.length} items</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleConvertClick(sess)}
                              className="cursor-pointer text-[10px] font-bold py-1 h-7 text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/20"
                            >
                              Convert to TC
                            </Button>
                            <button 
                              onClick={() => deleteRecorderSession(sess.id)}
                              className="text-red-500 hover:bg-red-500/5 p-1 rounded transition-colors cursor-pointer"
                              title="Delete Session"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Accordion / Workspace detail section */}
                        <div className="border-t border-border/40 pt-4 grid gap-6 md:grid-cols-2">
                          {/* Script Preview & Config */}
                          <div className="space-y-3 bg-zinc-50/40 dark:bg-zinc-900/20 p-4 border border-border/60 rounded-xl">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                <FileCode className="h-3.5 w-3.5 text-primary" />
                                Automation Script
                              </span>
                              <div className="flex gap-1">
                                {['playwright', 'cypress', 'selenium'].map((fw) => (
                                  <button
                                    key={fw}
                                    onClick={() => setSelectedFramework(fw as any)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold capitalize transition-all cursor-pointer ${
                                      selectedFramework === fw 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-zinc-200/50 dark:bg-zinc-800 text-muted-foreground'
                                    }`}
                                  >
                                    {fw}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <pre className="text-[10px] leading-normal font-mono bg-zinc-900 text-zinc-100 p-3 rounded-lg overflow-x-auto max-h-[160px] border border-zinc-800 select-all whitespace-pre text-left">
                              {generateScript(sess)}
                            </pre>

                            <div className="flex justify-end gap-2 pt-1.5">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCopyCode(sess)}
                                className="cursor-pointer text-[10px] font-bold py-1 h-7 gap-1"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy Code
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDownloadCode(sess)}
                                className="cursor-pointer text-[10px] font-bold py-1 h-7 gap-1"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Export Script
                              </Button>
                            </div>
                          </div>

                          {/* AI Suggestions analytics */}
                          <div className="space-y-3 bg-zinc-50/40 dark:bg-zinc-900/20 p-4 border border-border/60 rounded-xl">
                            <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                                AI Test Scenarios Recommendations
                              </span>
                              <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ml-auto">
                                Analysis Active
                              </span>
                            </div>

                            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                              {generateAISuggestions(sess).map((sug, i) => (
                                <div key={i} className="text-[10px] space-y-0.5 border border-border/40 p-2 rounded-lg bg-white dark:bg-zinc-950">
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-zinc-100 dark:bg-zinc-900 text-muted-foreground font-black px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide">
                                      {sug.type}
                                    </span>
                                    <span className="font-bold text-foreground truncate">{sug.title}</span>
                                  </div>
                                  <p className="text-muted-foreground leading-normal mt-1">{sug.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Informational Tutorial card */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                  <HelpCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Smart Recorder Guide</h3>
                  <span className="text-[10px] text-muted-foreground">Learn how to capture manual scripts</span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex gap-2">
                  <span className="font-bold text-primary bg-primary/10 h-5 w-5 rounded-full flex items-center justify-center shrink-0">1</span>
                  <p className="text-muted-foreground">Click **New Recording** to set mapping metadata (Project, Suite, Start URL).</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-primary bg-primary/10 h-5 w-5 rounded-full flex items-center justify-center shrink-0">2</span>
                  <p className="text-muted-foreground">Use the Action Bar tool to quickly inject events (Navigate, Click, Input) as you execute them.</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-primary bg-primary/10 h-5 w-5 rounded-full flex items-center justify-center shrink-0">3</span>
                  <p className="text-muted-foreground">Upload screenshots directly to step rows to capture UI defects or page confirmations.</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-primary bg-primary/10 h-5 w-5 rounded-full flex items-center justify-center shrink-0">4</span>
                  <p className="text-muted-foreground">Click **Stop Recording**. You can copy Cypress/Playwright scripts or convert to a standard Test Case!</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Coverage Summary</span>
              <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                <span className="text-muted-foreground font-semibold">Total Sessions</span>
                <span className="font-bold text-foreground">{recorderSessions.length} records</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Associated Suite TC</span>
                <span className="font-bold text-foreground">
                  {recorderSessions.filter(s => s.case_id).length} converted
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESSION SETUP CONFIG DIALOG */}
      <Dialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Start Smart Recorder Session"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleStartSession} className="cursor-pointer text-xs font-bold">
              Start Session
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <FormGroup label="Session Title">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Login Flow and Profile Update Verification" 
            />
          </FormGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Project Mapping">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Test Suite Target (Optional)">
              <Select value={suiteId} onChange={(e) => setSuiteId(e.target.value)}>
                <option value="">No Suite Mapping</option>
                {suitesFiltered.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </FormGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Browser Engine">
              <Select value={browser} onChange={(e) => setBrowser(e.target.value)}>
                <option value="Chrome">Google Chrome</option>
                <option value="Firefox">Mozilla Firefox</option>
                <option value="Safari">Webkit Safari</option>
                <option value="Edge">Microsoft Edge</option>
              </Select>
            </FormGroup>

            <FormGroup label="Environment Target">
              <Select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                <option value="Staging">Staging Server</option>
                <option value="Production">Production Server</option>
                <option value="Development">Development (Localhost)</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Starting URL Link">
            <Input 
              value={startUrl} 
              onChange={(e) => setStartUrl(e.target.value)} 
              placeholder="e.g. https://portal.mapid.io/login" 
            />
          </FormGroup>
        </div>
      </Dialog>

      {/* CONVERT TO TEST CASE SUITE MAP MODAL */}
      <Dialog
        isOpen={isConverting}
        onClose={() => setIsConverting(false)}
        title="Convert Session to Test Case"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsConverting(false)} className="cursor-pointer text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={() => handleConvertSubmit(recorderSessions[0]?.id)} className="cursor-pointer text-xs font-bold">
              Confirm & Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-muted-foreground">
            This action parses all recorded steps (such as click triggers and value assertions) and formats them into a clean, markdown-friendly TestCase list.
          </p>
          <FormGroup label="Target Test Suite Mapping">
            <Select value={targetSuite} onChange={(e) => setTargetSuite(e.target.value)}>
              {testSuites.map(ts => (
                <option key={ts.id} value={ts.id}>{projects.find(p => p.id === ts.project_id)?.name} - {ts.name}</option>
              ))}
            </Select>
          </FormGroup>
        </div>
      </Dialog>
    </div>
  );
}
