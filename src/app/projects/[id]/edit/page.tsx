'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProjectMonitorStore } from '@/store/useProjectMonitorStore';
import { QA_STATUS_LIST, PRIORITY_LIST, WORKLOAD_LIST, COLOR_LABELS, QAStatus, Priority, Workload } from '@/lib/project-monitor-types';
import { FolderHeart, ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditProjectPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { projects, updateProject, fetchData, isLoading } = useProjectMonitorStore();

  const [name, setName] = React.useState('');
  const [client, setClient] = React.useState('');
  const [product, setProduct] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [qaStatus, setQaStatus] = React.useState<QAStatus>('Planning');
  const [priority, setPriority] = React.useState<Priority>('Medium');
  const [workload, setWorkload] = React.useState<Workload>('Medium');
  const [releaseTarget, setReleaseTarget] = React.useState('');
  const [colorLabel, setColorLabel] = React.useState(COLOR_LABELS[0].value);
  const [notes, setNotes] = React.useState('');

  const [error, setError] = React.useState('');
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load project values into state once fetched
  React.useEffect(() => {
    if (!isLoading && projects.length > 0) {
      const project = projects.find(p => p.id === id);
      if (project) {
        setName(project.name);
        setClient(project.client);
        setProduct(project.product);
        setDescription(project.description);
        setQaStatus(project.qaStatus);
        setPriority(project.priority);
        setWorkload(project.workload);
        setReleaseTarget(project.releaseTarget);
        setColorLabel(project.colorLabel);
        setNotes(project.notes || '');
        setIsLoaded(true);
      }
    }
  }, [projects, id, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }
    if (!client.trim()) {
      setError('Client Name is required.');
      return;
    }
    if (!product.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (!releaseTarget) {
      setError('Release Target is required.');
      return;
    }

    try {
      updateProject(id, {
        name: name.trim(),
        client: client.trim(),
        product: product.trim(),
        description: description.trim(),
        qaStatus,
        priority,
        workload,
        releaseTarget,
        colorLabel,
        notes: notes.trim(),
      });
      router.push(`/projects/${id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating project.');
    }
  };

  const project = projects.find(p => p.id === id);

  if (isLoading || (!isLoaded && project)) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading Project Details...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <div className="rounded-full bg-red-500/10 p-4 text-red-500 border border-red-500/20">
          <FolderHeart className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">Project Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The project you are trying to edit does not exist or has been deleted.
          </p>
        </div>
        <Link href="/projects">
          <button className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer">
            Back to Projects
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto select-none">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Link 
          href={`/projects/${id}`} 
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Cancel & Back to Details
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <FolderHeart className="h-6 w-6 text-primary" /> Edit Project: {project.name}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Modify parameters, workloads, color tags, or testing phase status.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 p-6 shadow-xs space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Row 1: Project Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Project Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="e.g. GEO MAPID, Customer Portal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          />
        </div>

        {/* Row 2: Client & Product */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Client Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Internal, Telkomsel"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Product Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Mobile App, Web API"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
          </div>
        </div>

        {/* Row 3: Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Description</label>
          <textarea
            placeholder="Describe the scope or features of this project..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          />
        </div>

        {/* Row 4: Status, Priority, Workload */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">QA Status</label>
            <select
              value={qaStatus}
              onChange={(e) => setQaStatus(e.target.value as QAStatus)}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
            >
              {QA_STATUS_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
            >
              {PRIORITY_LIST.map(pr => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Workload</label>
            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value as Workload)}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground"
            >
              {WORKLOAD_LIST.map(wl => (
                <option key={wl} value={wl}>{wl}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 5: Release Target & Color Label */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Release Target <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={releaseTarget}
              onChange={(e) => setReleaseTarget(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block mb-2">Color Label</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_LABELS.map(cl => (
                <button
                  type="button"
                  key={cl.name}
                  onClick={() => setColorLabel(cl.value)}
                  className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                    colorLabel === cl.value 
                      ? 'ring-2 ring-primary scale-110 border-transparent shadow-sm' 
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: cl.value }}
                  title={cl.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Row 6: Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Notes</label>
          <textarea
            placeholder="Add some notes about tech stack, credentials, or client feedback..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
          <Link href={`/projects/${id}`}>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold hover:bg-secondary text-foreground cursor-pointer transition-colors shadow-xs"
            >
              Cancel
            </button>
          </Link>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer shadow-sm transition-colors"
          >
            <Save className="h-4 w-4 mr-1.5" /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
