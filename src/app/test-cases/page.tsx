'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { TestStep, parseSteps } from '@/lib/validators';
import { 
  Folder, FolderOpen, Search, Filter, Plus, Edit, Trash2, 
  Copy, FolderInput, Download, CheckSquare, Square, ShieldAlert,
  Terminal, Globe, BookOpen, AlertCircle, FileSpreadsheet, ChevronRight,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function TestCasesPage() {
  const router = useRouter();
  const { 
    testCases, testSuites, projects, projectShares,
    addTestCase, updateTestCase, deleteTestCase,
    bulkCloneTestCases, bulkMoveTestCases, bulkDeleteTestCases 
  } = useDataStore();
  const { activeRole, currentUser, mockUsers } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeProject, setActiveProject] = React.useState<string>('');
  const [activeSuite, setActiveSuite] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState('all');
  
  // Selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCase, setEditingCase] = React.useState<any | null>(null);
  
  const [isMoveOpen, setIsMoveOpen] = React.useState(false);
  const [moveSuiteTarget, setMoveSuiteTarget] = React.useState('');
  
  const [activeDetailCase, setActiveDetailCase] = React.useState<any | null>(null);

  // Form Fields
  const [title, setTitle] = React.useState('');
  const [objective, setObjective] = React.useState('');
  const [precondition, setPrecondition] = React.useState('');
  const [testData, setTestData] = React.useState('');
  const [steps, setSteps] = React.useState('');
  const [expected, setExpected] = React.useState('');
  const [suiteId, setSuiteId] = React.useState('');
  const [tags, setTags] = React.useState<string[]>(['Functional']);
  const [isAutomated, setIsAutomated] = React.useState(false);
  const [automationLink, setAutomationLink] = React.useState('');

  const [formSteps, setFormSteps] = React.useState<TestStep[]>([
    { action: '', data: '', expected_result: '' }
  ]);

  const addFormStep = () => {
    setFormSteps((prev) => [...prev, { action: '', data: '', expected_result: '' }]);
  };

  const deleteFormStep = (index: number) => {
    setFormSteps((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateFormStep = (index: number, field: keyof TestStep, value: string) => {
    setFormSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, [field]: value } : step))
    );
  };

  // Drag and Drop steps states & handlers
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isDragEnabled, setIsDragEnabled] = React.useState<boolean>(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const nextSteps = [...formSteps];
    const draggedItem = nextSteps[draggedIndex];
    nextSteps.splice(draggedIndex, 1);
    nextSteps.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setFormSteps(nextSteps);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsDragEnabled(false);
  };

  // Expanded Qase fields
  const [status, setStatus] = React.useState<'Actual' | 'Draft' | 'Deprecated'>('Actual');
  const [description, setDescription] = React.useState('');
  const [severity, setSeverity] = React.useState<'Normal' | 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial'>('Normal');
  const [priority, setPriority] = React.useState<'Not set' | 'High' | 'Medium' | 'Low'>('Not set');
  const [type, setType] = React.useState('Other');
  const [layer, setLayer] = React.useState<'Not set' | 'E2E' | 'API' | 'Unit'>('Not set');
  const [isFlaky, setIsFlaky] = React.useState(false);
  const [behavior, setBehavior] = React.useState<'Not set' | 'Positive' | 'Negative' | 'Destructive'>('Not set');
  const [isMuted, setIsMuted] = React.useState(false);
  const [postCondition, setPostCondition] = React.useState('');

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

  const handleProjectChange = (projId: string) => {
    setActiveProject(projId);
    setActiveSuite('all');
    setSelectedIds([]);
    
    // Update URL query parameter without full reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('project', projId);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Default active project
  React.useEffect(() => {
    if (accessibleProjects.length > 0) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const projectParam = params.get('project');
        if (projectParam && accessibleProjects.some(p => p.id === projectParam)) {
          setActiveProject(projectParam);
          return;
        }
      }
      if (!activeProject || !accessibleProjects.some(p => p.id === activeProject)) {
        setActiveProject(accessibleProjects[0].id);
      }
    }
  }, [accessibleProjects]);

  // Reset/sync form
  React.useEffect(() => {
    if (isFormOpen) {
      if (editingCase) {
        setTitle(editingCase.isDuplicate ? `Copy of ${editingCase.title}` : editingCase.title);
        setObjective(editingCase.objective || '');
        setPrecondition(editingCase.precondition || '');
        setTestData(editingCase.test_data || '');
        setSuiteId(editingCase.suite_id);
        setTags(editingCase.tags || []);
        setIsAutomated(editingCase.is_automated || false);
        setAutomationLink(editingCase.automation_link || '');
        
        const parsed = parseSteps(editingCase.steps, editingCase.expected_result);
        setFormSteps(parsed);
        
        // Qase fields
        setStatus(editingCase.status || 'Actual');
        setDescription(editingCase.description || '');
        setSeverity(editingCase.severity || 'Normal');
        setPriority(editingCase.priority || 'Not set');
        setType(editingCase.type || 'Other');
        setLayer(editingCase.layer || 'Not set');
        setIsFlaky(editingCase.is_flaky || false);
        setBehavior(editingCase.behavior || 'Not set');
        setIsMuted(editingCase.is_muted || false);
        setPostCondition(editingCase.post_condition || '');
      } else {
        setTitle('');
        setObjective('');
        setPrecondition('');
        setTestData('');
        const firstSuite = testSuites.find(s => s.project_id === activeProject);
        setSuiteId(firstSuite?.id || '');
        setTags(['Functional']);
        setIsAutomated(false);
        setAutomationLink('');
        setFormSteps([{ action: '', data: '', expected_result: '' }]);
        
        // Qase defaults
        setStatus('Actual');
        setDescription('');
        setSeverity('Normal');
        setPriority('Not set');
        setType('Other');
        setLayer('Not set');
        setIsFlaky(false);
        setBehavior('Not set');
        setIsMuted(false);
        setPostCondition('');
      }
    }
  }, [editingCase, activeProject, testSuites, isFormOpen]);

  const canModify = React.useMemo(() => {
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === activeProject);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser?.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, activeProject, currentUser]);

  // Filter Suites
  const projectSuites = React.useMemo(() => {
    return testSuites.filter((s) => s.project_id === activeProject);
  }, [testSuites, activeProject]);

  // Filter Cases
  const filteredCases = React.useMemo(() => {
    return testCases.filter((tc) => {
      const matchProject = tc.project_id === activeProject;
      const matchSuite = activeSuite === 'all' || tc.suite_id === activeSuite;
      const matchSearch = tc.title.toLowerCase().includes(search.toLowerCase()) || 
                          tc.code.toLowerCase().includes(search.toLowerCase());
      const matchTag = tagFilter === 'all' || tc.tags.includes(tagFilter);
      return matchProject && matchSuite && matchSearch && matchTag;
    });
  }, [testCases, activeProject, activeSuite, search, tagFilter]);

  const handleFormSubmit = async () => {
    if (!title.trim() || !suiteId) {
      addToast('Title and Suite are required.', 'warning');
      return;
    }

    const payload = {
      project_id: activeProject,
      suite_id: suiteId,
      title,
      objective,
      precondition,
      test_data: testData,
      steps: JSON.stringify(formSteps),
      expected_result: formSteps[0]?.expected_result || '',
      tags,
      is_automated: isAutomated,
      automation_link: isAutomated ? automationLink : undefined,
      created_by: currentUser?.id || 'user-qa-1',
      
      // Qase fields
      status,
      description,
      severity,
      priority,
      type,
      layer,
      is_flaky: isFlaky,
      behavior,
      is_muted: isMuted,
      post_condition: postCondition
    };

    try {
      if (editingCase && !editingCase.isDuplicate) {
        await updateTestCase(editingCase.id, payload);
        addToast(`Test case ${editingCase.code} updated!`, 'success');
      } else {
        await addTestCase(payload);
        addToast('Test case added successfully!', 'success');
      }
      setIsFormOpen(false);
      setEditingCase(null);
    } catch (e: any) {
      addToast(e.message || 'Failed to save test case.', 'error');
    }
  };

  // Bulk Actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === filteredCases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCases.map((c) => c.id));
    }
  };

  const handleBulkClone = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkCloneTestCases(selectedIds);
      addToast(`Cloned ${selectedIds.length} test cases!`, 'success');
      setSelectedIds([]);
    } catch (e) {
      addToast('Failed to clone cases.', 'error');
    }
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0 || !moveSuiteTarget) return;
    try {
      await bulkMoveTestCases(selectedIds, moveSuiteTarget);
      addToast(`Moved ${selectedIds.length} test cases to new suite!`, 'success');
      setIsMoveOpen(false);
      setSelectedIds([]);
    } catch (e) {
      addToast('Failed to move cases.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} test cases?`)) {
      try {
        await bulkDeleteTestCases(selectedIds);
        addToast(`Deleted ${selectedIds.length} test cases!`, 'success');
        setSelectedIds([]);
      } catch (e) {
        addToast('Failed to delete cases.', 'error');
      }
    }
  };

  const handleExportCSV = () => {
    if (selectedIds.length === 0) return;
    const casesToExport = testCases.filter((tc) => selectedIds.includes(tc.id));
    
    // Build CSV content
    const headers = ['Code', 'Title', 'Objective', 'Precondition', 'Expected Result', 'Automated', 'Tags'];
    const rows = casesToExport.map((c) => [
      c.code,
      c.title,
      c.objective || '',
      c.precondition || '',
      c.expected_result || '',
      c.is_automated ? 'TRUE' : 'FALSE',
      c.tags.join(';'),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `test_cases_${activeProject}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV export downloaded!', 'success');
  };

  const handleTagToggle = (tag: string) => {
    setTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Repository & Cases</h1>
            <p className="text-sm text-muted-foreground">Manage test suite assets, preconditions, and validation checklists.</p>
          </div>
          {/* Project switcher */}
          <Select 
            value={activeProject} 
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-48 font-bold border-primary/20 text-primary"
          >
            {accessibleProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>

        <div>
          {(!currentUser || canModify) ? (
            <Button onClick={() => {
              if (!currentUser) {
                router.push('/login');
                return;
              }
              setEditingCase(null);
              setIsFormOpen(true);
            }} className="cursor-pointer font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Case
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Modify mode locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Bulk floating actions toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary text-primary-foreground p-3 rounded-lg shadow-lg animate-in slide-in-from-top-4 duration-300">
          <span className="text-xs font-bold pl-2">
            {selectedIds.length} test cases selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBulkClone} className="text-xs font-bold hover:bg-white/10 text-white cursor-pointer">
              <Copy className="h-3.5 w-3.5 mr-1" />
              Clone
            </Button>
            {canModify && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setMoveSuiteTarget(projectSuites[0]?.id || ''); setIsMoveOpen(true); }} 
                className="text-xs font-bold hover:bg-white/10 text-white cursor-pointer"
              >
                <FolderInput className="h-3.5 w-3.5 mr-1" />
                Move
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleExportCSV} className="text-xs font-bold hover:bg-white/10 text-white cursor-pointer">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export CSV
            </Button>
            {canModify && (
              <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-xs font-bold text-red-200 hover:bg-red-500/20 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Double pane layout */}
      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Left column: Suites directory tree */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-border">
            Suites Directory
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveSuite('all')}
              className={`w-full text-left flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSuite === 'all' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 shrink-0" /> All Test Cases
              </span>
              <span>{testCases.filter(tc => tc.project_id === activeProject).length}</span>
            </button>

            {projectSuites.map((suite) => {
              const suiteCount = testCases.filter((tc) => tc.suite_id === suite.id).length;
              return (
                <button
                  key={suite.id}
                  onClick={() => setActiveSuite(suite.id)}
                  className={`w-full text-left flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeSuite === suite.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                  title={suite.description}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="h-4 w-4 shrink-0 fill-current/10" />
                    <span className="truncate">{suite.name}</span>
                  </span>
                  <span className="shrink-0">{suiteCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Test Cases datatable */}
        <div className="md:col-span-3 space-y-4">
          {/* Filters row */}
          <div className="grid gap-4 sm:grid-cols-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test case title or code..."
                className="pl-9"
              />
            </div>

            <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">All Tags</option>
              <option value="Smoke">Smoke</option>
              <option value="Regression">Regression</option>
              <option value="Functional">Functional</option>
            </Select>
          </div>

          {/* Cases Datatable card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-foreground min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 font-semibold text-muted-foreground text-xs">
                  <th className="p-3 w-10 text-center">
                    <button onClick={handleToggleAll} className="text-muted-foreground hover:text-foreground">
                      {selectedIds.length === filteredCases.length && filteredCases.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 w-28">ID</th>
                  <th className="p-3 min-w-[200px]">Title</th>
                  <th className="p-3">Suite</th>
                  <th className="p-3">Tags</th>
                  <th className="p-3">Automated</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredCases.length > 0 ? (
                  filteredCases.map((tc) => {
                    const suite = testSuites.find((s) => s.id === tc.suite_id);
                    const isSelected = selectedIds.includes(tc.id);
                    return (
                      <tr 
                        key={tc.id}
                        className={`hover:bg-muted/10 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => { setActiveDetailCase(tc); }}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleToggleSelect(tc.id)} className="text-muted-foreground hover:text-foreground">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-bold text-primary">{tc.code}</td>
                        <td className="p-3 font-medium text-foreground hover:text-primary transition-colors">
                          {tc.title}
                        </td>
                        <td className="p-3 text-muted-foreground">{suite ? suite.name : 'Unassigned'}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {tc.tags.map((tag) => (
                              <span key={tag} className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          {tc.is_automated ? (
                            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-fit">
                              <Terminal className="h-3 w-3" />
                              Cypress
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground font-semibold">Manual</span>
                          )}
                        </td>
                        <td className="p-3 text-right flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {(!currentUser || canModify) && (
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
                                  setEditingCase(tc); 
                                  setIsFormOpen(true); 
                                }}
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:bg-muted" 
                                onClick={() => {
                                  if (!currentUser) {
                                    router.push('/login');
                                    return;
                                  }
                                  setEditingCase({ ...tc, isDuplicate: true }); 
                                  setIsFormOpen(true); 
                                }}
                                title="Duplicate"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-red-500 hover:bg-red-500/10" 
                                onClick={async () => {
                                  if (!currentUser) {
                                    router.push('/login');
                                    return;
                                  }
                                  if (confirm(`Delete case ${tc.code}?`)) {
                                    await deleteTestCase(tc.id);
                                    addToast(`Deleted test case ${tc.code}`, 'success');
                                  }
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs font-semibold cursor-pointer"
                            onClick={() => { setActiveDetailCase(tc); }}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="font-semibold text-foreground/80">No test cases found</p>
                      <p className="text-xs mt-1">Change suite folder or add a new test case.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog
        isOpen={activeDetailCase !== null}
        onClose={() => setActiveDetailCase(null)}
        title={activeDetailCase ? `Inspect Test Case: ${activeDetailCase.code}` : ''}
        size="lg"
      >
        {activeDetailCase && (
          <div className="grid gap-6 md:grid-cols-3 text-left">
            {/* Left Column */}
            <div className="md:col-span-2 space-y-5">
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight">{activeDetailCase.title}</h2>
                {activeDetailCase.description && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/10 border border-border/40 p-2.5 rounded-lg leading-relaxed">
                    {activeDetailCase.description}
                  </p>
                )}
              </div>

              {/* Conditions */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1 bg-muted/20 border border-border/50 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-primary" /> Pre-conditions
                  </span>
                  <p className="mt-1 leading-relaxed whitespace-pre-wrap">{activeDetailCase.precondition || 'No pre-requisites.'}</p>
                </div>

                <div className="space-y-1 bg-muted/20 border border-border/50 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-500" /> Post-conditions
                  </span>
                  <p className="mt-1 leading-relaxed whitespace-pre-wrap">{activeDetailCase.post_condition || 'No post-conditions defined.'}</p>
                </div>
              </div>

              {activeDetailCase.test_data && (
                <div className="space-y-1 text-xs bg-muted/20 border border-border/50 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Terminal className="h-3.5 w-3.5 text-blue-500" /> Global Test Data
                  </span>
                  <p className="mt-1 leading-relaxed whitespace-pre-wrap">{activeDetailCase.test_data}</p>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Steps to Execute
                </span>
                <div className="space-y-2">
                  {(() => {
                    const parsedSteps = parseSteps(activeDetailCase.steps, activeDetailCase.expected_result);
                    return parsedSteps.map((step, idx) => (
                      <div key={idx} className="bg-card border border-border/85 rounded-lg p-3 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase border-b border-border/40 pb-1">
                          <span>Step {idx + 1}</span>
                        </div>
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-bold">Action</span>
                              <p className="mt-1 leading-relaxed font-medium text-foreground whitespace-pre-wrap break-all">{step.action || 'No action specified'}</p>
                            </div>
                            {step.expected_result && (
                              <div>
                                <span className="text-[10px] text-emerald-500 block font-bold">Expected Result</span>
                                <p className="mt-1 leading-relaxed font-medium text-emerald-500/90 whitespace-pre-wrap break-words">{step.expected_result}</p>
                              </div>
                            )}
                          </div>
                          {step.data && (
                            <div className="pt-2 border-t border-border/40">
                              <span className="text-[10px] text-muted-foreground block font-bold">Data / Test Data</span>
                              <p className="mt-1 leading-relaxed font-mono text-blue-500 whitespace-pre-wrap bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10 w-fit break-all">{step.data}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column: Qase properties sheet */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 h-fit space-y-4 text-xs">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">
                Properties
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Status</span>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 mt-1 rounded-full border ${
                    activeDetailCase.status === 'Draft'
                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      : activeDetailCase.status === 'Deprecated'
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {activeDetailCase.status || 'Actual'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Severity</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{activeDetailCase.severity || 'Normal'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Priority</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{activeDetailCase.priority || 'Not set'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Layer</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{activeDetailCase.layer || 'Not set'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Behavior</span>
                    <span className="font-semibold text-foreground mt-0.5 block">{activeDetailCase.behavior || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Is Flaky</span>
                    <span className="font-semibold text-foreground mt-0.5 block">{activeDetailCase.is_flaky ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {activeDetailCase.is_muted && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-red-500 font-semibold text-[10px] text-center">
                    Muted Case
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Automation</span>
                  {activeDetailCase.is_automated ? (
                    <div className="space-y-1.5 mt-1">
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-fit">
                        <Terminal className="h-3 w-3" />
                        Automated
                      </span>
                      {activeDetailCase.automation_link && (
                        <a 
                          href={activeDetailCase.automation_link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold truncate"
                          title={activeDetailCase.automation_link}
                        >
                          <Globe className="h-3 w-3 shrink-0" /> Cypress link
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="font-semibold text-muted-foreground block mt-0.5">Manual</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeDetailCase.tags.map((t: string) => (
                      <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-2.5">
                  <span className="text-[10px] text-muted-foreground block font-medium">Folder Suite</span>
                  <span className="font-semibold text-foreground mt-0.5 block truncate">
                    {testSuites.find(s => s.id === activeDetailCase.suite_id)?.name || 'Root'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* CREATE & EDIT FORM DIALOG */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingCase(null); }}
        title={editingCase ? (editingCase.isDuplicate ? 'Duplicate Test Case' : `Edit Test Case (${editingCase.code})`) : 'Create Test Case'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingCase(null); }}>Cancel</Button>
            <Button onClick={handleFormSubmit}>Save Case</Button>
          </div>
        }
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 text-left">
          {/* Basic Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">Basic Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <FormGroup label="Title *">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Verify project editor allows sharing" />
                </FormGroup>
              </div>
              <FormGroup label="Status *">
                <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="Actual">Actual</option>
                  <option value="Draft">Draft</option>
                  <option value="Deprecated">Deprecated</option>
                </Select>
              </FormGroup>
            </div>

            <FormGroup label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide context about what this test case verifies." rows={2} />
            </FormGroup>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormGroup label="Suite Folder *">
                <Select value={suiteId} onChange={(e) => setSuiteId(e.target.value)}>
                  <option value="">Choose Suite Folder...</option>
                  {projectSuites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup label="Severity *">
                <Select value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                  <option value="Normal">Normal</option>
                  <option value="Blocker">Blocker</option>
                  <option value="Critical">Critical</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                  <option value="Trivial">Trivial</option>
                </Select>
              </FormGroup>

              <FormGroup label="Priority *">
                <Select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="Not set">Not set</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </FormGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormGroup label="Layer *">
                <Select value={layer} onChange={(e) => setLayer(e.target.value as any)}>
                  <option value="Not set">Not set</option>
                  <option value="E2E">E2E</option>
                  <option value="API">API</option>
                  <option value="Unit">Unit</option>
                </Select>
              </FormGroup>

              <FormGroup label="Is Flaky *">
                <Select value={isFlaky ? "Yes" : "No"} onChange={(e) => setIsFlaky(e.target.value === "Yes")}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </Select>
              </FormGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormGroup label="Behavior *">
                <Select value={behavior} onChange={(e) => setBehavior(e.target.value as any)}>
                  <option value="Not set">Not set</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Destructive">Destructive</option>
                </Select>
              </FormGroup>

              <FormGroup label="Automation Status *">
                <Select value={isAutomated ? "Automated" : "Manual"} onChange={(e) => setIsAutomated(e.target.value === "Automated")}>
                  <option value="Manual">Manual</option>
                  <option value="Automated">Automated</option>
                </Select>
              </FormGroup>
            </div>

            {/* Checkbox Options */}
            <div className="flex gap-6 pt-1">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="mutedCheck"
                  checked={isMuted} 
                  onChange={(e) => setIsMuted(e.target.checked)} 
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="mutedCheck" className="text-xs font-semibold text-foreground/80 cursor-pointer">Muted case</label>
              </div>
            </div>
          </div>

          {/* Conditions Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">Conditions</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormGroup label="Pre-conditions">
                <Textarea value={precondition} onChange={(e) => setPrecondition(e.target.value)} placeholder="Actions to perform before starting the test" rows={2} />
              </FormGroup>
              <FormGroup label="Post-conditions">
                <Textarea value={postCondition} onChange={(e) => setPostCondition(e.target.value)} placeholder="Cleanup actions or expected state after test completion" rows={2} />
              </FormGroup>
            </div>
          </div>

          {/* Validation Steps Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1.5">Test Case Steps (Classic)</h3>
            <div className="space-y-3">
              {formSteps.map((step, index) => {
                const isDragging = draggedIndex === index;
                return (
                  <div 
                    key={index} 
                    draggable={isDragEnabled}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex gap-2 items-start bg-card p-2.5 rounded-lg border transition-all ${
                      isDragging 
                        ? 'opacity-40 border-primary border-dashed bg-primary/5' 
                        : 'border-border/60 bg-muted/10'
                    }`}
                  >
                    {/* Grip drag handle & index number */}
                    <div className="flex items-center gap-1 pt-2.5 select-none">
                      <div 
                        onMouseEnter={() => setIsDragEnabled(true)}
                        onMouseLeave={() => setIsDragEnabled(false)}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground p-0.5 rounded transition-colors"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4 shrink-0" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-4 text-center">{index + 1}</span>
                    </div>
                    <div className="flex-1 grid gap-2 md:grid-cols-3">
                      <FormGroup label="Step action" className="!mb-0">
                        <Input
                          value={step.action}
                          onChange={(e) => updateFormStep(index, 'action', e.target.value)}
                          placeholder="e.g. Buka https://geo.mapid.io/login"
                          className="text-xs"
                        />
                      </FormGroup>
                      <FormGroup label="Data (Test Data)" className="!mb-0">
                        <Input
                          value={step.data}
                          onChange={(e) => updateFormStep(index, 'data', e.target.value)}
                          placeholder="e.g. username: admin_user, password: secret_password"
                          className="text-xs"
                        />
                      </FormGroup>
                      <FormGroup label="Expected result" className="!mb-0">
                        <Input
                          value={step.expected_result}
                          onChange={(e) => updateFormStep(index, 'expected_result', e.target.value)}
                          placeholder="e.g. Halaman login terbuka"
                          className="text-xs"
                        />
                      </FormGroup>
                    </div>
                    {formSteps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-5 h-8 w-8 text-muted-foreground hover:text-red-500 rounded-md"
                        onClick={() => deleteFormStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs font-bold flex items-center gap-1 cursor-pointer bg-card border-border hover:bg-muted"
                onClick={addFormStep}
              >
                <Plus className="h-3.5 w-3.5" /> New step
              </Button>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Test Type Tags</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Smoke', 'Regression', 'Functional'].map((tag) => {
                const checked = tags.includes(tag);
                return (
                  <button 
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                      checked 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cypress automation link */}
          {isAutomated && (
            <div className="pt-2">
              <FormGroup label="Automation Cypress Link">
                <Input value={automationLink} onChange={(e) => setAutomationLink(e.target.value)} placeholder="e.g. https://github.com/mapid/cypress/e2e/auth.cy.ts" />
              </FormGroup>
            </div>
          )}
        </div>
      </Dialog>

      {/* MOVE SUITE BULK MODAL */}
      <Dialog
        isOpen={isMoveOpen}
        onClose={() => setIsMoveOpen(false)}
        title="Move selected cases to suite"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMoveOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkMove}>Confirm Move</Button>
          </div>
        }
      >
        <FormGroup label="Target Suite Directory">
          <Select value={moveSuiteTarget} onChange={(e) => setMoveSuiteTarget(e.target.value)}>
            {projectSuites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormGroup>
      </Dialog>
    </div>
  );
}
