'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import { 
  TrendingDown, Trophy, Flame, GlassWater, Dumbbell, 
  Calendar, RefreshCw, AlertCircle, Sparkles, Plus
} from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, AreaChart, Area
} from 'recharts';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [waterLog, setWaterLog] = useState<number>(0);
  const [workoutLog, setWorkoutLog] = useState<boolean>(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.getProgressStats();
      setStats(res);
      setWaterLog(res.summary.water_intake_ml || 0);
      setWorkoutLog(res.summary.workout_completed || false);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load daily stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (user && !user.is_onboarded) {
      router.push('/onboard');
      return;
    }
    if (user) {
      fetchStats();
    }
  }, [user, authLoading, router]);

  const handleAddWater = async (amount: number) => {
    setUpdating(true);
    try {
      const newWater = waterLog + amount;
      await api.logProgress({ water_intake_ml: newWater });
      setWaterLog(newWater);
      await fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleWorkout = async () => {
    setUpdating(true);
    try {
      const newWorkout = !workoutLog;
      await api.logProgress({ workout_completed: newWorkout });
      setWorkoutLog(newWorkout);
      await fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const summary = stats?.summary || {};
  const charts = stats?.charts || {};

  return (
    <div className="flex min-h-screen bg-[#0b0b12]">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        {/* Page Container: max-width 1600px, padding 32px */}
        <div className="page flex flex-col gap-6">
          
          {/* Header Section */}
          <header className="flex justify-between items-center py-2">
            <div>
              <h1 className="title-page text-white">Dashboard</h1>
              <p className="text-small text-zinc-400 mt-1">Track your biological targets and daily meal stats.</p>
            </div>
            <button 
              onClick={fetchStats}
              className="btn btn-secondary flex items-center gap-2 text-xs font-bold"
            >
              <RefreshCw size={14} />
              Sync Stats
            </button>
          </header>

          {error && (
            <div className="p-4 text-small text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/25 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Top Cards: CSS Grid, repeat(auto-fit, minmax(260px, 1fr)), gap 24px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Card 1: Goal */}
            <div className="card relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />
              <div>
                <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">Active Goal</span>
                <h4 className="title-card text-white mt-2">{summary.goal || 'Healthy Lifestyle'}</h4>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[13px] text-purple-400 font-semibold">
                <Trophy size={14} />
                LangGraph Connected
              </div>
            </div>

            {/* Card 2: Calorie Progress */}
            <div className="card relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-fuchsia-500/5 rounded-full blur-[20px] pointer-events-none" />
              <div>
                <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">Calories Consumed</span>
                <h4 className="title-card text-white mt-2">
                  {summary.today_calories || 0} <span className="text-[13px] text-zinc-500 font-normal">kcal</span>
                </h4>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[13px] text-fuchsia-400 font-semibold">
                <Flame size={14} />
                {summary.meal_completion || 0}% Eaten Today
              </div>
            </div>

            {/* Card 3: Weight */}
            <div className="card relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-emerald-500/5 rounded-full blur-[20px] pointer-events-none" />
              <div>
                <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">Weight Tracker</span>
                <h4 className="title-card text-white mt-2">
                  {summary.weight || 0} <span className="text-[13px] text-zinc-500 font-normal">kg</span>
                </h4>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[13px] text-emerald-400 font-semibold">
                <TrendingDown size={14} />
                Target Weight: {summary.target_weight || 0} kg
              </div>
            </div>

            {/* Card 4: Next Meal Schedule */}
            <div className="card relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-amber-500/5 rounded-full blur-[20px] pointer-events-none" />
              <div>
                <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">Upcoming Dining</span>
                <h4 className="text-[14px] font-bold text-white mt-2 leading-snug">
                  {summary.next_meal_countdown || 'No scheduled meal'}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[13px] text-amber-400 font-semibold">
                <Calendar size={14} />
                Email Reminder Setup
              </div>
            </div>

          </div>

          {/* Quick Loggers Section - Card items, 24px gap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Water Tracker Card */}
            <div className="card flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <GlassWater className="text-cyan-400" size={18} />
                    <h3 className="title-card text-white">Daily Hydration Log</h3>
                  </div>
                  <span className="text-xs font-bold text-cyan-400">
                    {waterLog / 1000} / {user?.water_intake || 2.5} Liters
                  </span>
                </div>
                
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden mb-6">
                  <div 
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((waterLog / ((user?.water_intake || 2.5) * 1000)) * 100, 100)}%` }} 
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  disabled={updating}
                  onClick={() => handleAddWater(250)}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                >
                  <Plus size={14} />
                  +250 ml
                </button>
                <button 
                  disabled={updating}
                  onClick={() => handleAddWater(500)}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                >
                  <Plus size={14} />
                  +500 ml
                </button>
              </div>
            </div>

            {/* Workout Tracker Card */}
            <div className="card flex flex-col justify-between min-h-[220px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Dumbbell className="text-rose-400" size={18} />
                  <h3 className="title-card text-white">Workout Log</h3>
                </div>
                <span className={`text-[12px] font-bold ${workoutLog ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {workoutLog ? 'Logged ✓' : 'Pending Log'}
                </span>
              </div>

              <p className="text-small text-zinc-400 leading-[1.6]">
                Mark if you completed a training session today. Habits help the LangGraph compiler calibrate caloric and macronutrient margins.
              </p>

              <button 
                disabled={updating}
                onClick={handleToggleWorkout}
                className={`btn w-full mt-4 flex items-center justify-center gap-2 cursor-pointer font-bold border transition-all ${
                  workoutLog 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30' 
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {workoutLog ? 'Log Completed Workout' : 'Toggle Workout Complete'}
              </button>
            </div>

          </div>

          {/* Charts Section: min-height: 400px, border-radius: 20px, padding: 24px */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Calories Chart */}
            <div className="bg-[#12121c] border border-white/[0.08] shadow-2xl rounded-[20px] p-6 flex flex-col min-h-[400px]">
              <h3 className="title-card text-white mb-6">Caloric Log (Last 7 Days)</h3>
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.weekly_calories || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242436" vertical={false} />
                    <XAxis dataKey="day" stroke="#666" fontSize={11} tickLine={false} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0d0c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                      labelClassName="text-white text-xs font-bold"
                    />
                    <Bar dataKey="calories" fill="url(#colorCal)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333EA" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0.15}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weight Chart */}
            <div className="bg-[#12121c] border border-white/[0.08] shadow-2xl rounded-[20px] p-6 flex flex-col min-h-[400px]">
              <h3 className="title-card text-white mb-6">Weight Log (Last 7 Days)</h3>
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.weight_progress || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242436" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip 
                      contentStyle={{ background: '#0d0c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                      labelClassName="text-white text-xs font-bold"
                    />
                    <Area type="monotone" dataKey="weight" stroke="#10b981" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2.5} />
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
