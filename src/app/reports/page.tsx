'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  FileText, Download, CheckSquare, Sparkles, AlertCircle, 
  ChevronRight, FileCode, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormGroup } from '@/components/ui/input';
import jsPDF from 'jspdf';

export default function ReportsPage() {
  const { feedbacks, issues, releases, projects, projectShares, users } = useDataStore();
  const { activeRole, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [reporterId, setReporterId] = React.useState('');
  const [releaseId, setReleaseId] = React.useState('');

  const accessibleProjectIds = React.useMemo(() => {
    const accessible = (activeRole === 'Admin' || activeRole === 'QA Engineer')
      ? projects
      : projects.filter(p => {
          const shares = projectShares.filter(s => s.project_id === p.id);
          if (shares.length === 0) return true; // public project
          return shares.some(s => s.user_id === currentUser?.id);
        });
    return accessible.map(p => p.id);
  }, [projects, projectShares, activeRole, currentUser]);

  const reportersList = React.useMemo(() => {
    return users.filter((u) => u.role === 'Reporter');
  }, [users]);

  React.useEffect(() => {
    if (reportersList.length > 0 && !reporterId) {
      setReporterId(reportersList[0].id);
    }
    if (releases.length > 0 && !releaseId) {
      setReleaseId(releases[0].id);
    }
  }, [reportersList, releases, reporterId, releaseId]);

  const activeReporter = React.useMemo(() => {
    return users.find((u) => u.id === reporterId);
  }, [users, reporterId]);

  const activeRelease = React.useMemo(() => {
    return releases.find((r) => r.id === releaseId);
  }, [releases, releaseId]);

  // Implemented Feedback list logic:
  // Feedbacks from activeReporter, which have linked issues that are resolved in activeRelease.
  const implementedFeedbacks = React.useMemo(() => {
    if (!reporterId || !releaseId) return [];

    return feedbacks.filter((fb) => {
      // 0. Check project accessibility
      if (!accessibleProjectIds.includes(fb.project_id)) return false;

      // 1. Matches reporter
      if (fb.reporter_id !== reporterId) return false;

      // 2. Find linked issues
      const linkedIssues = issues.filter((i) => i.feedback_id === fb.id);
      if (linkedIssues.length === 0) return false;

      // 3. Any issue is mapped to this release and is Verified/Closed
      return linkedIssues.some((issue) => 
        issue.release_id === releaseId && 
        (issue.status === 'Verified' || issue.status === 'Closed')
      );
    });
  }, [feedbacks, issues, reporterId, releaseId, accessibleProjectIds]);

  // 1. Export as Markdown
  const handleExportMarkdown = () => {
    if (implementedFeedbacks.length === 0 || !activeReporter || !activeRelease) return;

    let content = `# QA Portal - Reporter Implementation Report\n\n`;
    content += `**Reporter:** ${activeReporter.name}\n`;
    content += `**Target Version:** v${activeRelease.version}\n`;
    content += `**Generated Date:** ${new Date().toLocaleDateString()}\n\n`;
    content += `## Implemented Feedbacks:\n\n`;

    implementedFeedbacks.forEach((fb) => {
      content += `* [x] ${fb.code} - ${fb.title}\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `implemented_report_${activeReporter.name.replace(/\s+/g, '_')}_v${activeRelease.version}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Markdown report exported!', 'success');
  };

  // 2. Export as PDF
  const handleExportPDF = () => {
    if (implementedFeedbacks.length === 0 || !activeReporter || !activeRelease) return;

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229); // primary color
      doc.text('QA Portal - Reporter Implementation Report', 15, 20);

      // Metadata
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Reporter: ${activeReporter.name}`, 15, 32);
      doc.text(`Target Release Version: v${activeRelease.version}`, 15, 38);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 44);

      // Horizontal line
      doc.setDrawColor(220, 220, 220);
      doc.line(15, 50, 195, 50);

      // Header Checklist
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      doc.text('Implemented Feedbacks Checklist:', 15, 58);

      // Items
      doc.setFontSize(10);
      implementedFeedbacks.forEach((fb, idx) => {
        const y = 68 + idx * 10;
        doc.text(`[X]  ${fb.code} : ${fb.title}`, 15, y);
      });

      doc.save(`implemented_report_${activeReporter.name.replace(/\s+/g, '_')}_v${activeRelease.version}.pdf`);
      addToast('PDF report exported!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to export PDF.', 'error');
    }
  };

  // 3. Export as DOCX (MS Word compatible HTML markup blob)
  const handleExportDOCX = () => {
    if (implementedFeedbacks.length === 0 || !activeReporter || !activeRelease) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>QA Portal - Reporter Implementation Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a1a; }
          h1 { color: #4f46e5; }
          .metadata { margin-bottom: 20px; font-weight: bold; }
          ul { list-style-type: none; padding-left: 0; }
          li { padding: 5px 0; font-size: 12pt; }
        </style>
      </head>
      <body>
        <h1>QA Portal - Reporter Implementation Report</h1>
        <div class="metadata">
          <p>Reporter: ${activeReporter.name}</p>
          <p>Target Version: v${activeRelease.version}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <hr/>
        <h3>Implemented Feedbacks Checklist:</h3>
        <ul>
          ${implementedFeedbacks.map(fb => `<li>&#9745; ${fb.code} - ${fb.title}</li>`).join('')}
        </ul>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `implemented_report_${activeReporter.name.replace(/\s+/g, '_')}_v${activeRelease.version}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('DOCX report exported!', 'success');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reporter Implementation Reports</h1>
        <p className="text-sm text-muted-foreground">Compile verified feedbacks and export release checklist certificates for reporter teams.</p>
      </div>

      {/* Selectors panel */}
      <div className="grid gap-4 sm:grid-cols-2 bg-card p-5 rounded-xl border border-border">
        <FormGroup label="Select Reporter Team">
          <Select value={reporterId} onChange={(e) => setReporterId(e.target.value)}>
            {reportersList.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label="Select Release milestone version">
          <Select value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
            {releases.map((rel) => (
              <option key={rel.id} value={rel.id}>Version {rel.version} ({rel.status})</option>
            ))}
          </Select>
        </FormGroup>
      </div>

      {/* Main Report Card */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight uppercase">Implementation Checklist</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing feedbacks submitted by <strong className="text-foreground">{activeReporter?.name}</strong> implemented in <strong className="text-foreground">v{activeRelease?.version}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
            <span>Verified Checklist</span>
          </div>
        </div>

        {/* Implemented Feedbacks checklist items */}
        <div className="space-y-3">
          {implementedFeedbacks.length > 0 ? (
            implementedFeedbacks.map((fb) => (
              <div 
                key={fb.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-primary mr-2">{fb.code}</span>
                  <span className="font-semibold text-foreground/80 line-through decoration-emerald-500/30">{fb.title}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-foreground/80">No implemented feedbacks mapped</p>
              <p className="text-xs mt-1">No feedbacks from this reporter are linked to verified issues in this release milestone.</p>
            </div>
          )}
        </div>

        {/* Download actions footer */}
        {implementedFeedbacks.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-5 border-t border-border justify-end">
            <Button 
              variant="outline" 
              onClick={handleExportMarkdown}
              className="text-xs font-bold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-primary" /> Download Markdown
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportDOCX}
              className="text-xs font-bold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Download DOCX
            </Button>
            <Button 
              onClick={handleExportPDF}
              className="text-xs font-bold cursor-pointer bg-primary hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
