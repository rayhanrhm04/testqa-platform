'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { Eye, EyeOff, Info } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

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

  return (
    <div className="min-h-screen w-full flex bg-white text-gray-900 font-sans antialiased">
      {/* Left Pane: Branding & Info */}
      <div 
        className="hidden md:flex md:w-[42%] lg:w-[38%] bg-[#0e0f11] p-12 lg:p-16 flex-col justify-between relative text-white select-none overflow-hidden"
        style={{
          backgroundImage: "url('/topography.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none" />

        {/* Brand Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 20L14 4L9 20H4Z" fill="#00D2FF" />
            <path d="M9 20L14 4L19 20H9Z" fill="#2979FF" />
            <path d="M14 4L24 20H19L14 4Z" fill="#00E575" />
          </svg>
          <span className="text-xl font-extrabold tracking-wider text-white">MAPID</span>
        </div>

        {/* Main Product Info */}
        <div className="relative z-10 space-y-2 mt-auto mb-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">GEO MAPID</h1>
            <button className="text-gray-400 hover:text-white transition-colors" title="Info">
              <Info className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-300 text-sm font-medium tracking-wide">
            PT. Multi Areal Planning Indonesia
          </p>
        </div>

        {/* Footer Version Info */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-gray-400 font-medium">
          <span>Version 2.53.18</span>
          <span className="text-gray-600">•</span>
          <a 
            href="https://www.mapid.io" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white hover:underline transition-colors flex items-center gap-0.5"
          >
            About Us
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="w-full md:w-[58%] lg:w-[62%] bg-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-y-auto">
        
        {/* Header Right: Logo text */}
        <div className="flex items-center justify-end w-full mb-8 sm:mb-0">
          {/* Connected Future text */}
          <div className="text-right flex flex-col leading-none">
            <span className="text-[10px] font-medium tracking-[0.2em] text-gray-400 uppercase">CONNECTED</span>
            <span className="text-[11px] font-black tracking-[0.2em] text-[#0f141d] uppercase mt-0.5">FUTURE</span>
          </div>
        </div>

        {/* Centered Login Box */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <h2 className="text-3xl font-extrabold text-[#0f141d] tracking-tight mb-2">
            Sign In
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">
            Sign In your account - and enjoy to exclusive features and many more.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-sans">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f141d]/15 focus:border-[#0f141d] transition-all font-medium text-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-sans">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f141d]/15 focus:border-[#0f141d] transition-all font-medium text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[13px] text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-[#0f141d] select-none transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#0f141d] focus:ring-[#0f141d] cursor-pointer"
                />
                <span>Remember Me</span>
              </label>
              <a href="#" className="text-gray-600 hover:text-[#0f141d] hover:underline transition-colors">
                Forgot your password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0f141d] hover:bg-[#1f2937] active:bg-[#111827] text-white font-bold rounded-lg transition-all shadow-md shadow-[#0f141d]/10 flex items-center justify-center cursor-pointer disabled:opacity-75 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer: Bottom navigation to Register */}
        <div className="w-full text-center text-xs text-gray-500 font-medium">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#0f141d] font-bold hover:underline ml-1">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
