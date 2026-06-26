'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { FolderPlus, Search, Edit, Trash2, ShieldAlert, Folder, FolderDown, FolderUp, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { parseSteps } from '@/lib/validators';

// Helper functions to normalize Qase fields to platform values
const normalizeStatus = (val?: string): 'Actual' | 'Draft' | 'Deprecated' => {
  if (!val) return 'Actual';
  const lower = val.toLowerCase();
  if (lower === 'draft') return 'Draft';
  if (lower === 'deprecated') return 'Deprecated';
  return 'Actual';
};

const normalizeSeverity = (val?: string): 'Normal' | 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial' => {
  if (!val) return 'Normal';
  const lower = val.toLowerCase();
  if (lower === 'blocker') return 'Blocker';
  if (lower === 'critical') return 'Critical';
  if (lower === 'major') return 'Major';
  if (lower === 'minor') return 'Minor';
  if (lower === 'trivial') return 'Trivial';
  return 'Normal';
};

const normalizePriority = (val?: string): 'Not set' | 'High' | 'Medium' | 'Low' => {
  if (!val) return 'Not set';
  const lower = val.toLowerCase().replace('_', ' ');
  if (lower === 'high') return 'High';
  if (lower === 'medium') return 'Medium';
  if (lower === 'low') return 'Low';
  return 'Not set';
};

const normalizeLayer = (val?: string): 'Not set' | 'E2E' | 'API' | 'Unit' => {
  if (!val) return 'Not set';
  const lower = val.toLowerCase().replace('_', ' ');
  if (lower === 'e2e' || lower === 'end-to-end' || lower === 'end_to_end') return 'E2E';
  if (lower === 'api') return 'API';
  if (lower === 'unit') return 'Unit';
  return 'Not set';
};

const normalizeBehavior = (val?: string): 'Not set' | 'Positive' | 'Negative' | 'Destructive' => {
  if (!val) return 'Not set';
  const lower = val.toLowerCase().replace('_', ' ');
  if (lower === 'positive') return 'Positive';
  if (lower === 'negative') return 'Negative';
  if (lower === 'destructive') return 'Destructive';
  return 'Not set';
};

const countCasesRecursively = (suites: any[]): number => {
  let count = 0;
  for (const s of suites) {
    if (Array.isArray(s.cases)) {
      count += s.cases.length;
    }
    if (Array.isArray(s.suites)) {
      count += countCasesRecursively(s.suites);
    }
  }
  return count;
};

