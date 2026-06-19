'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { FormGroup, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<any>('Reporter');
  const [loading, setLoading] = React.useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (currentUser) {
      router.push(role === 'Reporter' ? '/reports' : '/');
    }
  }, [currentUser, router, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      addToast('All fields are required.', 'warning');
      return;
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await signUp(name, email, password, role);
      addToast('Registration successful!', 'success');
      router.push(role === 'Reporter' ? '/reports' : '/');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-background px-4 py-8 text-left">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-lg">
            QA
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Create your account</h2>
          <p className="text-xs text-muted-foreground">Select your role and initialize your QA Portal workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup label="Full Name">
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe" 
                className="pl-9"
              />
            </div>
          </FormGroup>

          <FormGroup label="Email Address">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@portal.qa" 
                className="pl-9"
              />
            </div>
          </FormGroup>

          <FormGroup label="Password (Min. 6 characters)">
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

          <FormGroup label="Select Workspace Role">
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
              <Select 
                value={role} 
                onChange={(e) => setRole(e.target.value as any)}
                className="pl-9"
              >
                <option value="Reporter">Reporter (Reports & Analytics access only)</option>
                <option value="Developer">Developer (Assigned Bugs access)</option>
                <option value="QA Engineer">QA Engineer (Full Testing suite access)</option>
                <option value="Admin">Admin (Full administrator control)</option>
              </Select>
            </div>
          </FormGroup>

          <Button type="submit" loading={loading} className="w-full font-semibold cursor-pointer">
            Register Account
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
