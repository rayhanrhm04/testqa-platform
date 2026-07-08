'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeWriteCache } from '@/lib/safe-cache';
import { 
  Briefcase, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle 
} from 'lucide-react';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

const PROJECT_STATUS_OPTIONS = ['Planning', 'Active', 'In Progress', 'On Hold', 'Completed'] as const;

export default function ProjectStatusPage() {
  const { standaloneProjects, isLoading, fetchData } = useDataStore();
  const { currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [localNames, setLocalNames] = React.useState<Record<string, string>>({});
  const [localNotes, setLocalNotes] = React.useState<Record<string, string>>({});

  const handleAddRow = async () => {
    if (!currentUser) return;
    const newId = generateUUID();
    const newProj = {
      id: newId,
      name: 'New Project',
      status: 'Planning',
      notes: ''
    };

    const currentList = useDataStore.getState().standaloneProjects;
    const next = [...currentList, newProj];
    useDataStore.setState({ standaloneProjects: next });
    safeWriteCache('standaloneProjects', next);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase!.from('standalone_projects').insert(newProj).select();
        if (error) throw error;
        if (data?.[0]) {
          const latestList = useDataStore.getState().standaloneProjects;
          const updatedList = latestList.map(p => p.id === newId ? data[0] : p);
          useDataStore.setState({ standaloneProjects: updatedList });
          safeWriteCache('standaloneProjects', updatedList);
        }
        addToast('Project row added successfully!', 'success');
      } catch (err: any) {
        addToast(err.message || 'Failed to add project row.', 'error');
      }
    }
  };

  const handleUpdateField = async (id: string, updates: any) => {
    if (!currentUser) return;
    const currentList = useDataStore.getState().standaloneProjects;
    const next = currentList.map(p => p.id === id ? { ...p, ...updates } : p);
    useDataStore.setState({ standaloneProjects: next });
    safeWriteCache('standaloneProjects', next);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase!.from('standalone_projects').update(updates).eq('id', id);
        if (error) throw error;
      } catch (err: any) {
        addToast(err.message || 'Failed to save changes.', 'error');
      }
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this project status row?')) return;

    const currentList = useDataStore.getState().standaloneProjects;
    const next = currentList.filter(p => p.id !== id);
    useDataStore.setState({ standaloneProjects: next });
    safeWriteCache('standaloneProjects', next);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase!.from('standalone_projects').delete().eq('id', id);
        if (error) throw error;
        addToast('Project row deleted.', 'success');
      } catch (err: any) {
        addToast(err.message || 'Failed to delete project row.', 'error');
      }
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'In Progress': return 'bg-primary/10 text-primary border-primary/20';
      case 'On Hold': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Completed': return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3 border-b border-border/40">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Briefcase className="h-7 w-7 text-primary" /> Project Status Board
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Standalone list of monitored projects and their progress. Updates are saved automatically in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary cursor-pointer shadow-xs transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {currentUser && (
            <button 
              onClick={handleAddRow}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer shadow-sm shadow-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Project Row
            </button>
          )}
        </div>
      </div>

      {/* Main Board Table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading Project Board...</span>
          </div>
        </div>
      ) : standaloneProjects.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground select-none">
                  <th className="p-4 w-12 text-center">No.</th>
                  <th className="p-4 min-w-[200px]">Project Name</th>
                  <th className="p-4 w-[160px]">Status</th>
                  <th className="p-4">Notes</th>
                  {currentUser && <th className="p-4 w-16 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {standaloneProjects.map((proj, idx) => (
                  <tr key={proj.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 text-center font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="p-4">
                      {currentUser ? (
                        <input
                          type="text"
                          value={localNames[proj.id] !== undefined ? localNames[proj.id] : proj.name}
                          onChange={(e) => setLocalNames({ ...localNames, [proj.id]: e.target.value })}
                          onBlur={() => {
                            if (localNames[proj.id] !== undefined && localNames[proj.id].trim() !== '') {
                              handleUpdateField(proj.id, { name: localNames[proj.id].trim() });
                            }
                          }}
                          className="w-full bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary px-1 py-1 text-xs font-semibold text-foreground focus-visible:outline-none"
                          placeholder="Enter project name..."
                        />
                      ) : (
                        <span className="font-semibold text-foreground px-1">{proj.name}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {currentUser ? (
                        <select
                          value={proj.status}
                          onChange={(e) => handleUpdateField(proj.id, { status: e.target.value })}
                          className={`h-8 w-full rounded-lg border bg-card px-2.5 py-0.5 text-xs text-foreground font-semibold focus-visible:outline-none cursor-pointer ${getStatusBadgeColor(proj.status)}`}
                        >
                          {PROJECT_STATUS_OPTIONS.map(st => (
                            <option key={st} value={st} className="bg-card text-foreground font-semibold">{st}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider ${getStatusBadgeColor(proj.status)}`}>
                          {proj.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {currentUser ? (
                        <input
                          type="text"
                          value={localNotes[proj.id] !== undefined ? localNotes[proj.id] : (proj.notes || '')}
                          onChange={(e) => setLocalNotes({ ...localNotes, [proj.id]: e.target.value })}
                          onBlur={() => {
                            if (localNotes[proj.id] !== undefined) {
                              handleUpdateField(proj.id, { notes: localNotes[proj.id].trim() });
                            }
                          }}
                          className="w-full bg-transparent border-b border-transparent hover:border-border/60 focus:border-primary px-1 py-1 text-xs text-foreground focus-visible:outline-none"
                          placeholder="Add project notes..."
                        />
                      ) : (
                        <span className="text-muted-foreground px-1">{proj.notes || '—'}</span>
                      )}
                    </td>
                    {currentUser && (
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteRow(proj.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-card text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer shadow-xs transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center shadow-xs select-none">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No projects listed yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Create independent projects status streams to track your high-level pipeline.
          </p>
          {currentUser && (
            <button 
              onClick={handleAddRow}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-hover mt-4 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Project Row
            </button>
          )}
        </div>
      )}
    </div>
  );
}