export default function TestSuitesPage() {
  const router = useRouter();
  const { testSuites, projects, projectShares, addTestSuite, updateTestSuite, deleteTestSuite, testCases, addTestCase } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [search, setSearch] = React.useState('');
  const [projectFilter, setProjectFilter] = React.useState('all');
  
  // Dialog state
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingSuite, setEditingSuite] = React.useState<any | null>(null);
  
  // Form states
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [projectId, setProjectId] = React.useState('');

  // Import state
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importProjectId, setImportProjectId] = React.useState('');
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importPreview, setImportPreview] = React.useState<any | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleProjectFilterChange = (projId: string) => {
    setProjectFilter(projId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (projId === 'all') {
        url.searchParams.delete('project');
      } else {
        url.searchParams.set('project', projId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Sync projectFilter with query parameters on load
  React.useEffect(() => {
    if (accessibleProjects.length > 0) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const projectParam = params.get('project');
        if (projectParam && accessibleProjects.some(p => p.id === projectParam)) {
          setProjectFilter(projectParam);
        }
      }
    }
  }, [accessibleProjects]);

  React.useEffect(() => {
    if (isOpen) {
      if (editingSuite) {
        setName(editingSuite.name);
        setDescription(editingSuite.description || '');
        setProjectId(editingSuite.project_id);
      } else {
        setName('');
        setDescription('');
        setProjectId(projectFilter !== 'all' ? projectFilter : (projects[0]?.id || ''));
      }
    }
  }, [editingSuite, projects, isOpen, projectFilter]);

  const canModifyProject = React.useCallback((projId: string) => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === projId);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser?.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, currentUser]);

  const canCreateAnySuite = React.useMemo(() => {
    if (!currentUser) return true;
    return accessibleProjects.some(p => canModifyProject(p.id));
  }, [currentUser, accessibleProjects, canModifyProject]);

  const canModifySuite = React.useCallback((projId: string) => {
    if (!currentUser) return true;
    return canModifyProject(projId);
  }, [currentUser, canModifyProject]);

  const filteredSuites = React.useMemo(() => {
    return testSuites.filter((suite) => {
      const isProjAccessible = accessibleProjects.some(p => p.id === suite.project_id);
      if (!isProjAccessible) return false;

      const matchSearch = suite.name.toLowerCase().includes(search.toLowerCase()) || 
                          (suite.description && suite.description.toLowerCase().includes(search.toLowerCase()));
      const matchProject = projectFilter === 'all' || suite.project_id === projectFilter;
      return matchSearch && matchProject;
    });
  }, [testSuites, search, projectFilter, accessibleProjects]);

  const handleSubmit = async () => {
    if (!name.trim() || !projectId) {
      addToast('Suite Name and Project are required.', 'warning');
      return;
    }
    try {
      if (editingSuite) {
        await updateTestSuite(editingSuite.id, name, description);
        addToast(`Suite "${name}" updated!`, 'success');
      } else {
        await addTestSuite(projectId, name, description);
        addToast(`Suite "${name}" created successfully!`, 'success');
      }
      setIsOpen(false);
      setEditingSuite(null);
    } catch (e) {
      addToast('Failed to save suite.', 'error');
    }
  };

  const handleExport = (suite: any) => {
    const suiteCases = testCases.filter((tc) => tc.suite_id === suite.id);
    const cleanCases = suiteCases.map((tc, tcIdx) => {
      const parsedSteps = parseSteps(
        Array.isArray(tc.steps) ? JSON.stringify(tc.steps) : tc.steps,
        tc.expected_result
      ).map((s, idx) => ({
        position: idx + 1,
        action: s.action || '',
        expected_result: s.expected_result || '',
        data: s.data || '',
        steps: []
      }));

      return {
        id: tcIdx + 1,
        title: tc.title,
        description: tc.description || null,
        preconditions: tc.precondition || '',
        postconditions: tc.post_condition || '',
        steps: parsedSteps,
        priority: String(tc.priority || 'Not set').toLowerCase() === 'not set' ? 'undefined' : String(tc.priority).toLowerCase(),
        severity: String(tc.severity || 'Normal').toLowerCase(),
        type: String(tc.type || 'Other').toLowerCase(),
        behavior: String(tc.behavior || 'Not set').toLowerCase() === 'not set' ? 'undefined' : String(tc.behavior).toLowerCase(),
        automation: tc.is_automated ? 'automated' : 'is-not-automated',
        status: String(tc.status || 'Actual').toLowerCase(),
        is_flaky: tc.is_flaky ? 'yes' : 'no',
        layer: String(tc.layer || 'Not set').toLowerCase() === 'not set' ? 'undefined' : String(tc.layer).toLowerCase(),
        milestone: null,
        custom_fields: [],
        steps_type: 'classic',
        tags: tc.tags || [],
        params: [],
        is_muted: tc.is_muted ? 'yes' : 'no'
      };
    });

    const exportData = {
      suites: [
        {
          id: 1,
          title: suite.name,
          description: suite.description || null,
          preconditions: '',
          suites: [],
          cases: cleanCases
        }
      ]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${suite.name.toLowerCase().replace(/\s+/g, '_')}_suite_export.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Suite "${suite.name}" exported to Qase.io JSON format!`, 'success');
  };

  const handleExportExcel = (suite: any) => {
    const suiteCases = testCases.filter((tc) => tc.suite_id === suite.id);
    
    // Build CSV content
    const headers = [
      'Test Id', 'Test Case Description', 'Pre condition', 'Test Data', 
      'Test Steps', 'Expected Result', 'Status', 'Positive/Negative Case'
    ];
    
    const rows = suiteCases.map((tc) => {
      let formattedSteps = '';
      let formattedExpected = tc.expected_result || '';
      
      if (tc.steps) {
        try {
          const parsed = JSON.parse(tc.steps);
          if (Array.isArray(parsed)) {
            // Format steps: numbered list of actions
            formattedSteps = parsed
              .map((s: any) => s.action || '')
              .filter((action) => action.trim().length > 0)
              .map((action, idx) => `${idx + 1}. ${action}`)
              .join('\n');
            
            // Format expected results: numbered list of step expected results
            const stepExpecteds = parsed
              .map((s: any) => s.expected_result || '')
              .filter((exp) => exp.trim().length > 0)
              .map((exp, idx) => `${idx + 1}. ${exp}`)
              .join('\n');
              
            if (stepExpecteds) {
              formattedExpected = stepExpecteds;
            }
          }
        } catch (e) {
          formattedSteps = tc.steps;
        }
      }

      return [
        tc.code,
        tc.title,
        tc.precondition || '',
        tc.test_data || '',
        formattedSteps,
        formattedExpected,
        tc.status?.toUpperCase() || 'PASS',
        tc.behavior && tc.behavior !== 'Not set' ? tc.behavior.toUpperCase() : 'POSITIVE'
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Add UTF-8 BOM to ensure Excel opens special characters correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${suite.name.toLowerCase().replace(/\s+/g, '_')}_suite_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Suite "${suite.name}" exported to Excel successfully!`, 'success');
  };

  const handleExportAll = () => {
    const activeSuites = testSuites.filter((suite) => {
      const matchProject = projectFilter === 'all' || suite.project_id === projectFilter;
      const matchSearch = suite.name.toLowerCase().includes(search.toLowerCase()) || 
                          (suite.description && suite.description.toLowerCase().includes(search.toLowerCase()));
      return matchProject && matchSearch;
    });

    if (activeSuites.length === 0) {
      addToast('No test suites found to export.', 'warning');
      return;
    }

    const suitesExport = activeSuites.map((suite, idx) => {
      const suiteCases = testCases.filter((tc) => tc.suite_id === suite.id);
      
      const cleanCases = suiteCases.map((tc, tcIdx) => {
        const parsedSteps = parseSteps(
          Array.isArray(tc.steps) ? JSON.stringify(tc.steps) : tc.steps,
          tc.expected_result
        ).map((s, stepIdx) => ({
          position: stepIdx + 1,
          action: s.action || '',
          expected_result: s.expected_result || '',
          data: s.data || '',
          steps: []
        }));

        return {
          id: (idx * 1000) + tcIdx + 1,
          title: tc.title,
          description: tc.description || null,
          preconditions: tc.precondition || '',
          postconditions: tc.post_condition || '',
          steps: parsedSteps,
          priority: String(tc.priority || 'Not set').toLowerCase() === 'not set' ? 'undefined' : String(tc.priority).toLowerCase(),
          severity: String(tc.severity || 'Normal').toLowerCase(),
          type: String(tc.type || 'Other').toLowerCase(),
          behavior: String(tc.behavior || 'Not set').toLowerCase() === 'not set' ? 'undefined' : String(tc.behavior).toLowerCase(),
          automation: tc.is_automated ? 'automated' : 'is-not-automated',
          status: String(tc.status || 'Actual').toLowerCase(),
          is_flaky: tc.is_flaky ? 'yes' : 'no',
          layer: String(tc.layer || 'Not set').toLowerCase() === 'not set' ? 'undefined' : String(tc.layer).toLowerCase(),
          milestone: null,
          custom_fields: [],
          steps_type: 'classic',
          tags: tc.tags || [],
          params: [],
          is_muted: tc.is_muted ? 'yes' : 'no'
        };
      });

      return {
        id: idx + 1,
        title: suite.name,
        description: suite.description || null,
        preconditions: '',
        suites: [],
        cases: cleanCases
      };
    });

    const exportData = {
      suites: suitesExport
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    let filename = 'all_suites_export.json';
    if (projectFilter !== 'all') {
      const projName = projects.find(p => p.id === projectFilter)?.name;
      if (projName) {
        filename = `${projName.toLowerCase().replace(/\s+/g, '_')}_suites_export.json`;
      }
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${activeSuites.length} test suites in Qase.io JSON format!`, 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Qase.io standard format check
        if (parsed.suites && Array.isArray(parsed.suites)) {
          let totalCases = 0;
          if (Array.isArray(parsed.cases) && parsed.cases.length > 0) {
            totalCases = parsed.cases.length;
          } else {
            totalCases = countCasesRecursively(parsed.suites);
          }

          setImportPreview({
            name: parsed.suites.length === 1 ? parsed.suites[0].title : `${parsed.suites.length} Test Suites`,
            description: parsed.suites.length === 1 
              ? (parsed.suites[0].description || 'Qase.io exported suite') 
              : `Importing ${parsed.suites.length} suites with a total of ${totalCases} test cases from Qase.io format.`,
            casesCount: totalCases,
            raw: parsed,
            isQaseFormat: true
          });
        } 
        // Fallback to legacy single suite format
        else if (parsed.suite && parsed.suite.name) {
          setImportPreview({
            name: parsed.suite.name,
            description: parsed.suite.description || '',
            casesCount: Array.isArray(parsed.testCases) ? parsed.testCases.length : 0,
            raw: parsed,
            isQaseFormat: false
          });
        } 
        // Fallback to legacy array format
        else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].suite) {
          const totalCases = parsed.reduce((sum, s) => sum + (Array.isArray(s.testCases) ? s.testCases.length : 0), 0);
          setImportPreview({
            name: `${parsed.length} Test Suites`,
            description: `Importing ${parsed.length} suites with a total of ${totalCases} test cases (Legacy format).`,
            casesCount: totalCases,
            raw: parsed,
            isLegacyArray: true
          });
        } else {
          addToast('Invalid file format. Must be a valid Qase.io JSON export.', 'error');
          setImportPreview(null);
          setImportFile(null);
        }
      } catch (err) {
        addToast('Failed to parse JSON file.', 'error');
        setImportPreview(null);
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importProjectId) {
      addToast('Please select a target project.', 'warning');
      return;
    }
    if (!importPreview) {
      addToast('Please select a valid JSON export file.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      const data = importPreview.raw;

      if (importPreview.isQaseFormat) {
        // Qase.io format: array of suites and cases
        const suiteIdMapping: Record<string, string> = {};

        // Helper to recursively import suites and their cases
        const importSuiteAndCases = async (suiteData: any, parentId: string | null) => {
          // Create the suite in our platform
          const newSuite = await addTestSuite(
            importProjectId, 
            suiteData.title || suiteData.name, 
            suiteData.description || ''
          );

          if (!newSuite) return;
          suiteIdMapping[String(suiteData.id)] = newSuite.id;

          // Import cases under this suite
          if (Array.isArray(suiteData.cases)) {
            for (const tc of suiteData.cases) {
              const parsedSteps = JSON.stringify(
                parseSteps(
                  Array.isArray(tc.steps) ? JSON.stringify(tc.steps) : tc.steps,
                  tc.expected_result
                )
              );

              const payload = {
                project_id: importProjectId,
                suite_id: newSuite.id,
                title: tc.title,
                objective: tc.objective || '',
                precondition: tc.preconditions || tc.precondition || '',
                post_condition: tc.postconditions || tc.post_condition || '',
                test_data: tc.test_data || '',
                steps: parsedSteps,
                expected_result: tc.expected_result || '',
                tags: Array.isArray(tc.tags) ? tc.tags : ['Functional'],
                is_automated: tc.automation === 'automated' || !!tc.is_automated,
                automation_link: tc.automation_link || '',
                status: normalizeStatus(tc.status),
                description: tc.description || '',
                severity: normalizeSeverity(tc.severity),
                priority: normalizePriority(tc.priority),
                type: tc.type || 'Other',
                layer: normalizeLayer(tc.layer),
                is_flaky: tc.is_flaky === 'yes' || !!tc.is_flaky,
                behavior: normalizeBehavior(tc.behavior),
                is_muted: tc.is_muted === 'yes' || !!tc.is_muted,
                created_by: currentUser?.id || 'user-qa-1'
              };
              await addTestCase(payload);
            }
          }

          // Recursively import sub-suites
          if (Array.isArray(suiteData.suites)) {
            for (const childSuite of suiteData.suites) {
              await importSuiteAndCases(childSuite, newSuite.id);
            }
          }
        };

        // 1. Process all root level suites recursively
        for (const suiteData of data.suites) {
          await importSuiteAndCases(suiteData, null);
        }

        // 2. Also handle any legacy flat cases array in the same file if present (as a fallback)
        if (Array.isArray(data.cases) && data.cases.length > 0) {
          for (const tc of data.cases) {
            const mappedSuiteId = suiteIdMapping[String(tc.suite_id)];
            if (!mappedSuiteId) continue;

            const parsedSteps = JSON.stringify(
              parseSteps(
                Array.isArray(tc.steps) ? JSON.stringify(tc.steps) : tc.steps,
                tc.expected_result
              )
            );

            const payload = {
              project_id: importProjectId,
              suite_id: mappedSuiteId,
              title: tc.title,
              objective: tc.objective || '',
              precondition: tc.preconditions || tc.precondition || '',
              post_condition: tc.postconditions || tc.post_condition || '',
              test_data: tc.test_data || '',
              steps: parsedSteps,
              expected_result: tc.expected_result || '',
              tags: Array.isArray(tc.tags) ? tc.tags : ['Functional'],
              is_automated: tc.automation === 'automated' || !!tc.is_automated,
              automation_link: tc.automation_link || '',
              status: normalizeStatus(tc.status),
              description: tc.description || '',
              severity: normalizeSeverity(tc.severity),
              priority: normalizePriority(tc.priority),
              type: tc.type || 'Other',
              layer: normalizeLayer(tc.layer),
              is_flaky: tc.is_flaky === 'yes' || !!tc.is_flaky,
              behavior: normalizeBehavior(tc.behavior),
              is_muted: tc.is_muted === 'yes' || !!tc.is_muted,
              created_by: currentUser?.id || 'user-qa-1'
            };
            await addTestCase(payload);
          }
        }

        const totalCases = countCasesRecursively(data.suites) + (Array.isArray(data.cases) ? data.cases.length : 0);
        addToast(`Successfully imported Qase.io project data (${data.suites.length} suites, ${totalCases} cases)!`, 'success');
      } else if (importPreview.isLegacyArray && Array.isArray(data)) {
        // Legacy array of suites
        for (const suiteEntry of data) {
          const newSuite = await addTestSuite(importProjectId, suiteEntry.suite.name, suiteEntry.suite.description);
          if (newSuite && Array.isArray(suiteEntry.testCases)) {
            for (const tc of suiteEntry.testCases) {
              const parsedSteps = JSON.stringify(
                parseSteps(
                  Array.isArray(tc.steps) ? JSON.stringify(tc.steps) : tc.steps,
                  tc.expected_result
                )
              );

              const payload = {
                project_id: importProjectId,
                suite_id: newSuite.id,
                title: tc.title,
                objective: tc.objective || '',
                precondition: tc.precondition || '',
                post_condition: tc.post_condition || '',
                test_data: tc.test_data || '',
                steps: parsedSteps,
                expected_result: tc.expected_result || '',
                tags: Array.isArray(tc.tags) ? tc.tags : ['Functional'],
                is_automated: !!tc.is_automated,
                automation_link: tc.automation_link || '',
                status: normalizeStatus(tc.status),
                description: tc.description || '',
                severity: normalizeSeverity(tc.severity),
                priority: normalizePriority(tc.priority),
                type: tc.type || 'Other',
                layer: normalizeLayer(tc.layer),
                is_flaky: !!tc.is_flaky,
                behavior: normalizeBehavior(tc.behavior),
                is_muted: !!tc.is_muted,
                created_by: currentUser?.id || 'user-qa-1'
              };
              await addTestCase(payload);
            }
          }
        }
        addToast(`Successfully imported ${data.length} test suites (Legacy format)!`, 'success');
      } else {
        // Legacy single suite
        const newSuite = await addTestSuite(importProjectId, data.suite.name, data.suite.description);
        if (newSuite && Array.isArray(data.testCases)) {
          for (const tc of data.testCases) {
            const parsedSteps = JSON.stringify(
              parseSteps(
                Array.isArray(tc.steps) ? JSON.stringify(tc.steps) : tc.steps,
                tc.expected_result
              )
            );

            const payload = {
              project_id: importProjectId,
              suite_id: newSuite.id,
              title: tc.title,
              objective: tc.objective || '',
              precondition: tc.precondition || '',
              post_condition: tc.post_condition || '',
              test_data: tc.test_data || '',
              steps: parsedSteps,
              expected_result: tc.expected_result || '',
              tags: Array.isArray(tc.tags) ? tc.tags : ['Functional'],
              is_automated: !!tc.is_automated,
              automation_link: tc.automation_link || '',
              status: normalizeStatus(tc.status),
              description: tc.description || '',
              severity: normalizeSeverity(tc.severity),
              priority: normalizePriority(tc.priority),
              type: tc.type || 'Other',
              layer: normalizeLayer(tc.layer),
              is_flaky: !!tc.is_flaky,
              behavior: normalizeBehavior(tc.behavior),
              is_muted: !!tc.is_muted,
              created_by: currentUser?.id || 'user-qa-1'
            };
            await addTestCase(payload);
          }
        }
        addToast(`Suite "${importPreview.name}" imported successfully (Legacy format)!`, 'success');
      }
      setIsImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Import failed.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete test suite "${name}"? This will delete all cases inside it.`)) {
      await deleteTestSuite(id);
      addToast(`Suite "${name}" deleted!`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Test Suites</h1>
          <p className="text-sm text-muted-foreground">Organize your test cases into functional modules and suites.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportAll}
            className="cursor-pointer font-semibold border-border hover:bg-muted text-foreground"
            title="Export all suites & test cases under current filters to a single JSON file"
          >
            <FolderDown className="h-4 w-4 mr-1.5" />
            Export All (JSON)
          </Button>
          {canCreateAnySuite && (
            <Button
              variant="outline"
              onClick={() => {
                if (!currentUser) {
                  router.push('/login');
                  return;
                }
                setImportProjectId(projectFilter !== 'all' ? projectFilter : (accessibleProjects[0]?.id || ''));
                setImportFile(null);
                setImportPreview(null);
                setIsImportOpen(true);
              }}
              className="cursor-pointer font-semibold border-border hover:bg-muted"
            >
              <FolderUp className="h-4 w-4 mr-1.5" />
              Import Suite
            </Button>
          )}
          {canCreateAnySuite ? (
            <Button onClick={() => {
              if (!currentUser) {
                router.push('/login');
                return;
              }
              setEditingSuite(null);
              setIsOpen(true);
            }} className="cursor-pointer font-semibold">
              <FolderPlus className="h-4 w-4 mr-1.5" />
              New Test Suite
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Modify actions disabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar filters */}
      <div className="grid gap-4 sm:grid-cols-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search test suite by name or description..." 
            className="pl-9"
          />
        </div>
        <Select value={projectFilter} onChange={(e) => handleProjectFilterChange(e.target.value)}>
          <option value="all">All Projects</option>
          {accessibleProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      {/* Suites Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {filteredSuites.length > 0 ? (
          filteredSuites.map((suite) => {
            const proj = projects.find(p => p.id === suite.project_id);
            return (
              <div 
                key={suite.id}
                className="bg-card rounded-xl border border-border p-6 hover:border-primary/20 hover:shadow-md transition-all flex flex-col justify-between min-h-[175px]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-primary">
                    <Folder className="h-5.5 w-5.5 fill-primary/10" />
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md uppercase">
                      {proj ? proj.name.split(' ')[0] : 'GEO'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-2">{suite.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-1">
                    {suite.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <span>Project: <strong className="text-foreground/80">{proj ? proj.name : 'Unknown'}</strong></span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 hover:bg-muted text-yellow-500 hover:text-yellow-600 cursor-pointer" 
                      onClick={() => handleExport(suite)}
                      title="Export suite & test cases (JSON)"
                    >
                      <FileJson className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 hover:bg-muted text-emerald-500 hover:text-emerald-600 cursor-pointer" 
                      onClick={() => handleExportExcel(suite)}
                      title="Export suite to Excel"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </Button>
                    {proj && canModifySuite(proj.id) && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 hover:bg-muted" 
                          onClick={() => {
                            if (!currentUser) {
                              router.push('/login');
                              return;
                            }
                            setEditingSuite(suite);
                            setIsOpen(true);
                          }}
                          title="Edit suite"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500 hover:bg-red-500/10 cursor-pointer" 
                          onClick={() => {
                            if (!currentUser) {
                              router.push('/login');
                              return;
                            }
                            handleDelete(suite.id, suite.name);
                          }}
                          title="Delete suite"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <Folder className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="font-semibold text-foreground/80">No suites found</p>
            <p className="text-xs mt-1">Add a suite directory to begin mapping test cases.</p>
          </div>
        )}
      </div>

      {/* Suite Creator Modal */}
      <Dialog
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setEditingSuite(null); }}
        title={editingSuite ? 'Edit Test Suite' : 'Create Test Suite'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsOpen(false); setEditingSuite(null); }}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Suite</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {!editingSuite && (
            <FormGroup label="Project Target">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {accessibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormGroup>
          )}

          {editingSuite && (
            <div className="text-xs text-muted-foreground mb-2">
              Project: {projects.find(p => p.id === projectId)?.name}
            </div>
          )}

          {projectId && !canModifyProject(projectId) && (
            <div className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
              ⚠️ You do not have permissions to modify suites in this project. Saving will fail.
            </div>
          )}

          <FormGroup label="Suite Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Authentication API" />
          </FormGroup>

          <FormGroup label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Suite objective details..." rows={3} />
          </FormGroup>
        </div>
      </Dialog>

      {/* Import Suite Dialog */}
      <Dialog
        isOpen={isImportOpen}
        onClose={() => { if (!isImporting) { setIsImportOpen(false); setImportFile(null); setImportPreview(null); } }}
        title="Import Test Suite"
        footer={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setIsImportOpen(false); setImportFile(null); setImportPreview(null); }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              loading={isImporting}
              disabled={!importPreview || !importProjectId}
            >
              Import
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <FormGroup label="Target Project">
            <Select 
              value={importProjectId} 
              onChange={(e) => setImportProjectId(e.target.value)}
              disabled={isImporting}
            >
              {accessibleProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormGroup>

          {importProjectId && !canModifyProject(importProjectId) && (
            <div className="text-red-500 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg flex gap-1.5 items-center">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>You do not have Editor permissions in this project. Import will fail.</span>
            </div>
          )}

          <FormGroup label="Upload Exported JSON File">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer" onClick={() => !isImporting && fileInputRef.current?.click()}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <FileJson className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="font-bold text-foreground/80">{importFile ? importFile.name : 'Select .json file'}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{importFile ? `${(importFile.size / 1024).toFixed(2)} KB` : 'Click to browse folder'}</p>
            </div>
          </FormGroup>

          {importPreview && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <p className="font-bold text-foreground">Export File Preview Summary:</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1">
                <span>Suite Name:</span>
                <strong className="text-foreground">{importPreview.name}</strong>
                <span>Description:</span>
                <span className="text-foreground truncate max-w-[150px]">{importPreview.description || '-'}</span>
                <span>Total Test Cases:</span>
                <strong className="text-foreground">{importPreview.casesCount} cases</strong>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
