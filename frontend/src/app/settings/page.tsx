'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import { 
  User, Brain, Clock, Server, CheckCircle, 
  AlertCircle, Plus
} from 'lucide-react';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Fields
  const [name, setName] = useState('');
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
  
  // List Inputs
  const [medicalInput, setMedicalInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  const [likeInput, setLikeInput] = useState('');

  // Scheduling
  const [notificationPreference, setNotificationPreference] = useState('Email');
  const [morningMealTime, setMorningMealTime] = useState('08:00');
  const [eveningMealTime, setEveningMealTime] = useState('20:00');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAge(user.age || 25);
      setGender(user.gender || 'Male');
      setHeight(user.height || 175);
      setWeight(user.weight || 70);
      setTargetWeight(user.target_weight || 70);
      setGoal(user.goal || 'Healthy Lifestyle');
      setFoodPreference(user.food_preference || 'Non-Vegetarian');
      setDailyActivityLevel(user.daily_activity_level || 'Moderate');
      setSmoking(user.smoking || false);
      setAlcohol(user.alcohol || false);
      setWaterIntake(user.water_intake || 2.5);
      setSleepHours(user.sleep_hours || 7);
      setWorkoutFrequency(user.workout_frequency || '3-4 times/week');
      setMedicalConditions(user.medical_conditions || []);
      setFoodAllergies(user.food_allergies || []);
      setFoodsDislikes(user.foods_dislikes || []);
      setFoodsLikes(user.foods_likes || []);
      setNotificationPreference(user.notification_preference || 'Email');
      setMorningMealTime(user.morning_meal_time || '08:00');
      setEveningMealTime(user.evening_meal_time || '20:00');
      setLoading(false);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      const payload = {
        name,
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

      await api.updateProfile(payload);
      await refreshUser();
      setSuccess('Settings and profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings');
    } finally {
      setUpdating(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0b12]">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        
        {/* Page Container: max-width 1600px, padding 32px, flex column with gap 24px */}
        <div className="page flex flex-col gap-6">
          
          {/* Header */}
          <header className="py-2">
            <h1 className="title-page text-white">Settings</h1>
            <p className="text-small text-zinc-400 mt-1">Manage profile demographics, allergens, and scheduler times.</p>
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

          {/* Form wrapper */}
          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-8">
            
            {/* CARD 1: Physical Metrics - padding 24px, radius 18px */}
            <div className="card flex flex-col gap-4">
              <h3 className="title-card text-white flex items-center gap-2">
                <User size={18} className="text-purple-400" />
                Physical Metrics
              </h3>
              {/* Form elements grid: 2 columns on desktop, 1 on tablet/mobile (max-width: 1024px) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-1">
                <div className="flex flex-col mb-[18px]">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
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
                <div className="flex flex-col mb-[18px]">
                  <label>Height (cm)</label>
                  <input 
                    type="number" 
                    value={height} 
                    onChange={(e) => setHeight(Number(e.target.value))}
                  />
                </div>
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
              </div>
            </div>

            {/* CARD 2: Diet Preferences - padding 24px, radius 18px */}
            <div className="card flex flex-col gap-4">
              <h3 className="title-card text-white flex items-center gap-2">
                <Brain size={18} className="text-purple-400" />
                Diet Preferences
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-1">
                <div className="flex flex-col mb-[18px]">
                  <label>Food Choice</label>
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
                  <button type="button" onClick={() => addListItem('like')} className="btn btn-secondary h-[48px] px-4 cursor-pointer">Add</button>
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
                    placeholder="e.g. Cilantro, Eggplant" 
                    value={dislikeInput} 
                    onChange={(e) => setDislikeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('dislike'))}
                  />
                  <button type="button" onClick={() => addListItem('dislike')} className="btn btn-secondary h-[48px] px-4 cursor-pointer">Add</button>
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
                    placeholder="e.g. Peanuts, Dairy" 
                    value={allergyInput} 
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('allergy'))}
                  />
                  <button type="button" onClick={() => addListItem('allergy')} className="btn btn-secondary h-[48px] px-4 cursor-pointer">Add</button>
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
            </div>

            {/* CARD 3: Dining Times - padding 24px, radius 18px */}
            <div className="card flex flex-col gap-4">
              <h3 className="title-card text-white flex items-center gap-2">
                <Clock size={18} className="text-purple-400" />
                Dining Times
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-1">
                <div className="flex flex-col mb-[18px]">
                  <label>Notification Channel</label>
                  <select 
                    value={notificationPreference} 
                    onChange={(e) => setNotificationPreference(e.target.value)}
                  >
                    <option>Email</option>
                    <option>Console Logging Only</option>
                  </select>
                </div>
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
            </div>

            {/* CARD 4: System Configuration - padding 24px, radius 18px */}
            <div className="card flex flex-col gap-4">
              <h3 className="title-card text-white flex items-center gap-2">
                <Server size={18} className="text-purple-400" />
                System Configuration
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-3 text-xs leading-normal">
                <div className="flex justify-between p-3 bg-[#171722] rounded-xl border border-white/5 items-center">
                  <span className="text-zinc-400">Database Engine:</span>
                  <span className="text-white font-bold">SQL (SQLite / Postgres)</span>
                </div>
                <div className="flex justify-between p-3 bg-[#171722] rounded-xl border border-white/5 items-center">
                  <span className="text-zinc-400">AI Model Mode:</span>
                  <span className="text-white font-bold">Groq (Llama 3.1 70B)</span>
                </div>
                <div className="flex justify-between p-3 bg-[#171722] rounded-xl border border-white/5 items-center">
                  <span className="text-zinc-400">Memory Agent:</span>
                  <span className="text-white font-bold">TF-IDF Vector Store</span>
                </div>
                <div className="flex justify-between p-3 bg-[#171722] rounded-xl border border-white/5 items-center">
                  <span className="text-zinc-400">SMTP Reminders:</span>
                  <span className="text-emerald-400 font-bold">Brevo Dispatcher</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updating}
                className="btn btn-primary h-[48px] px-8 cursor-pointer shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
