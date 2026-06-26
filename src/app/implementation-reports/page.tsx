'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Clock, StickyNote, Bug, Paperclip, 
  ArrowLeft, CheckCircle2, AlertCircle, Calendar, ClipboardList, 
  ExternalLink, Search, Filter, Printer, Copy, Share2, Check,
  XCircle, Loader2, Info, ChevronRight, Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function ImplementationReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const reportIdParam = searchParams.get('id');

  const { 
    projects, feedbacks, issues, releases, users,
    implementationReports, implementationReportItems,
    addImplementationReport, deleteImplementationReport,
    addImplementationReportItem, deleteImplementationReportItem, updateImplementationReportItem
  } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const canEdit = activeRole === 'Admin' || activeRole === 'QA Engineer';

  // Navigation / View states
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);

  // Sync state with URL parameter ?id=...
  React.useEffect(() => {
    if (reportIdParam) {
      setSelectedReportId(reportIdParam);
    } else {
      setSelectedReportId(null);
    }
  }, [reportIdParam]);

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterReporter, setFilterReporter] = React.useState('all');
  const [filterVersion, setFilterVersion] = React.useState('all');
  const [filterPlatform, setFilterPlatform] = React.useState('all');

  // Generator Form States
  const [reportTitle, setReportTitle] = React.useState('');
  const [selectedReporterId, setSelectedReporterId] = React.useState('');
  const [selectedVersionId, setSelectedVersionId] = React.useState('');
  const [selectedPlatform, setSelectedPlatform] = React.useState('Web');
  
  // Generator Feedbacks Checklist
  const [feedbacksToInclude, setFeedbacksToInclude] = React.useState<Array<{
    feedbackId: string;
    title: string;
    feature: string;
    suggestedStatus: 'Implemented' | 'In Progress' | 'Pending';
    checked: boolean;
  }>>([]);

  // Fetch / filter reports based on permissions
  const allowedReports = React.useMemo(() => {
    if (!currentUser) return [];
    if (activeRole === 'Admin' || activeRole === 'QA Engineer' || activeRole === 'Developer') {
      return implementationReports;
    }
    // Reporter: only their own reports
    return implementationReports.filter(r => r.reporter_id === currentUser.id);
  }, [implementationReports, currentUser, activeRole]);

  // Filtered reports for the dashboard listing
  const filteredReports = React.useMemo(() => {
    return allowedReports.filter(report => {
      const reporter = users.find(u => u.id === report.reporter_id);
      const version = releases.find(v => v.id === report.version_id);
      const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (reporter?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesReporter = filterReporter === 'all' || report.reporter_id === filterReporter;
      const matchesVersion = filterVersion === 'all' || report.version_id === filterVersion;
      const matchesPlatform = filterPlatform === 'all' || report.platform === filterPlatform;

      return matchesSearch && matchesReporter && matchesVersion && matchesPlatform;
    });
  }, [allowedReports, users, releases, searchQuery, filterReporter, filterVersion, filterPlatform]);

  // Current selected report details
  const activeReport = React.useMemo(() => {
    if (!selectedReportId) return null;
    return allowedReports.find(r => r.id === selectedReportId) || null;
  }, [selectedReportId, allowedReports]);

  // Items for the active report
  const activeReportItems = React.useMemo(() => {
    if (!selectedReportId) return [];
    return implementationReportItems.filter(i => i.report_id === selectedReportId);
  }, [selectedReportId, implementationReportItems]);

  // Handle reporter dropdown change in Generator: Auto-scans feedbacks
  React.useEffect(() => {
    if (!selectedReporterId || !selectedVersionId) {
      setFeedbacksToInclude([]);
      return;
    }

    const reporterFeedbacks = feedbacks.filter(f => f.reporter_id === selectedReporterId);
    const mapped = reporterFeedbacks.map(f => {
      // Find if there is any issue linked to this feedback
      const linkedIssues = issues.filter(i => i.feedback_id === f.id);
      const matchesVersion = linkedIssues.some(i => i.release_id === selectedVersionId);
      
      let suggestedStatus: 'Implemented' | 'In Progress' | 'Pending' = 'Pending';
      let checked = false;

      if (matchesVersion) {
        checked = true;
        const verifiedIssue = linkedIssues.find(i => i.release_id === selectedVersionId && (i.status === 'Verified' || i.status === 'Closed'));
        if (verifiedIssue) {
          suggestedStatus = 'Implemented';
        } else {
          suggestedStatus = 'In Progress';
        }
      } else if (f.status === 'Implemented') {
        suggestedStatus = 'Implemented';
        checked = true;
      } else if (f.status === 'Reviewed') {
        suggestedStatus = 'In Progress';
      }

      // Determine feature name
      const matchedIssue = linkedIssues[0];
      const feature = matchedIssue ? 'Functional Module' : 'General';

      return {
        feedbackId: f.id,
        title: f.title,
        feature,
        suggestedStatus,
        checked
      };
    });

    setFeedbacksToInclude(mapped);
  }, [selectedReporterId, selectedVersionId, feedbacks, issues]);

  // Auto-generate title in Generator
  React.useEffect(() => {
    const reporter = users.find(u => u.id === selectedReporterId);
    const version = releases.find(v => v.id === selectedVersionId);
    if (reporter && version) {
      setReportTitle(`Implementation Report – ${reporter.name} (Version ${version.version})`);
    } else {
      setReportTitle('');
    }
  }, [selectedReporterId, selectedVersionId, users, releases]);

  // Generate Report Action
  const handleGenerateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReporterId || !selectedVersionId || !reportTitle.trim()) {
      addToast('Please fill out all required fields', 'error');
      return;
    }

    // 1. Create Report
    const createdReport = await addImplementationReport({
      title: reportTitle,
      reporter_id: selectedReporterId,
      version_id: selectedVersionId,
      platform: selectedPlatform,
    });

    if (createdReport) {
      // 2. Insert items
      const selectedItems = feedbacksToInclude.filter(f => f.checked);
      const targetVersion = releases.find(v => v.id === selectedVersionId)?.version || '';

      await Promise.all(
        selectedItems.map(item => 
          addImplementationReportItem({
            report_id: createdReport.id,
            feedback_id: item.feedbackId,
            title: item.title,
            feature: item.feature,
            status: item.suggestedStatus,
            implementation_version: item.suggestedStatus === 'Implemented' ? targetVersion : null,
            qa_note: '',
          })
        )
      );

      // Clean form states
      setSelectedReporterId('');
      setSelectedVersionId('');
      setReportTitle('');
      setIsGenerateModalOpen(false);
      
      addToast('Implementation Report generated successfully!', 'success');
      
      // Load report
      router.push(`/implementation-reports?id=${createdReport.id}`);
    }
  };

  // Delete Report Action
  const handleDeleteReport = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this report? This cannot be undone.')) {
      await deleteImplementationReport(id);
      addToast('Report deleted.', 'success');
      router.push('/implementation-reports');
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (!activeReport) return;
    const url = `${window.location.origin}/implementation-reports?id=${activeReport.id}`;
    navigator.clipboard.writeText(url);
    addToast('Link copied to clipboard!', 'success');
  };

  // Print / Export PDF
  const handlePrint = () => {
    window.print();
  };

  // Lark share text builder
  const getLarkShareText = () => {
    if (!activeReport) return '';
    const reporter = users.find(u => u.id === activeReport.reporter_id);
    const version = releases.find(v => v.id === activeReport.version_id);
    const items = activeReportItems;

    const implItems = items.filter(i => i.status === 'Implemented');
    const progItems = items.filter(i => i.status === 'In Progress');
    const pendItems = items.filter(i => i.status === 'Pending');
    const rejItems = items.filter(i => i.status === 'Rejected');

    let text = `*Implementation Report – ${reporter?.name || 'User'}*\n`;
    text += `Version: ${version?.version || 'General'} (${activeReport.platform})\n\n`;

    if (implItems.length > 0) {
      text += `*✅ Implemented*\n`;
      implItems.forEach(i => {
        text += `- ${i.title}${i.qa_note ? ` (${i.qa_note})` : ''}\n`;
      });
      text += `\n`;
    }

    if (progItems.length > 0) {
      text += `*🚧 In Progress*\n`;
      progItems.forEach(i => {
        text += `- ${i.title}${i.qa_note ? ` (${i.qa_note})` : ''}\n`;
      });
      text += `\n`;
    }

    if (pendItems.length > 0) {
      text += `*⏳ Pending*\n`;
      pendItems.forEach(i => {
        text += `- ${i.title}${i.qa_note ? ` (${i.qa_note})` : ''}\n`;
      });
      text += `\n`;
    }

    if (rejItems.length > 0) {
      text += `*❌ Rejected*\n`;
      rejItems.forEach(i => {
        text += `- ${i.title}${i.qa_note ? ` (${i.qa_note})` : ''}\n`;
      });
      text += `\n`;
    }

    text += `Shareable URL: ${window.location.origin}/implementation-reports?id=${activeReport.id}`;
    return text.trim();
  };

  // Copy Lark template text
  const handleCopyLarkText = () => {
    const text = getLarkShareText();
    navigator.clipboard.writeText(text);
    addToast('Lark markdown format copied!', 'success');
  };

  return (
    <div className="space-y-6 pb-12 select-none print:p-0 print:space-y-0">
      {/* ======================================================== */}
      {/* 1. REPORT DETAILS VIEW (Lark Document Layout)            */}
      {/* ======================================================== */}
      {selectedReportId ? (
        activeReport ? (
          <>
            {/* Header / Actions Row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/implementation-reports')}
                  className="cursor-pointer font-bold text-xs h-8 px-2.5 flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Implementation Report
                  </span>
                  <h2 className="text-sm font-bold text-foreground truncate max-w-sm mt-0.5">
                    {activeReport.title}
                  </h2>
                </div>
              </div>

              {/* Document actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="cursor-pointer text-[10px] font-bold h-8 flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShareModalOpen(true)}
                  className="cursor-pointer text-[10px] font-bold h-8 flex items-center gap-1"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share Lark
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="cursor-pointer text-[10px] font-bold h-8 flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / PDF
                </Button>
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteReport(activeReport.id)}
                    className="cursor-pointer text-[10px] font-bold h-8 flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Document Core Content */}
            <div className="grid gap-6 lg:grid-cols-4 print:grid-cols-1">
              {/* Left Column: Metadata details */}
              <div className="lg:col-span-1 print:hidden">
                <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4 shadow-xs">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Report Metadata</h3>
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div>
                      <span className="text-muted-foreground block font-medium">Reporter:</span>
                      <span className="text-foreground font-bold">
                        {users.find(u => u.id === activeReport.reporter_id)?.name || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Platform:</span>
                      <span className="text-foreground font-semibold flex items-center gap-1">
                        <Laptop className="h-3.5 w-3.5 text-muted-foreground" /> {activeReport.platform}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Target Version:</span>
                      <span className="text-foreground font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px]">
                        {releases.find(v => v.id === activeReport.version_id)?.version || 'General'}
                      </span>
                    </div>
                    <div className="border-t border-border/40 pt-3 space-y-1">
                      <span className="text-[10px] text-muted-foreground block">
                        Created: {new Date(activeReport.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Last Updated: {new Date(activeReport.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Grouped status checklist documents */}
              <div className="lg:col-span-3 print:col-span-1">
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-border/50 p-6 md:p-8 shadow-sm print:border-0 print:p-0">
                  {/* Print-only Header */}
                  <div className="hidden print:block pb-6 border-b border-zinc-200 mb-6">
                    <h1 className="text-xl font-bold text-black">{activeReport.title}</h1>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Reporter: {users.find(u => u.id === activeReport.reporter_id)?.name || 'N/A'} | Version: {releases.find(v => v.id === activeReport.version_id)?.version || 'N/A'} | Platform: {activeReport.platform}
                    </p>
                  </div>

                  <div className="space-y-8">
                    {/* Status Sections Mapping */}
                    {(['Implemented', 'In Progress', 'Pending', 'Rejected', 'Duplicate'] as const).map(status => {
                      const items = activeReportItems.filter(i => i.status === status);
                      if (items.length === 0) return null;

                      // Styles for headings
                      const statusProps = {
                        Implemented: { label: 'Implemented', icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-current dark:fill-transparent" />, colorClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
                        'In Progress': { label: 'In Progress', icon: <AlertCircle className="h-5 w-5 text-blue-500" />, colorClass: 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5' },
                        Pending: { label: 'Pending', icon: <Clock className="h-5 w-5 text-amber-500" />, colorClass: 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5' },
                        Rejected: { label: 'Rejected', icon: <XCircle className="h-5 w-5 text-red-500" />, colorClass: 'text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5' },
                        Duplicate: { label: 'Duplicate', icon: <Info className="h-5 w-5 text-zinc-500" />, colorClass: 'text-zinc-600 dark:text-zinc-400 border-zinc-500/20 bg-zinc-500/5' },
                      }[status];

                      return (
                        <div key={status} className="space-y-4">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border w-fit ${statusProps.colorClass} print:border-0 print:bg-transparent print:p-0`}>
                            {statusProps.icon}
                            <span className="text-xs font-black uppercase tracking-wider">{statusProps.label}</span>
                          </div>

                          {/* Table of items */}
                          <div className="border border-border/80 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/10 print:border-zinc-200">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-border bg-white dark:bg-zinc-950 font-bold text-muted-foreground print:bg-zinc-100 print:text-black">
                                  <th className="p-3 w-1/2">Feedback Title</th>
                                  <th className="p-3">Feature</th>
                                  <th className="p-3">Ver</th>
                                  <th className="p-3 w-1/3 print:w-1/2">QA Comments / Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item) => (
                                  <tr key={item.id} className="border-b border-border bg-white dark:bg-zinc-950/20 last:border-0 print:border-zinc-100">
                                    <td className="p-3 font-semibold text-foreground/90">
                                      {item.title}
                                    </td>
                                    <td className="p-3 text-muted-foreground font-medium">
                                      {item.feature || 'General'}
                                    </td>
                                    <td className="p-3">
                                      <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-foreground/80 font-bold">
                                        {item.implementation_version || '-'}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      {canEdit ? (
                                        <textarea
                                          value={item.qa_note || ''}
                                          onChange={(e) => updateImplementationReportItem(item.id, { qa_note: e.target.value })}
                                          placeholder="Type QA update comments..."
                                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-border/60 hover:border-primary/50 focus:border-primary rounded px-2 py-1 text-[11px] leading-relaxed transition-colors min-h-[45px] resize-none focus-visible:outline-none print:bg-transparent print:border-0 print:p-0 print:min-h-0"
                                        />
                                      ) : (
                                        <p className="text-[11px] text-muted-foreground leading-relaxed italic print:not-italic print:text-zinc-700">
                                          {item.qa_note || 'No comments logged.'}
                                        </p>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-red-500/10 p-3 text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Access Restricted or Report Not Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              You do not have permissions to view this report or it has been deleted.
            </p>
            <Button variant="outline" onClick={() => router.push('/implementation-reports')} className="cursor-pointer font-bold text-xs">
              Go to Dashboard
            </Button>
          </div>
        )
      ) : (
        /* ======================================================== */
        /* 2. REPORTS DASHBOARD (LIST VIEW)                          */
        /* ======================================================== */
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
                Implementation Reports
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Feedback implementation documents from User Testing release sprints.
              </p>
            </div>
            {canEdit && (
              <Button 
                onClick={() => setIsGenerateModalOpen(true)}
                className="cursor-pointer font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Generate Report
              </Button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search reports by title or reporter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-transparent border-input h-9 text-xs rounded-lg w-full"
              />
            </div>
            
            {/* Reporter Filter */}
            {activeRole !== 'Reporter' && (
              <div className="w-full md:w-44 select-xs">
                <Select value={filterReporter} onChange={(e) => setFilterReporter(e.target.value)}>
                  <option value="all">All Reporters</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Version Filter */}
            <div className="w-full md:w-40 select-xs">
              <Select value={filterVersion} onChange={(e) => setFilterVersion(e.target.value)}>
                <option value="all">All Versions</option>
                {releases.map(v => (
                  <option key={v.id} value={v.id}>{v.version}</option>
                ))}
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="w-full md:w-40 select-xs">
              <Select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
                <option value="all">All Platforms</option>
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
                <option value="iOS">iOS</option>
                <option value="Android">Android</option>
              </Select>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-12 text-center col-span-full flex flex-col items-center justify-center space-y-3">
                <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-3 text-muted-foreground">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No Reports Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  There are no implementation reports matching the filters.
                </p>
              </div>
            ) : (
              filteredReports.map((report) => {
                const reporter = users.find(u => u.id === report.reporter_id);
                const version = releases.find(v => v.id === report.version_id);
                const items = implementationReportItems.filter(i => i.report_id === report.id);

                const countImplemented = items.filter(i => i.status === 'Implemented').length;
                const countInProgress = items.filter(i => i.status === 'In Progress').length;
                const countPending = items.filter(i => i.status === 'Pending').length;

                return (
                  <div 
                    key={report.id}
                    className="bg-card rounded-2xl border border-border/50 p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform select-none shadow-xs"
                  >
                    <div>
                      {/* Badge Row */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Laptop className="h-3.5 w-3.5 text-muted-foreground" /> {report.platform}
                        </span>
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-foreground/80 font-bold border border-border/60">
                          {version?.version || 'General'}
                        </span>
                      </div>

                      {/* Header */}
                      <h3 className="text-sm font-bold text-foreground truncate" title={report.title}>
                        {report.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1 font-semibold">
                        Reporter: <span className="text-foreground">{reporter?.name || 'Unknown'}</span>
                      </p>
                      
                      {/* Brief status metrics */}
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center select-none text-[10px] font-bold leading-none">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                          <span className="text-emerald-600 dark:text-emerald-400 block text-sm font-black">{countImplemented}</span>
                          <span className="text-[8px] text-muted-foreground uppercase block mt-1">Implemented</span>
                        </div>
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2">
                          <span className="text-blue-600 dark:text-blue-400 block text-sm font-black">{countInProgress}</span>
                          <span className="text-[8px] text-muted-foreground uppercase block mt-1">In Progress</span>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
                          <span className="text-amber-600 dark:text-amber-400 block text-sm font-black">{countPending}</span>
                          <span className="text-[8px] text-muted-foreground uppercase block mt-1">Pending</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(report.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/implementation-reports?id=${report.id}`)}
                          className="cursor-pointer text-[10px] font-bold py-1 h-7 flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                          Open Document <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 3. GENERATOR MODAL                                       */}
      {/* ======================================================== */}
      <Dialog
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Implementation Report"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)} className="cursor-pointer font-bold text-xs">
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReportSubmit}
              disabled={!selectedReporterId || !selectedVersionId}
              className="cursor-pointer font-bold text-xs bg-primary text-primary-foreground"
            >
              Generate Report
            </Button>
          </>
        }
      >
        <form onSubmit={handleGenerateReportSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormGroup label="Reporter" error="">
              <Select
                value={selectedReporterId}
                onChange={(e) => setSelectedReporterId(e.target.value)}
                required
              >
                <option value="" disabled>Select reporter...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Release Version" error="">
              <Select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                required
              >
                <option value="" disabled>Select version...</option>
                {releases.map((v) => (
                  <option key={v.id} value={v.id}>{v.version}</option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup label="Platform" error="">
              <Select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
                <option value="iOS">iOS</option>
                <option value="Android">Android</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Document Title" error="">
            <Input 
              placeholder="Report Title (Auto-generated)"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="bg-transparent border border-input text-sm h-9 rounded-lg"
              required
            />
          </FormGroup>

          {/* Feedback scanner checklist */}
          <div className="space-y-2 border-t border-border/40 pt-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Scanned Feedbacks Checklist ({feedbacksToInclude.length})</span>
              <span className="text-[10px] text-muted-foreground font-medium lowercase">
                Pulls matching tickets reported by selection.
              </span>
            </h4>
            
            {selectedReporterId && selectedVersionId ? (
              feedbacksToInclude.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-border/40">
                  No feedback tickets found for this reporter.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {feedbacksToInclude.map((item, idx) => (
                    <div 
                      key={item.feedbackId}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60 bg-white dark:bg-zinc-950/40 hover:border-primary/20 transition-colors"
                    >
                      <input 
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          const next = [...feedbacksToInclude];
                          next[idx].checked = e.target.checked;
                          setFeedbacksToInclude(next);
                        }}
                        className="mt-1 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ml-2 ${
                            item.suggestedStatus === 'Implemented'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : item.suggestedStatus === 'In Progress'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                          }`}>
                            {item.suggestedStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Feature: {item.feature}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center text-xs text-muted-foreground py-8 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-border/40">
                Select Reporter and Release Version to pull matching feedbacks checklist.
              </div>
            )}
          </div>
        </form>
      </Dialog>

      {/* Share / Lark Template Modal */}
      {activeReport && (
        <Dialog
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Share Report to Lark / Communication channels"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsShareModalOpen(false)} className="cursor-pointer font-bold text-xs">
                Close
              </Button>
              <Button onClick={handleCopyLarkText} className="cursor-pointer font-bold text-xs bg-primary text-primary-foreground">
                Copy Lark Markdown
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Copy this formatted markdown template to send as a Lark card or message thread:
            </p>
            <pre className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-border/60 rounded-xl text-[10px] text-foreground/90 font-mono leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap select-all">
              {getLarkShareText()}
            </pre>
            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg flex items-start gap-2 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Tip: Standard Lark threads support bold markdown (`*text*`) and list formatting natively.
              </span>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
