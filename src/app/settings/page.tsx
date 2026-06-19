'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  Settings, Folder, Users, Database, Plus, Edit, 
  Trash2, Copy, Download, ShieldCheck, ShieldAlert, Share2, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormGroup, Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { 
    projects, users, updateUserRole, addProject, updateProject, deleteProject, logActivity,
    projectShares, shareProject, unshareProject, updateProjectShareRole
  } = useDataStore();
  const { activeRole, currentUser, setRole } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = React.useState('projects');
  const [origin, setOrigin] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);
  
  // Project form modal state
  const [isProjOpen, setIsProjOpen] = React.useState(false);
  const [editingProj, setEditingProj] = React.useState<any | null>(null);
  const [projName, setProjName] = React.useState('');
  const [projDesc, setProjDesc] = React.useState('');

  // Project share modal state
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [sharingProj, setSharingProj] = React.useState<any | null>(null);
  const [shareUserId, setShareUserId] = React.useState('');
  const [shareRole, setShareRole] = React.useState<'Editor' | 'Viewer'>('Viewer');

  const currentShares = React.useMemo(() => {
    if (!sharingProj) return [];
    return projectShares.filter(s => s.project_id === sharingProj.id);
  }, [projectShares, sharingProj]);

  const availableUsers = React.useMemo(() => {
    return users.filter(u => {
      const isSelf = u.id === currentUser?.id;
      const isAlreadyShared = currentShares.some(s => s.user_id === u.id);
      return !isSelf && !isAlreadyShared;
    });
  }, [users, currentUser, currentShares]);

  const handleAddShare = async () => {
    if (!shareUserId || !sharingProj) {
      addToast('Please select a user to share with.', 'warning');
      return;
    }
    const userToShare = users.find(u => u.id === shareUserId);
    try {
      await shareProject(sharingProj.id, shareUserId, shareRole);
      addToast(`Shared project with ${userToShare?.name} as ${shareRole}!`, 'success');
      setShareUserId('');
    } catch (e) {
      addToast('Failed to share project.', 'error');
    }
  };

  React.useEffect(() => {
    if (editingProj) {
      setProjName(editingProj.name);
      setProjDesc(editingProj.description || '');
    } else {
      setProjName('');
      setProjDesc('');
    }
  }, [editingProj]);

  const canModify = !currentUser || activeRole === 'Admin' || activeRole === 'QA Engineer';

  const handleProjSubmit = async () => {
    if (!projName.trim()) {
      addToast('Project Name is required.', 'warning');
      return;
    }

    try {
      if (editingProj) {
        await updateProject(editingProj.id, projName, projDesc);
        addToast(`Project "${projName}" updated!`, 'success');
      } else {
        await addProject(projName, projDesc);
        addToast(`Project "${projName}" created successfully!`, 'success');
      }
      setIsProjOpen(false);
      setEditingProj(null);
    } catch (e) {
      addToast('Failed to save project.', 'error');
    }
  };

  const handleProjDelete = async (id: string, name: string) => {
    if (confirm(`Delete project "${name}"? This will delete all feedbacks and issues mapped to it.`)) {
      await deleteProject(id);
      addToast(`Deleted project "${name}"!`, 'success');
    }
  };

  const handleExportSQL = () => {
    const sqlText = `
-- Supabase Schema for QA Management System
CREATE TYPE user_role AS ENUM ('Admin', 'QA Engineer', 'Developer', 'Reporter');
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE feedback_status AS ENUM ('Open', 'Reviewed', 'Implemented', 'Rejected');
CREATE TYPE severity_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE issue_status AS ENUM ('Open', 'In Progress', 'Ready QA', 'Verified', 'Closed');
CREATE TYPE issue_type AS ENUM ('Bug', 'Improvement');
CREATE TYPE release_status AS ENUM ('Draft', 'Released');
CREATE TYPE test_run_status AS ENUM ('Draft', 'In Progress', 'Completed');
CREATE TYPE test_result_value AS ENUM ('Pass', 'Fail', 'Blocked', 'Not Run');

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'Reporter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ... (full SQL schema is available at workspace/supabase-schema.sql)
    `;
    const blob = new Blob([sqlText], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supabase_qa_portal_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('SQL schema script exported!', 'success');
  };

  const settingTabs = [
    { id: 'projects', label: 'Projects Manager', icon: <Folder className="h-4 w-4" /> },
    { id: 'users', label: 'Users & Roles', icon: <Users className="h-4 w-4" /> },
    { id: 'database', label: 'Supabase DB Sync', icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 text-left max-w-4xl">
      {/* Title */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Portal Settings</h1>
        <p className="text-sm text-muted-foreground">Manage project workspace settings, inspect user access controls, and configure database syncing.</p>
      </div>

      {/* Tabs */}
      <Tabs tabs={settingTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Contents: Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Workspace Projects</h3>
            {canModify && (
              <Button onClick={() => {
                if (!currentUser) {
                  router.push('/login');
                  return;
                }
                setEditingProj(null); 
                setIsProjOpen(true); 
              }} className="h-8.5 text-xs font-semibold cursor-pointer">
                <Plus className="h-4 w-4 mr-1" /> Add Project
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((proj) => (
              <div key={proj.id} className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between hover:border-primary/20 transition-all">
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground">{proj.name}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span>Created: {new Date(proj.created_at).toLocaleDateString()}</span>
                  {canModify && (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-primary hover:bg-primary/10" 
                        onClick={() => {
                          if (!currentUser) {
                            router.push('/login');
                            return;
                          }
                          setSharingProj(proj); 
                          setIsShareOpen(true); 
                        }} 
                        title="Share / Collaboration"
                      >
                        <Share2 className="h-3.5 w-3.5" />
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
                          setEditingProj(proj); 
                          setIsProjOpen(true); 
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500 hover:bg-red-500/10" 
                        onClick={() => {
                          if (!currentUser) {
                            router.push('/login');
                            return;
                          }
                          handleProjDelete(proj.id, proj.name);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Contents: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">User Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Mock directory for demo role switching. Change user roles to verify permission states.</p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full border-collapse text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border bg-muted/30 font-semibold text-muted-foreground text-xs">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Active Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-bold flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {user.name.charAt(0)}
                      </div>
                      {user.name}
                    </td>
                    <td className="p-4 text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        user.role === 'Admin' 
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : user.role === 'QA Engineer'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : user.role === 'Developer'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {/* Dropdown select to instantly switch roles */}
                      <select 
                        value={user.role}
                        onChange={async (e) => {
                          if (!currentUser) {
                            router.push('/login');
                            return;
                          }
                          const nextRole = e.target.value as any;
                          await updateUserRole(user.id, nextRole);
                          if (user.id === currentUser?.id) {
                            setRole(nextRole);
                          }
                          addToast(`Changed ${user.name}'s role to ${nextRole}`, 'success');
                        }}
                        className="bg-card text-xs font-semibold text-foreground border border-border rounded-md p-1 focus:outline-none"
                      >
                        <option value="Admin">Admin</option>
                        <option value="QA Engineer">QA Engineer</option>
                        <option value="Developer">Developer</option>
                        <option value="Reporter">Reporter</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: Database Sync */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Supabase PostgreSQL Synchronization</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Enable persistent multi-user setups by connecting a Supabase project.</p>
          </div>

          {/* Sync Connection Card */}
          <div className="bg-card rounded-xl border border-border p-5 grid gap-4 sm:grid-cols-3 items-center">
            <div className="col-span-2 space-y-1">
              <h4 className="font-bold flex items-center gap-2">
                Sync Connection Status
              </h4>
              <p className="text-xs text-muted-foreground">
                To sync, specify your URL and Anon Key inside your <code className="bg-muted px-1 py-0.5 rounded text-foreground font-semibold">.env.local</code> configuration file.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportSQL}
                className="text-xs font-bold cursor-pointer"
              >
                <Download className="h-4 w-4 mr-1.5" /> Export Migration SQL
              </Button>
            </div>
          </div>

          {/* Migration details */}
          <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Initialization Migration Instructions</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              1. Copy the SQL schema file from <code className="bg-card px-1 py-0.5 rounded text-foreground font-semibold">supabase-schema.sql</code> at your project root.<br/>
              2. Navigate to your **Supabase Console** &rarr; **SQL Editor** &rarr; **New Query**.<br/>
              3. Paste and click **Run**. This generates all necessary schemas, tables, permissions policies, and hooks.
            </p>
          </div>
        </div>
      )}

      {/* Project form dialog */}
      <Dialog
        isOpen={isProjOpen}
        onClose={() => { setIsProjOpen(false); setEditingProj(null); }}
        title={editingProj ? 'Modify Project' : 'Create Project'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsProjOpen(false); setEditingProj(null); }}>Cancel</Button>
            <Button onClick={handleProjSubmit}>Save Project</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormGroup label="Project Name">
            <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="e.g. MAPID MOBILE" />
          </FormGroup>

          <FormGroup label="Description">
            <Textarea value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="Geospatial details..." rows={3} />
          </FormGroup>
        </div>
      </Dialog>

      {/* Project sharing dialog */}
      <Dialog
        isOpen={isShareOpen}
        onClose={() => { setIsShareOpen(false); setSharingProj(null); setShareUserId(''); }}
        title={sharingProj ? `Share Project: ${sharingProj.name}` : 'Share Project'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsShareOpen(false); setSharingProj(null); setShareUserId(''); }}>Close</Button>
          </div>
        }
        size="lg"
      >
        <div className="space-y-5 text-left">
          {/* Public Share Link */}
          {sharingProj && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" /> Public Viewer Link
                </h4>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">No Login Required</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Anyone with this link can view this project's test cases, suites, runs, and issues as a read-only viewer, without having to sign in.
              </p>
              <div className="flex gap-2 items-center pt-1">
                <input 
                  type="text" 
                  readOnly
                  value={`${origin}/test-cases?project=${sharingProj.id}`}
                  className="flex-1 bg-muted/50 border border-border text-xs rounded-lg px-3 py-1.5 font-mono text-muted-foreground select-all focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button 
                  onClick={() => {
                    const link = `${origin}/test-cases?project=${sharingProj.id}`;
                    navigator.clipboard.writeText(link);
                    addToast('Copied public share link to clipboard!', 'success');
                  }}
                  className="cursor-pointer font-semibold shrink-0 h-8.5"
                  size="sm"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}

          {/* Add Collaborator Form */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Add Collaborator</h4>
            <div className="grid gap-3 sm:grid-cols-3 items-end">
              <FormGroup label="User Email / Name">
                <Select value={shareUserId} onChange={(e) => setShareUserId(e.target.value)}>
                  <option value="">Select a user...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Project Role">
                <Select value={shareRole} onChange={(e) => setShareRole(e.target.value as any)}>
                  <option value="Viewer">Viewer (Read-Only)</option>
                  <option value="Editor">Editor (Read/Write)</option>
                </Select>
              </FormGroup>
              <Button onClick={handleAddShare} className="cursor-pointer font-semibold h-9.5">
                Add User
              </Button>
            </div>
            {availableUsers.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">No other users available to share with.</p>
            )}
          </div>

          {/* Collaborator List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Current Collaborators</h4>
            {currentShares.length > 0 ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 font-semibold text-muted-foreground text-[10px] uppercase">
                      <th className="p-3">User</th>
                      <th className="p-3">Global Role</th>
                      <th className="p-3">Project Access</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {currentShares.map((share) => {
                      const colUser = users.find(u => u.id === share.user_id);
                      if (!colUser) return null;
                      return (
                        <tr key={share.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{colUser.name}</div>
                            <div className="text-[10px] text-muted-foreground">{colUser.email}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{colUser.role}</td>
                          <td className="p-3">
                            <select
                              value={share.role}
                              onChange={async (e) => {
                                const nextRole = e.target.value as any;
                                await updateProjectShareRole(share.id, nextRole);
                                addToast(`Updated ${colUser.name}'s project role to ${nextRole}`, 'success');
                              }}
                              className="bg-card text-xs font-semibold text-foreground border border-border rounded-md p-1 focus:outline-none"
                            >
                              <option value="Viewer">Viewer</option>
                              <option value="Editor">Editor</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                              onClick={async () => {
                                await unshareProject(share.id);
                                addToast(`Removed ${colUser.name} from collaborators`, 'success');
                              }}
                              title="Remove Collaborator"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                This project has not been shared yet. Anyone can see it, and standard permissions apply.
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
