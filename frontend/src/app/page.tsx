'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Brain, ArrowRight, Lock, Mail, User as UserIcon, Check, KeyRound } from 'lucide-react';

export default function Home() {
  const { login, register, loading } = useAuth();
  
  // viewMode can be: 'login' | 'register' | 'forgot' | 'reset'
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (viewMode === 'login') {
        await login(email, password);
      } else if (viewMode === 'register') {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccess(res.message || 'OTP verification code has been dispatched.');
      setViewMode('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);
    try {
      const res = await api.resetPassword({
        email,
        otp,
        new_password: newPassword,
      });
      setSuccess(res.message || 'Password reset successful! Please login with your new password.');
      setPassword('');
      setViewMode('login');
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0b0b12] text-[#f5f5f7] flex items-center justify-center overflow-x-hidden font-sans select-none">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-15%] w-[800px] h-[800px] bg-[#9333ea]/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[800px] h-[800px] bg-[#2563eb]/6 rounded-full blur-[160px] pointer-events-none" />
      
      {/* Page Container */}
      <div 
        className={`w-full max-w-[1600px] mx-auto p-6 md:p-16 transition-all duration-1000 transform ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        
        {/* Main Grid: Responsive 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
          
          {/* Left Hero Section (hidden on mobile < 768px/lg) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col gap-8 text-left max-w-[620px] justify-center min-h-[500px]">
            
            {/* Small rounded Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-[13px] font-bold tracking-[1px] uppercase border border-purple-500/20 w-fit select-none">
              <Brain size={14} className="animate-pulse" />
              LangGraph Platform
            </div>
            
            {/* Big Heading */}
            <h1 className="text-[60px] font-extrabold leading-[1.1] text-white tracking-tight">
              Elevate Your Health with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-fuchsia-500">
                NutriSense AI
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-[20px] leading-[1.8] text-[#A8A8B3] font-medium">
              Unlock custom meals generated on-the-fly via advanced LLM graph workflows. Featuring visual workspace builders, automated daily triggers, and contextual user memory.
            </p>

            {/* Features Checklist */}
            <div className="flex flex-col gap-4 mt-2">
              {[
                'Personalized AI Meal Plans',
                'LangGraph Memory Agent',
                'Daily Automated Notifications',
                'Adaptive Nutrition Coaching',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-4.5">
                  <div className="w-6 h-6 rounded-full bg-[#9333ea]/15 text-[#a855f7] flex items-center justify-center border border-[#9333ea]/30 shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <span className="text-[17px] font-semibold text-zinc-300">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section: Login Card Container */}
          <div className="col-span-1 lg:col-span-5 flex justify-center items-center w-full">
            <div className="w-full max-w-[520px] bg-[#12121c]/90 backdrop-blur-md border border-white/[0.08] shadow-[0_15px_45px_rgba(0,0,0,0.35)] rounded-[24px] p-8 md:p-10 relative">
              <div className="absolute top-0 right-0 w-[140px] h-[140px] bg-purple-500/5 rounded-full blur-[40px] pointer-events-none" />

              {/* Login Card Header */}
              <div className="flex flex-col gap-2.5 mb-8">
                <h2 className="text-[40px] font-bold text-white tracking-tight leading-none">
                  {viewMode === 'login' && 'Welcome Back'}
                  {viewMode === 'register' && 'Create Account'}
                  {viewMode === 'forgot' && 'Forgot Password'}
                  {viewMode === 'reset' && 'Reset Password'}
                </h2>
                <p className="text-[16px] text-zinc-400 font-medium">
                  {viewMode === 'login' && 'Sign in to access your custom daily menus'}
                  {viewMode === 'register' && 'Register now to compile your health profile parameters'}
                  {viewMode === 'forgot' && 'Enter your email to receive a 6-digit verification code'}
                  {viewMode === 'reset' && 'Enter the OTP sent to your email and select a new password'}
                </p>
              </div>

              {error && (
                <div className="p-4 mb-6 text-[13px] text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20 font-semibold">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 mb-6 text-[13px] text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 font-semibold">
                  {success}
                </div>
              )}

              {/* LOGIN & REGISTER FORMS */}
              {(viewMode === 'login' || viewMode === 'register') && (
                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5">
                  {viewMode === 'register' && (
                    <div className="flex flex-col">
                      <label className="block mb-2 text-[13px] font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                          type="text"
                          required
                          placeholder="Jane Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-[56px] pl-4.5 pr-12 rounded-[14px] text-[16px] bg-[#171722] border border-white/[0.08] text-white focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/20 outline-none transition-all duration-300"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <label className="block mb-2 text-[13px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[56px] pl-4.5 pr-12 rounded-[14px] text-[16px] bg-[#171722] border border-white/[0.08] text-white focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/20 outline-none transition-all duration-300"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[13px] font-bold uppercase tracking-wider text-zinc-400 m-0">Password</label>
                      {viewMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setSuccess('');
                            setViewMode('forgot');
                          }}
                          className="text-[12px] font-bold text-purple-400 hover:text-purple-300 bg-transparent p-0 border-none h-auto transition-colors cursor-pointer hover:translate-y-0"
                          suppressHydrationWarning
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-[56px] pl-4.5 pr-12 rounded-[14px] text-[16px] bg-[#171722] border border-white/[0.08] text-white focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/20 outline-none transition-all duration-300"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[56px] rounded-[14px] bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#a855f7] hover:to-[#9333ea] text-white font-bold text-[16px] transition-all duration-300 hover:translate-y-[-2px] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#9333ea]/20 cursor-pointer flex items-center justify-center gap-2 mt-4"
                    suppressHydrationWarning
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {viewMode === 'login' ? 'Sign In' : 'Sign Up'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {viewMode === 'forgot' && (
                <form onSubmit={handleForgotSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col">
                    <label className="block mb-2 text-[13px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[56px] pl-4.5 pr-12 rounded-[14px] text-[16px] bg-[#171722] border border-white/[0.08] text-white focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/20 outline-none transition-all duration-300"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full h-[56px] rounded-[14px] bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#a855f7] hover:to-[#9333ea] text-white font-bold text-[16px] transition-all duration-300 hover:translate-y-[-2px] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#9333ea]/20 cursor-pointer flex items-center justify-center gap-2 mt-4"
                    suppressHydrationWarning
                  >
                    {formLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Send OTP Code
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccess('');
                      setViewMode('login');
                    }}
                    className="text-[14px] font-bold text-purple-400 hover:text-purple-300 transition-colors mt-2"
                    suppressHydrationWarning
                  >
                    Back to Login
                  </button>
                </form>
              )}

              {/* RESET PASSWORD FORM */}
              {viewMode === 'reset' && (
                <form onSubmit={handleResetSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col">
                    <label className="block mb-2 text-[13px] font-bold uppercase tracking-wider text-zinc-400">6-Digit OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="123456"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full h-[56px] pl-4.5 pr-12 rounded-[14px] text-[16px] bg-[#171722] border border-white/[0.08] text-white focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/20 outline-none transition-all duration-300 tracking-[6px] font-bold text-center"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block mb-2 text-[13px] font-bold uppercase tracking-wider text-zinc-400">New Password</label>
                    <div className="relative">
                      <Lock className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-[56px] pl-4.5 pr-12 rounded-[14px] text-[16px] bg-[#171722] border border-white/[0.08] text-white focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/20 outline-none transition-all duration-300"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full h-[56px] rounded-[14px] bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#a855f7] hover:to-[#9333ea] text-white font-bold text-[16px] transition-all duration-300 hover:translate-y-[-2px] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#9333ea]/20 cursor-pointer flex items-center justify-center gap-2 mt-4"
                    suppressHydrationWarning
                  >
                    {formLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccess('');
                      setViewMode('forgot');
                    }}
                    className="text-[14px] font-bold text-purple-400 hover:text-purple-300 transition-colors mt-2"
                    suppressHydrationWarning
                  >
                    Resend Code
                  </button>
                </form>
              )}

              {/* Toggle Footer text */}
              {(viewMode === 'login' || viewMode === 'register') && (
                <div className="mt-[28px] text-center">
                  <button
                    onClick={() => {
                      setViewMode(viewMode === 'login' ? 'register' : 'login');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-[14px] font-semibold text-zinc-400 hover:text-white transition-colors bg-transparent p-0 h-auto border-none hover:translate-y-0"
                    suppressHydrationWarning
                  >
                    {viewMode === 'login' ? (
                      <>
                        Don't have an account?{' '}
                        <span className="text-purple-400 hover:text-purple-300 font-bold ml-1">
                          Sign Up
                        </span>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <span className="text-purple-400 hover:text-purple-300 font-bold ml-1">
                          Sign In
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
