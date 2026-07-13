'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Brain, ChevronRight, ChevronLeft, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function Onboard() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [targetWeight, setTargetWeight] = useState(70);
  const [goal, setGoal] = useState('Healthy Lifestyle');
  const [foodPreference, setFoodPreference] = useState('Non-Vegetarian');
  const [dailyActivityLevel, setDailyActivityLevel] = useState('Moderate');
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [waterIntake, setWaterIntake] = useState(2.5);
  const [sleepHours, setSleepHours] = useState(7);
  const [workoutFrequency, setWorkoutFrequency] = useState('3-4 times/week');
  
  // Lists
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [foodsDislikes, setFoodsDislikes] = useState<string[]>([]);
  const [foodsLikes, setFoodsLikes] = useState<string[]>([]);
  
  // Custom text inputs
  const [medicalInput, setMedicalInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  const [likeInput, setLikeInput] = useState('');

  // Notifications
  const [notificationPreference, setNotificationPreference] = useState('Email');
  const [morningMealTime, setMorningMealTime] = useState('08:00');
  const [eveningMealTime, setEveningMealTime] = useState('20:00');

  useEffect(() => {
    if (user?.is_onboarded) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        age: Number(age),
        gender,
        height: Number(height),
        weight: Number(weight),
        target_weight: Number(targetWeight),
        goal,
        food_preference: foodPreference,
        daily_activity_level: dailyActivityLevel,
        smoking,
        alcohol,
        water_intake: Number(waterIntake),
        sleep_hours: Number(sleepHours),
        workout_frequency: workoutFrequency,
        medical_conditions: medicalConditions,
        food_allergies: foodAllergies,
        foods_dislikes: foodsDislikes,
        foods_likes: foodsLikes,
        notification_preference: notificationPreference,
        morning_meal_time: morningMealTime,
        evening_meal_time: eveningMealTime,
      };

      await api.onboard(payload);
      await refreshUser();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Onboarding submission failed');
      setLoading(false);
    }
  };

  const addListItem = (type: 'medical' | 'allergy' | 'dislike' | 'like') => {
    if (type === 'medical' && medicalInput.trim()) {
      setMedicalConditions([...medicalConditions, medicalInput.trim()]);
      setMedicalInput('');
    } else if (type === 'allergy' && allergyInput.trim()) {
      setFoodAllergies([...foodAllergies, allergyInput.trim()]);
      setAllergyInput('');
    } else if (type === 'dislike' && dislikeInput.trim()) {
      setFoodsDislikes([...foodsDislikes, dislikeInput.trim()]);
      setDislikeInput('');
    } else if (type === 'like' && likeInput.trim()) {
      setFoodsLikes([...foodsLikes, likeInput.trim()]);
      setLikeInput('');
    }
  };

  const removeListItem = (type: 'medical' | 'allergy' | 'dislike' | 'like', index: number) => {
    if (type === 'medical') {
      setMedicalConditions(medicalConditions.filter((_, i) => i !== index));
    } else if (type === 'allergy') {
      setFoodAllergies(foodAllergies.filter((_, i) => i !== index));
    } else if (type === 'dislike') {
      setFoodsDislikes(foodsDislikes.filter((_, i) => i !== index));
    } else if (type === 'like') {
      setFoodsLikes(foodsLikes.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0b0b12] relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-fuchsia-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Card Wrapper - card styles with 24px padding, 18px radius */}
      <div className="card w-full max-w-2xl relative z-10 p-8 sm:p-10 flex flex-col gap-6">
        
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <Brain className="text-purple-400" size={20} />
            <span className="text-small font-extrabold uppercase tracking-widest text-[#9333ea]">Biological Profile Setup</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-gradient-to-r from-purple-500 to-fuchsia-500' : 'w-2 bg-white/10'}`} 
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-4 text-small text-rose-400 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Biological Profile */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="title-section text-white">Physical Details</h2>
              <p className="text-small text-zinc-400">Tell us your baseline measurements so we can accurately estimate calorie demands.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <div className="flex flex-col mb-[18px]">
                <label>Age</label>
                <input 
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col mb-[18px]">
                <label>Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col mb-[18px]">
              <label>Height (cm)</label>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <div className="flex flex-col mb-[18px]">
                <label>Current Weight (kg)</label>
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col mb-[18px]">
                <label>Target Weight (kg)</label>
                <input 
                  type="number" 
                  value={targetWeight} 
                  onChange={(e) => setTargetWeight(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Goals & Activity */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="title-section text-white">Goals & Activity</h2>
              <p className="text-small text-zinc-400">Define your objective and energy output patterns.</p>
            </div>

            <div className="flex flex-col mb-[18px]">
              <label>Target Health Goal</label>
              <select 
                value={goal} 
                onChange={(e) => setGoal(e.target.value)}
              >
                <option>Weight Loss</option>
                <option>Weight Gain</option>
                <option>Healthy Lifestyle</option>
                <option>Muscle Gain</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <div className="flex flex-col mb-[18px]">
                <label>Activity Level</label>
                <select 
                  value={dailyActivityLevel} 
                  onChange={(e) => setDailyActivityLevel(e.target.value)}
                >
                  <option>Sedentary</option>
                  <option>Light</option>
                  <option>Moderate</option>
                  <option>Active</option>
                </select>
              </div>
              <div className="flex flex-col mb-[18px]">
                <label>Workout Frequency</label>
                <select 
                  value={workoutFrequency} 
                  onChange={(e) => setWorkoutFrequency(e.target.value)}
                >
                  <option>Rarely</option>
                  <option>1-2 times/week</option>
                  <option>3-4 times/week</option>
                  <option>Daily</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <div className="flex flex-col mb-[18px]">
                <label>Water Target (Liters)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={waterIntake} 
                  onChange={(e) => setWaterIntake(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col mb-[18px]">
                <label>Sleep (Hours/night)</label>
                <input 
                  type="number" 
                  value={sleepHours} 
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex gap-8 mt-2 mb-[18px]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={smoking} 
                  onChange={(e) => setSmoking(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 text-purple-600 bg-black focus:ring-purple-500"
                />
                <span className="text-body font-medium text-zinc-300">Smoking User</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={alcohol} 
                  onChange={(e) => setAlcohol(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 text-purple-600 bg-black focus:ring-purple-500"
                />
                <span className="text-body font-medium text-zinc-300">Consume Alcohol</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: Food Preferences & Medicals */}
        {step === 3 && (
          <div className="flex flex-col gap-5 max-h-[55vh] overflow-y-auto pr-2">
            <div className="flex flex-col gap-1.5">
              <h2 className="title-section text-white">Preferences & Health</h2>
              <p className="text-small text-zinc-400">Help the AI coach map preferences and filter allergens.</p>
            </div>

            <div className="flex flex-col mb-[18px]">
              <label>Food Type</label>
              <select 
                value={foodPreference} 
                onChange={(e) => setFoodPreference(e.target.value)}
              >
                <option>Vegetarian</option>
                <option>Eggetarian</option>
                <option>Non-Vegetarian</option>
                <option>Vegan</option>
              </select>
            </div>

            {/* Tags Inputs */}
            {/* Likes */}
            <div className="flex flex-col mb-[18px]">
              <label>Foods You Love</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Avocado, Salmon" 
                  value={likeInput} 
                  onChange={(e) => setLikeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('like'))}
                />
                <button 
                  type="button" 
                  onClick={() => addListItem('like')}
                  className="btn btn-secondary h-[48px] px-4 cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {foodsLikes.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {item}
                    <button type="button" onClick={() => removeListItem('like', idx)} className="text-emerald-400 hover:text-white cursor-pointer ml-1 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Dislikes */}
            <div className="flex flex-col mb-[18px]">
              <label>Disliked Foods (Excluded)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Mushrooms, Eggplant" 
                  value={dislikeInput} 
                  onChange={(e) => setDislikeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('dislike'))}
                />
                <button 
                  type="button" 
                  onClick={() => addListItem('dislike')}
                  className="btn btn-secondary h-[48px] px-4 cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {foodsDislikes.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {item}
                    <button type="button" onClick={() => removeListItem('dislike', idx)} className="text-rose-400 hover:text-white cursor-pointer ml-1 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="flex flex-col mb-[18px]">
              <label>Food Allergies</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Peanuts, Gluten" 
                  value={allergyInput} 
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('allergy'))}
                />
                <button 
                  type="button" 
                  onClick={() => addListItem('allergy')}
                  className="btn btn-secondary h-[48px] px-4 cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {foodAllergies.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {item}
                    <button type="button" onClick={() => removeListItem('allergy', idx)} className="text-rose-400 hover:text-white cursor-pointer ml-1 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Medical Conditions */}
            <div className="flex flex-col mb-[18px]">
              <label>Medical Conditions</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Diabetes, Hypertension" 
                  value={medicalInput} 
                  onChange={(e) => setMedicalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('medical'))}
                />
                <button 
                  type="button" 
                  onClick={() => addListItem('medical')}
                  className="btn btn-secondary h-[48px] px-4 cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {medicalConditions.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {item}
                    <button type="button" onClick={() => removeListItem('medical', idx)} className="text-amber-400 hover:text-white cursor-pointer ml-1 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Reminders & Times */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="title-section text-white">Dining Schedule</h2>
              <p className="text-small text-zinc-400">Configure reminder channels and dining preferences.</p>
            </div>

            <div className="flex flex-col mb-[18px]">
              <label>Reminders Channel</label>
              <select 
                value={notificationPreference} 
                onChange={(e) => setNotificationPreference(e.target.value)}
              >
                <option>Email</option>
                <option>Console Logging Only</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <div className="flex flex-col mb-[18px]">
                <label>Morning Meal Time</label>
                <input 
                  type="time" 
                  value={morningMealTime} 
                  onChange={(e) => setMorningMealTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col mb-[18px]">
                <label>Evening Meal Time</label>
                <input 
                  type="time" 
                  value={eveningMealTime} 
                  onChange={(e) => setEveningMealTime(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/20 text-xs text-purple-300 flex items-start gap-3 mt-2">
              <Sparkles className="shrink-0 mt-0.5" size={16} />
              <span className="leading-relaxed">
                <strong>Schedule note:</strong> The AI Scheduler compiles today's menus and dispatches email digests 1 hour prior to these designated meal times.
              </span>
            </div>
          </div>
        )}

        {/* Navigation Buttons - height 48px, rounded 12px, padding 24px */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5">
          {step > 1 ? (
            <button
              onClick={handlePrev}
              type="button"
              className="btn btn-secondary flex items-center justify-center gap-1.5"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              type="button"
              className="btn btn-primary flex items-center justify-center gap-1.5"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              type="button"
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  Complete Onboarding
                  <Check size={16} />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
