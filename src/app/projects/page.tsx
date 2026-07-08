'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProjectMonitorStore } from '@/store/useProjectMonitorStore';
import { 
  FolderHeart, Plus, Search, Filter, Calendar, 
  ArrowUpRight, AlertCircle, RefreshCw, Briefcase 
} from 'lucide-react';
import { QA_STATUS_LIST, PRIORITY_LIST, WORKLOAD_LIST, COLOR_LABELS } from '@/lib/project-monitor-types';

export default function ProjectsPage() {
  const { projects, isLoading, fetchData } = useProjectMonitorStore();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [workloadFilter, setWorkloadFilter] = React.useState('all');

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering projects
  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      const matchSearch = 
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.client.toLowerCase().includes(search.toLowerCase()) ||
        project.product.toLowerCase().includes(search.toLowerCase()) ||
        (project.notes && project.notes.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'all' || project.qaStatus === statusFilter;
      const matchPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      const matchWorkload = workloadFilter === 'all' || project.workload === workloadFilter;

      return matchSearch && matchStatus && matchPriority && matchWorkload;
    });
  }, [projects, search, statusFilter, priorityFilter, workloadFilter]);

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'Critical': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30';
      case 'High': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30';
      default: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
    }
  };

  const getWorkloadColor = (wl: string) => {
    switch (wl) {
      case 'Critical': return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
      case 'High': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3 border-b border-border/40">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderHeart className="h-7 w-7 text-primary" /> QA Projects
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">List of active and monitored QA projects, targets, and testing progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary cursor-pointer shadow-xs transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/projects/new">
            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer shadow-sm shadow-primary/10 transition-colors">
              <Plus className="h-4 w-4 mr-1.5" /> Create Project
            </button>
          </Link>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid gap-3 md:flex md:items-center md:flex-wrap bg-card rounded-2xl border border-border/50 p-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects, clients, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-4 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 min-w-[150px]">
          <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground appearance-none"
          >
            <option value="all">All Statuses</option>
            {QA_STATUS_LIST.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 min-w-[150px]">
          <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Priority</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)} // Wait, priorityFilter is controlled by priorityFilter state
            className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground appearance-none"
          >
            <option value="all">All Priorities</option>
            {PRIORITY_LIST.map(pr => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
        </div>

        {/* Workload Filter */}
        <div className="flex items-center gap-1.5 min-w-[150px]">
          <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Workload</span>
          <select
            value={workloadFilter}
            onChange={(e) => setWorkloadFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none text-foreground appearance-none"
          >
            <option value="all">All Workloads</option>
            {WORKLOAD_LIST.map(wl => (
              <option key={wl} value={wl}>{wl}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading QA Projects...</span>
          </div>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => {
            const colorOption = COLOR_LABELS.find(cl => cl.value === proj.colorLabel) || COLOR_LABELS[0];
            return (
              <Link href={`/projects/${proj.id}`} key={proj.id} className="block group">
                <div className={`h-full bg-card rounded-2xl border border-border/60 p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between relative overflow-hidden`}>
                  {/* Color strip accent */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: proj.colorLabel || '#3b82f6' }} />
                  
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">{proj.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold flex items-center gap-1">
                          <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" /> {proj.client} • {proj.product}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/50 shrink-0">
                        {proj.qaStatus}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Progress & Meta metrics */}
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black mb-1 text-muted-foreground">
                        <span>PROGRESS</span>
                        <span className="text-foreground">{proj.progress}%</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/20">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${proj.progress}%`,
                            backgroundColor: proj.colorLabel || '#3b82f6'
                          }} 
                        />
                      </div>
                    </div>

                    {/* Footer Stats badges */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${getPriorityColor(proj.priority)}`}>
                          {proj.priority}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border ${getWorkloadColor(proj.workload)}`}>
                          {proj.workload}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{proj.releaseTarget}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[8px] text-muted-foreground font-semibold pt-1">
                      <span>Last Update: {new Date(proj.lastUpdate).toLocaleDateString()}</span>
                      <span className="text-primary font-bold group-hover:underline flex items-center gap-0.5">
                        <span>Details</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center shadow-xs">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No QA projects found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or create a new project to start tracking your workload.
          </p>
          <Link href="/projects/new" className="inline-block mt-4">
            <button className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" /> Add Project
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
