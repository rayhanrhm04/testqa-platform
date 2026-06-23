'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { UserFeedbackTopic, USER_FEEDBACK_TOPICS } from '@/lib/validators';
import { 
  MessageCircle, Search, Trash2, Filter, Mail, Globe, 
  Clock, CheckCircle, AlertTriangle, HelpCircle, Layers, MapPin, Inbox
} from 'lucide-react';
import { FormGroup, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function UserFeedbackPage() {
  const { userFeedbacks, projects, projectShares, deleteUserFeedback } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  // Filter states
  const [search, setSearch] = React.useState('');
  const [topicFilter, setTopicFilter] = React.useState('all');
  const [projectFilter, setProjectFilter] = React.useState('all');

  // Permissions helper
  const canDeleteFeedback = React.useCallback((projId: string) => {
    if (!currentUser) return false;
    if (activeRole === 'Admin' || activeRole === 'QA Engineer') return true;
    const shares = projectShares.filter(s => s.project_id === projId);
    if (shares.length === 0) {
      return activeRole === 'Developer';
    }
    const userShare = shares.find(s => s.user_id === currentUser.id);
    return userShare?.role === 'Editor';
  }, [activeRole, projectShares, currentUser]);

  const handleDeleteFeedback = async (id: string, projId: string) => {
    if (!canDeleteFeedback(projId)) {
      addToast('Akses ditolak. Anda tidak memiliki izin menghapus feedback di proyek ini.', 'error');
      return;
    }
    if (confirm('Hapus log feedback pengguna ini?')) {
      try {
        await deleteUserFeedback(id);
        addToast('Log feedback berhasil dihapus.', 'success');
      } catch (err: any) {
        addToast('Gagal menghapus log feedback.', 'error');
      }
    }
  };

  // Filter logic
  const filteredFeedbacks = React.useMemo(() => {
    return userFeedbacks.filter((ufb) => {
      const matchSearch = ufb.message.toLowerCase().includes(search.toLowerCase()) || 
                          (ufb.email && ufb.email.toLowerCase().includes(search.toLowerCase()));
      const matchTopic = topicFilter === 'all' || ufb.topic === topicFilter;
      const matchProject = projectFilter === 'all' || ufb.project_id === projectFilter;
      return matchSearch && matchTopic && matchProject;
    });
  }, [userFeedbacks, search, topicFilter, projectFilter]);

  // Statistics calculation
  const stats = React.useMemo(() => {
    const total = filteredFeedbacks.length;
    const byTopic = USER_FEEDBACK_TOPICS.reduce((acc, topic) => {
      acc[topic] = filteredFeedbacks.filter(f => f.topic === topic).length;
      return acc;
    }, {} as Record<string, number>);
    return { total, byTopic };
  }, [filteredFeedbacks]);

  // Topic Color Mapping
  const getTopicBadgeStyle = (topic: UserFeedbackTopic) => {
    switch (topic) {
      case 'Site Selection':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-500 dark:text-blue-400';
      case 'Site Analysis':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 dark:text-indigo-400';
      case 'GIS Tool':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400';
      case 'Import Data':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400';
      case 'Maps':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-500 dark:text-purple-400';
      case 'UX Improvement':
        return 'bg-pink-500/10 border-pink-500/30 text-pink-500 dark:text-pink-400';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" /> User Feedback Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar laporan masukan, perbaikan UX, dan keluhan data yang diinput oleh pengguna luar di platform <strong>GEO MAPID</strong>.
          </p>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Feedbacks */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-3 bg-primary/10 text-primary border border-primary/15">
            <Inbox className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Feedbacks</span>
            <span className="text-2xl font-black text-foreground">{stats.total}</span>
          </div>
        </div>

        {/* Site Selection */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-3 bg-blue-500/10 text-blue-500 border border-blue-500/15">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Site Selection</span>
            <span className="text-2xl font-black text-foreground">{stats.byTopic['Site Selection'] || 0}</span>
          </div>
        </div>

        {/* GIS Tool */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">GIS Tools</span>
            <span className="text-2xl font-black text-foreground">{stats.byTopic['GIS Tool'] || 0}</span>
          </div>
        </div>

        {/* UX Improvement */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-3 bg-pink-500/10 text-pink-500 border border-pink-500/15">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">UX Improvements</span>
            <span className="text-2xl font-black text-foreground">{stats.byTopic['UX Improvement'] || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter Board */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Filter & Pencarian</span>
        </div>
        
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-12">
          {/* Search bar */}
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kata kunci masukan atau email pengirim..."
              className="pl-9 text-xs w-full"
            />
          </div>

          {/* Topic selector */}
          <div className="sm:col-span-3">
            <Select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="text-xs">
              <option value="all">Semua Kategori/Topik</option>
              {USER_FEEDBACK_TOPICS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          {/* Project selector */}
          <div className="sm:col-span-3">
            <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-xs">
              <option value="all">Semua Proyek Platform</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-4 w-[20%]">Pengirim (Sender)</th>
                <th className="p-4 w-[15%]">Kategori (Topic)</th>
                <th className="p-4 w-[15%]">Proyek Target</th>
                <th className="p-4 w-[35%]">Pesan Masukan (Feedback)</th>
                <th className="p-4 w-[10%]">Tanggal</th>
                <th className="p-4 w-[5%] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map((ufb) => {
                  const proj = projects.find(p => p.id === ufb.project_id);
                  const hasDeleteAccess = canDeleteFeedback(ufb.project_id);
                  return (
                    <tr key={ufb.id} className="hover:bg-muted/10 transition-all group">
                      {/* Sender */}
                      <td className="p-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                            {ufb.email ? ufb.email.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <span className="truncate max-w-[150px]" title={ufb.email || 'Anonymous Guest'}>
                            {ufb.email || 'Anonymous Guest'}
                          </span>
                        </div>
                      </td>

                      {/* Topic Badge */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide inline-block ${getTopicBadgeStyle(ufb.topic)}`}>
                          {ufb.topic}
                        </span>
                      </td>

                      {/* Project Name */}
                      <td className="p-4 text-muted-foreground font-medium">
                        {proj ? proj.name : 'Unknown Project'}
                      </td>

                      {/* Message Content */}
                      <td className="p-4 text-foreground font-medium leading-relaxed max-w-sm">
                        <div className="line-clamp-2 hover:line-clamp-none transition-all duration-300">
                          {ufb.message}
                        </div>
                      </td>

                      {/* Submission Date */}
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(ufb.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>

                      {/* Delete Action */}
                      <td className="p-4 text-center">
                        {hasDeleteAccess ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteFeedback(ufb.id, ufb.project_id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1.5 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center"
                            title="Hapus log feedback"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30 font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground border-dashed border-t border-border">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Inbox className="h-10 w-10 mx-auto text-muted-foreground/25 animate-pulse" />
                      <p className="font-bold text-foreground/80">Log feedback kosong</p>
                      <p className="text-[10px] leading-relaxed">
                        Tidak ada log data feedback pengguna yang sesuai dengan filter pencarian aktif.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
