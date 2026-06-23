'use client';

import * as React from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { UserFeedbackTopic, USER_FEEDBACK_TOPICS } from '@/lib/validators';
import { 
  MessageCircle, Search, Trash2, Filter, Mail, Globe, 
  Clock, Plus, Check, ShieldAlert, Sparkles, Smile, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormGroup, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function UserFeedbackPage() {
  const router = useRouter();
  const { userFeedbacks, projects, projectShares, addUserFeedback, deleteUserFeedback } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  // Widget states
  const [targetProjectId, setTargetProjectId] = React.useState('');
  const [selectedTopic, setSelectedTopic] = React.useState<UserFeedbackTopic | null>(null);
  const [message, setMessage] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter states
  const [search, setSearch] = React.useState('');
  const [topicFilter, setTopicFilter] = React.useState('all');
  const [projectFilter, setProjectFilter] = React.useState('all');

  // Initialize target project id
  React.useEffect(() => {
    if (projects.length > 0) {
      setTargetProjectId(projects[0].id);
    }
  }, [projects]);

  // Sync email input if user logged in
  React.useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email);
    }
  }, [currentUser]);

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

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast('Harap masuk terlebih dahulu untuk mengirimkan feedback!', 'warning');
      router.push('/login');
      return;
    }

    if (!targetProjectId) {
      addToast('Pilih proyek tujuan terlebih dahulu.', 'warning');
      return;
    }

    if (!selectedTopic) {
      addToast('Harap pilih topik feedback terlebih dahulu.', 'warning');
      return;
    }

    if (!message.trim() || message.length < 3) {
      addToast('Feedback harus terdiri dari minimal 3 karakter.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await addUserFeedback(targetProjectId, selectedTopic, message, email || undefined);
      addToast('User feedback berhasil dikirim!', 'success');
      setMessage('');
      setSelectedTopic(null);
    } catch (err: any) {
      addToast(err.message || 'Gagal mengirim feedback.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (id: string, projId: string) => {
    if (!canDeleteFeedback(projId)) {
      addToast('Akses ditolak. Anda tidak memiliki izin menghapus feedback di proyek ini.', 'error');
      return;
    }
    if (confirm('Hapus feedback pengguna ini?')) {
      try {
        await deleteUserFeedback(id);
        addToast('Feedback berhasil dihapus.', 'success');
      } catch (err: any) {
        addToast('Gagal menghapus feedback.', 'error');
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

  // Stats calculation
  const stats = React.useMemo(() => {
    const total = filteredFeedbacks.length;
    const byTopic = USER_FEEDBACK_TOPICS.reduce((acc, topic) => {
      acc[topic] = filteredFeedbacks.filter(f => f.topic === topic).length;
      return acc;
    }, {} as Record<string, number>);
    return { total, byTopic };
  }, [filteredFeedbacks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" /> User Feedback Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pantau dan analisis masukan pengguna langsung dari platform <strong>GEO MAPID</strong>.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* Left Column: Simulation Widget (GEO MAPID Style) */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Simulation Widget
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Formulir di bawah ini mensimulasikan widget masukan pengguna yang disematkan langsung pada aplikasi <strong>GEO MAPID</strong>.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* Project Target Selector (Mocking host system) */}
              <FormGroup label="Select Platform Project">
                <Select 
                  value={targetProjectId} 
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </FormGroup>

              {/* Email Address */}
              <FormGroup label="Sender Email (Optional)">
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="pl-9 text-xs"
                  />
                </div>
              </FormGroup>

              {/* Simulated Modal Box */}
              <div className="border border-border/80 rounded-2xl bg-muted/10 p-5 space-y-4 shadow-inner relative overflow-hidden">
                <div className="absolute right-3 top-3 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                  ✕
                </div>

                <div>
                  <h4 className="text-xl font-bold flex items-center gap-1.5 text-foreground">
                    Hello 👋
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Help us become better, report user issues or missing data
                  </p>
                </div>

                {/* Choose Topic Tag Board */}
                <div className="bg-muted/30 border border-border/40 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                    Choose topic
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {USER_FEEDBACK_TOPICS.map((topic) => {
                      const isSelected = selectedTopic === topic;
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                              : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea feedback */}
                <div className="space-y-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    placeholder="Write your feedback here"
                    className="w-full min-h-[100px] p-3 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1">
                    <span className="hover:underline cursor-pointer">Hide feedback button</span>
                    <span>{message.length}/200</span>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Feedback List Dashboard */}
        <div className="md:col-span-7 space-y-4">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border p-3 shadow-xs">
              <span className="text-[10px] text-muted-foreground font-bold uppercase block">Total Feedbacks</span>
              <span className="text-xl font-black text-foreground">{stats.total}</span>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 shadow-xs">
              <span className="text-[10px] text-muted-foreground font-bold uppercase block">Site Selection</span>
              <span className="text-xl font-black text-primary">{stats.byTopic['Site Selection'] || 0}</span>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 shadow-xs">
              <span className="text-[10px] text-muted-foreground font-bold uppercase block">GIS Tools</span>
              <span className="text-xl font-black text-emerald-500">{stats.byTopic['GIS Tool'] || 0}</span>
            </div>
          </div>

          {/* Filter Board */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Filter Feedbacks</span>
            </div>
            
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari pesan atau email..."
                  className="pl-9 text-xs"
                />
              </div>

              {/* Topic filter */}
              <Select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="text-xs">
                <option value="all">Semua Topik</option>
                {USER_FEEDBACK_TOPICS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>

              {/* Project filter */}
              <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-xs">
                <option value="all">Semua Proyek</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Feed list */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredFeedbacks.length > 0 ? (
              filteredFeedbacks.map((ufb) => {
                const proj = projects.find(p => p.id === ufb.project_id);
                const hasDeleteAccess = canDeleteFeedback(ufb.project_id);
                return (
                  <div 
                    key={ufb.id}
                    className="bg-card rounded-xl border border-border p-4 hover:border-primary/20 hover:shadow-xs transition-all space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Topic badge */}
                        <span className="px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold">
                          {ufb.topic}
                        </span>
                        {/* Project badge */}
                        <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                          {proj ? proj.name : 'Unknown Project'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(ufb.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    {/* Content Message */}
                    <p className="text-xs text-foreground font-medium leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/30">
                      "{ufb.message}"
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">{ufb.email || 'Anonymous Guest'}</span>
                      </div>

                      {hasDeleteAccess && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(ufb.id, ufb.project_id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Hapus feedback"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs font-bold text-foreground/80">Belum ada feedback yang cocok</p>
                <p className="text-[10px] text-muted-foreground mt-1">Coba sesuaikan pencarian atau filter Anda.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
