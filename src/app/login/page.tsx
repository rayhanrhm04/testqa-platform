'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { FormGroup, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (currentUser) {
      router.push(activeRole === 'Reporter' ? '/reports' : '/');
    }
  }, [currentUser, activeRole, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      addToast('All fields are required.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      addToast('Welcome back!', 'success');
      // Redirect based on role permissions
      const nextRole = useAuthStore.getState().activeRole;
      router.push(nextRole === 'Reporter' ? '/reports' : '/');
    } catch (err: any) {
      console.error(err);
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        addToast(
          'Email belum dikonfirmasi! Cek inbox email Anda untuk verifikasi, atau matikan "Confirm email" di dashboard Supabase (Authentication -> Providers -> Email).',
          'warning'
        );
      } else {
        addToast(err.message || 'Login failed.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, pass: string) => {
    setLoading(true);
    try {
      await signIn(demoEmail, pass);
      addToast('Demo login successful!', 'success');
      const nextRole = useAuthStore.getState().activeRole;
      router.push(nextRole === 'Reporter' ? '/reports' : '/');
    } catch (err: any) {
      addToast('Demo login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'Sarah Connor (Admin)', email: 'sarah.connor@portal.qa', pass: 'admin123', role: 'Admin' },
    { name: 'Alex Mercer (QA Engineer)', email: 'alex.mercer@portal.qa', pass: 'qa123', role: 'QA Engineer' },
    { name: 'Linus Torvalds (Developer)', email: 'linus.t@portal.qa', pass: 'dev123', role: 'Developer' },
    { name: 'GIS Team (Reporter)', email: 'gis.team@portal.qa', pass: 'reporter123', role: 'Reporter' },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center bg-background px-4 py-8 text-left">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-lg">
            QA
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome to QA Portal</h2>
          <p className="text-xs text-muted-foreground">Log in to manage feedbacks, test case runs, and release notes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup label="Email Address">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.connor@portal.qa" 
                className="pl-9"
              />
            </div>
          </FormGroup>

          <FormGroup label="Password">
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="pl-9"
              />
            </div>
          </FormGroup>

          <Button type="submit" loading={loading} className="w-full font-semibold cursor-pointer">
            Sign In
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </form>

        {/* Demo Quick Logins */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Reviewer Quick Logins
          </p>
          <div className="grid gap-2 grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleQuickLogin(account.email, account.pass)}
                disabled={loading}
                className="text-left p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer text-xs"
              >
                <p className="font-bold truncate text-foreground">{account.role}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{account.name.split(' ')[0]}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
