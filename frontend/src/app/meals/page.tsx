'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import { 
  Clock, DollarSign, Brain, CheckCircle, RefreshCw, 
  AlertCircle, ShoppingBag, BookOpen, Coffee, Utensils, Sparkles
} from 'lucide-react';

export default function Meals() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<any>({ morning_meal: null, evening_meal: null });
  const [progress, setProgress] = useState<any>({
    ate_morning_meal: false,
    ate_evening_meal: false,
    morning_feedback: '',
    evening_feedback: '',
  });
  
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const mealsData = await api.getTodayMeals();
      const progressData = await api.getTodayProgress();
      
      setMeals(mealsData);
      setProgress(progressData);
    } catch (err: any) {
      console.error(err);
      setError('Could not fetch daily recipes or logged status.');
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
      loadData();
    }
  }, [user, authLoading, router]);

  const handleRegenerate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.forceGenerateMeals();
      setSuccess('AI regenerated today\'s meals successfully!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate meals');
      setLoading(false);
    }
  };

  const handleLogMealStatus = async (mealType: 'morning' | 'evening', checked: boolean) => {
    setUpdating(`${mealType}_completion`);
    try {
      const payload = mealType === 'morning' 
        ? { ate_morning_meal: checked } 
        : { ate_evening_meal: checked };
      
      const newProgress = await api.logProgress(payload);
      setProgress(newProgress.log);
    } catch (err) {
      console.error(err);
      setError('Failed to update meal completion status.');
    } finally {
      setUpdating(null);
    }
  };

  const handleLogFeedback = async (mealType: 'morning' | 'evening', feedback: string) => {
    setUpdating(`${mealType}_feedback_${feedback}`);
    try {
      const payload = mealType === 'morning' 
        ? { morning_feedback: feedback } 
        : { evening_feedback: feedback };
        
      const newProgress = await api.logProgress(payload);
      setProgress(newProgress.log);
    } catch (err) {
      console.error(err);
      setError('Failed to record rating.');
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const renderMealCard = (meal: any, type: 'morning' | 'evening') => {
    if (!meal) {
      return (
        <div className="card flex flex-col items-center justify-center text-center text-zinc-500 min-h-[350px]">
          <Brain size={40} className="text-zinc-600 mb-3 animate-pulse" />
          <p className="text-[15px] font-semibold text-white">No menu computed by the LangGraph agent yet.</p>
          <p className="text-small text-zinc-500 mt-1">Make sure you have completed onboarding and click Regenerate above.</p>
        </div>
      );
    }

    const isEaten = type === 'morning' ? progress.ate_morning_meal : progress.ate_evening_meal;
    const activeFeedback = type === 'morning' ? progress.morning_feedback : progress.evening_feedback;

    return (
      // Meal card: padding 24px, border-radius 18px, gap 18px
      <div className={`card flex flex-col gap-[18px] relative ${isEaten ? 'border-emerald-500/30 shadow-[0_8px_30px_rgba(16,185,129,0.04)]' : ''}`}>
        
        {/* Header Block */}
        <div className="flex justify-between items-center gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl shrink-0 ${type === 'morning' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              {type === 'morning' ? <Coffee size={20} /> : <Utensils size={20} />}
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                {type === 'morning' ? 'Morning Breakfast' : 'Evening Dinner'}
              </span>
              <h3 className="title-card text-white mt-0.5">{meal.name}</h3>
            </div>
          </div>

          {/* Eaten Toggle - h 48px, rounded 12px */}
          <label className="flex items-center justify-center gap-2 px-4 h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer select-none transition-all">
            <input 
              type="checkbox" 
              checked={isEaten}
              disabled={updating !== null}
              onChange={(e) => handleLogMealStatus(type, e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 bg-black border-white/10 focus:ring-emerald-500"
            />
            <span className="text-[13px] font-bold text-zinc-300">Logged Eaten</span>
          </label>
        </div>

        {/* Nutritional Highlights: Equal spacing grid */}
        <div className="grid grid-cols-4 bg-[#171722]/50 border border-white/5 rounded-xl overflow-hidden divide-x divide-white/5">
          <div className="p-3.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Calories</span>
            <span className="text-[14px] font-extrabold text-white mt-1">{meal.calories} <span className="text-[10px] font-normal text-zinc-500">kcal</span></span>
          </div>
          <div className="p-3.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Protein</span>
            <span className="text-[14px] font-extrabold text-purple-400 mt-1">{meal.protein} <span className="text-[10px] font-normal text-zinc-500">g</span></span>
          </div>
          <div className="p-3.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Carbs</span>
            <span className="text-[14px] font-extrabold text-fuchsia-400 mt-1">{meal.carbs} <span className="text-[10px] font-normal text-zinc-500">g</span></span>
          </div>
          <div className="p-3.5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fats</span>
            <span className="text-[14px] font-extrabold text-cyan-400 mt-1">{meal.fat} <span className="text-[10px] font-normal text-zinc-500">g</span></span>
          </div>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Clock size={14} className="text-purple-400" />
            <span>Preparation Time: <strong>{meal.prep_time || '20 mins'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <DollarSign size={14} className="text-fuchsia-400" />
            <span>Estimated Cost: <strong>{meal.estimated_cost ? `${meal.estimated_cost} INR` : 'Budget friendly'}</strong></span>
          </div>
        </div>

        {/* Ingredients & Prep */}
        <div className="flex flex-col gap-4">
          {/* Ingredients */}
          <div>
            <h4 className="text-xs font-extrabold uppercase text-white tracking-widest flex items-center gap-1.5 mb-2.5">
              <ShoppingBag size={14} className="text-purple-400" />
              Ingredients Needed
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {meal.ingredients && meal.ingredients.map((ing: any, i: number) => (
                <li key={i} className="flex justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs">
                  <span className="text-zinc-300 font-medium">{ing.name}</span>
                  <span className="text-purple-400 font-bold">{ing.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prep Instructions */}
          <div>
            <h4 className="text-xs font-extrabold uppercase text-white tracking-widest flex items-center gap-1.5 mb-2.5">
              <BookOpen size={14} className="text-purple-400" />
              Preparation Steps
            </h4>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-zinc-300 leading-[1.6] whitespace-pre-line">
              {meal.cooking_instructions || 'Refer to standard preparation procedures.'}
            </div>
          </div>

          {/* AI Reasoning */}
          {meal.reason && (
            <div className="p-3.5 bg-purple-600/10 rounded-xl border border-purple-500/20 text-xxs text-purple-300 leading-normal flex gap-2">
              <Sparkles size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Coach Logic:</strong> {meal.reason}
              </span>
            </div>
          )}
        </div>

        {/* Feedback ratings */}
        <div className="pt-3 border-t border-white/5 flex justify-between items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rate Meal Config</span>
          <div className="flex gap-1.5">
            {['Good', 'Average', 'Bad'].map((rating) => {
              const isActive = activeFeedback === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  disabled={updating !== null}
                  onClick={() => handleLogFeedback(type, rating)}
                  className={`h-[32px] px-3.5 rounded-lg text-xxs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? rating === 'Good' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : rating === 'Average' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5'
                  }`}
                >
                  {rating === 'Good' && '👍 Good'}
                  {rating === 'Average' && '😐 Okay'}
                  {rating === 'Bad' && '👎 Bad'}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    );
  };

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
              <h1 className="title-page text-white">Today's Meals</h1>
              <p className="text-small text-zinc-400 mt-1">Review recipes and rate meal configurations generated by the LangGraph agent.</p>
            </div>
            <button 
              onClick={handleRegenerate}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2 shadow-lg shadow-purple-500/10 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Regenerate Menu (AI)
            </button>
          </header>

          {error && (
            <div className="p-4 text-small text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 text-small text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{success}</span>
            </div>
          )}

          {/* Meals columns - wrap on mobile */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            {renderMealCard(meals.morning_meal, 'morning')}
            {renderMealCard(meals.evening_meal, 'evening')}
          </div>

        </div>
      </main>
    </div>
  );
}
