'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Utensils, GitBranch, Settings, LogOut, Brain } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Today\'s Meals', path: '/meals', icon: Utensils },
    { name: 'Workflow Canvas', path: '/pipeline', icon: GitBranch },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-[280px] shrink-0 bg-[#0d0c18] border-r border-white/5 flex flex-col justify-between h-screen sticky top-0 p-6 select-none">
      <div className="flex flex-col gap-6">
        {/* Brand/Logo - pt 24px */}
        <div className="flex items-center gap-3 pt-6">
          <div className="p-2.5 bg-gradient-to-r from-[#9333EA] to-[#d946ef] rounded-xl flex items-center justify-center shadow-lg shadow-[#9333EA]/20">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            NutriSense <span className="text-[#9333EA] font-extrabold">AI</span>
          </span>
        </div>

        {/* User Card - padding: 18px, border-radius: 16px, margin-bottom: 24px */}
        {user && (
          <div className="p-[18px] bg-white/[0.03] border border-white/5 rounded-[16px] mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9333EA]/20 text-[#a855f7] flex items-center justify-center font-extrabold border border-[#9333EA]/20 shrink-0">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[14px] font-bold text-white truncate leading-snug">{user.name}</span>
              <span className="text-[11px] text-zinc-400 truncate leading-snug font-medium mt-0.5">{user.goal || 'Healthy Lifestyle'}</span>
            </div>
          </div>
        )}

        {/* Navigation Menu - gap: 10px */}
        <nav className="flex flex-col gap-[10px]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-[18px] rounded-[12px] h-[48px] text-[15px] font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#9333EA] to-[#A855F7] text-white shadow-lg shadow-[#9333EA]/15 scale-[1.02]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout button - h 48px, rounded 12px, padding 18px */}
      <button
        onClick={logout}
        className="flex items-center gap-3 px-[18px] rounded-[12px] h-[48px] text-[15px] font-semibold text-rose-400 hover:text-white hover:bg-rose-500/10 transition-all duration-300 cursor-pointer"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </aside>
  );
}
