'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { FormGroup, Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { ChevronLeft, Upload, Link as LinkIcon, Smile, User, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

const EMOJI_LIST = [
  '👨‍💻', '👩‍💻', '🦊', '🚀', '🐼', '🤖', '🎨', '🧪', '📊', '🦄', '⚡', '🍀',
  '🦁', '🐯', '🐨', '🐱', '🐶', '🐸', '🐵', '🦉', '🦋', '🌴', '🌎', '🌈',
  '🍎', '🍕', '🍩', '🎭', '🎬', '🎧', '🎮', '🚗', '✈️', '💻', '💡', '🏆',
  '🎖️', '📢', '💬', '❤️', '🌟', '✨', '🎯', '⚙️', '🔒', '🔑', '🛡️', '📦'
];

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('');
  const [avatarType, setAvatarType] = React.useState<'emoji' | 'url' | 'upload'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = React.useState('👨‍💻');
  const [imageUrl, setImageUrl] = React.useState('');
  const [uploadedBase64, setUploadedBase64] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setRole(currentUser.role);
      
      const avatar = currentUser.avatar_url;
      if (avatar) {
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
          setAvatarType('url');
          setImageUrl(avatar);
        } else if (avatar.startsWith('data:')) {
          setAvatarType('upload');
          setUploadedBase64(avatar);
        } else {
          setAvatarType('emoji');
          setSelectedEmoji(avatar);
        }
      }
    } else {
      router.push('/login');
    }
  }, [currentUser, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast('File size exceeds 2MB limit.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getActiveAvatarValue = () => {
    if (avatarType === 'emoji') return selectedEmoji;
    if (avatarType === 'url') return imageUrl;
    if (avatarType === 'upload') return uploadedBase64;
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      addToast('Name is required.', 'warning');
      return;
    }

    setIsSaving(true);
    const activeAvatar = getActiveAvatarValue();

    try {
      const updatedProfile = {
        name: name.trim(),
        avatar_url: activeAvatar || null
      };

      if (isSupabaseConfigured()) {
        const { error } = await supabase!
          .from('users')
          .update(updatedProfile)
          .eq('id', currentUser.id);

        if (error) throw error;
      }

      // Update local state
      const updatedUser = {
        ...currentUser,
        ...updatedProfile
      };
      useAuthStore.setState({ currentUser: updatedUser });
      localStorage.setItem('qa_current_user', JSON.stringify(updatedUser));

      // Log activity
      try {
        await supabase!.from('activity_logs').insert({
          user_id: currentUser.id,
          action: 'Updated profile details & avatar',
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        // Safe to ignore activity log error
      }

      addToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error('Save profile error:', err);
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  const currentPreviewAvatar = getActiveAvatarValue();

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left pb-12 select-none">
      {/* Back button */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold">
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-foreground">Customize Profile</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure your personal QA profile, initials, emoticon badge, or custom picture.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start pb-6 border-b border-border/60">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preview</span>
              <div className="h-24 w-24 rounded-full border border-border/80 flex items-center justify-center bg-[#00E575] text-white font-black text-2xl shadow-sm relative overflow-hidden select-none">
                <Avatar 
                  user={null} 
                  name={name} 
                  avatarUrl={currentPreviewAvatar} 
                  className="h-24 w-24 text-white text-3xl" 
                  fallbackChar={name.charAt(0) || 'A'} 
                />
              </div>
            </div>

            {/* Avatar Type Picker */}
            <div className="flex-1 space-y-4 w-full">
              <span className="text-xs font-bold text-foreground block">Profile Picture Type</span>
              
              <div className="flex rounded-lg border border-border p-0.5 bg-zinc-50 dark:bg-zinc-900/50 max-w-sm">
                <button
                  type="button"
                  onClick={() => setAvatarType('emoji')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    avatarType === 'emoji' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Smile className="h-3.5 w-3.5" />
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarType('url')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    avatarType === 'url' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarType('upload')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    avatarType === 'upload' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
              </div>

              {/* Emoji Selection Grid */}
              {avatarType === 'emoji' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Choose Emoticon</span>
                  <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/30 border border-border/60 rounded-xl max-h-[140px] overflow-y-auto">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`h-9 w-9 text-lg rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          selectedEmoji === emoji ? 'bg-primary text-primary-foreground scale-110 shadow-xs' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image URL Picker */}
              {avatarType === 'url' && (
                <FormGroup label="Paste Image URL">
                  <Input 
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/profile.jpg"
                    className="bg-transparent"
                  />
                  <span className="text-[10px] text-muted-foreground leading-normal mt-1 block">Supported formats: JPG, PNG, WEBP. Ensure the URL starts with http:// or https://.</span>
                </FormGroup>
              )}

              {/* Upload image Picker */}
              {avatarType === 'upload' && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Upload Image File</span>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 border border-border bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-lg text-xs font-bold text-foreground cursor-pointer transition-all shadow-xs shrink-0">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      Browse Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {uploadedBase64 ? 'Image selected' : 'No file selected (Max 2MB)'}
                    </span>
                  </div>
                  {uploadedBase64 && (
                    <button 
                      type="button"
                      onClick={() => setUploadedBase64('')}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Clear Uploaded Image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Fields Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label="Full Name">
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Adam" 
                  className="pl-9 bg-transparent"
                />
              </div>
            </FormGroup>

            <FormGroup label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  value={email} 
                  disabled
                  placeholder="adam@portal.qa" 
                  className="pl-9 bg-zinc-50/50 dark:bg-zinc-900/30 text-muted-foreground border-border/80"
                />
              </div>
            </FormGroup>

            <FormGroup label="Security Role">
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  value={role} 
                  disabled
                  placeholder="Reporter" 
                  className="pl-9 bg-zinc-50/50 dark:bg-zinc-900/30 text-muted-foreground border-border/80"
                />
              </div>
            </FormGroup>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
            <Link href="/">
              <Button type="button" variant="outline" className="cursor-pointer">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={isSaving} className="font-semibold cursor-pointer">
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
