'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { Eye, EyeOff, Info } from 'lucide-react';
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
  const [showPassword, setShowPassword] = React.useState(false);

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
        <div className="relative z-10">
          <img src="/logo.png" alt="MAPID" className="h-8 w-auto object-contain" />
        </div>

        {/* Main Product Info */}
        <div className="relative z-10 space-y-2 mt-auto mb-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">MAPID QA</h1>
            <button className="text-gray-400 hover:text-white transition-colors" title="Info">
              <Info className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-300 text-sm font-medium tracking-wide">
            PT. Multi Areal Planning Indonesia
          </p>
        </div>

        {/* Footer Version Info */}
        <div className="relative z-10 text-xs text-gray-400 font-medium">
          <span>Version 1.0.0</span>
        </div>
      </div>

      {/* Right Pane: Register Form */}
      <div className="w-full md:w-[58%] lg:w-[62%] bg-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-y-auto">
        
        {/* Header: Mobile Logo and Connected Future */}
        <div className="flex items-center justify-between w-full mb-8 sm:mb-0">
          {/* Mobile Logo & Brand (Only visible on mobile screens) - wrapped in dark badge to make white text logo visible */}
          <div className="flex md:hidden items-center bg-[#0e0f11] px-3 py-1.5 rounded-lg shadow-sm">
            <img src="/logo.png" alt="MAPID" className="h-5 w-auto object-contain" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider ml-2 bg-primary px-1.5 py-0.5 rounded-sm">QA</span>
          </div>

          {/* Connected Future text */}
          <div className="text-right flex flex-col leading-none ml-auto">
            <span className="text-[10px] font-medium tracking-[0.2em] text-gray-400 uppercase">CONNECTED</span>
            <span className="text-[11px] font-black tracking-[0.2em] text-[#0f141d] uppercase mt-0.5">FUTURE</span>
          </div>
        </div>

        {/* Centered Register Box */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <h2 className="text-3xl font-extrabold text-[#0f141d] tracking-tight mb-2">
            Sign Up
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
            Create your account - and enjoy to exclusive features and many more.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-sans">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f141d]/15 focus:border-[#0f141d] transition-all font-medium text-sm"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-sans">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f141d]/15 focus:border-[#0f141d] transition-all font-medium text-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
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
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f141d]/15 focus:border-[#0f141d] transition-all font-medium text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[11px] text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Role Select Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-sans">
                Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0f141d]/15 focus:border-[#0f141d] transition-all font-medium text-sm cursor-pointer"
              >
                <option value="Reporter">Reporter (Reports & Analytics access only)</option>
                <option value="Developer">Developer (Assigned Bugs access)</option>
                <option value="QA Engineer">QA Engineer (Full Testing suite access)</option>
                <option value="Admin">Admin (Full administrator control)</option>
                <option value="PSE">PSE (Release Notes, Calendar, Projects access)</option>
              </select>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 py-3 bg-[#0f141d] hover:bg-[#1f2937] active:bg-[#111827] text-white font-bold rounded-lg transition-all shadow-md shadow-[#0f141d]/10 flex items-center justify-center cursor-pointer disabled:opacity-75 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign Up'
              )}
            </button>
          </form>
        </div>

        {/* Footer: Bottom navigation to Login */}
        <div className="w-full text-center text-xs text-gray-500 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0f141d] font-bold hover:underline ml-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
