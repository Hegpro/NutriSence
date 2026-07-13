import logging
import datetime
from typing import Dict, Any, List
from langchain_core.tools import tool
from sqlalchemy.orm import Session
from app.database.models import User, MealHistory, DailyProgress, AgentMemory
from app.services.vector_store import query_memories, add_memory
from app.services.notifier import send_meal_reminder

logger = logging.getLogger(__name__)

# Note: In LangChain tools, we describe what each tool does in the docstring.

class UserProfileTool:
    @staticmethod
    def run(user_id: int, db: Session) -> Dict[str, Any]:
        """Fetches the user's complete profile information from the database."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        return {
            "name": user.name,
            "email": user.email,
            "age": user.age,
            "gender": user.gender,
            "height": user.height,
            "weight": user.weight,
            "target_weight": user.target_weight,
            "goal": user.goal,
            "food_preference": user.food_preference,
            "daily_activity_level": user.daily_activity_level,
            "smoking": user.smoking,
            "alcohol": user.alcohol,
            "water_intake": user.water_intake,
            "sleep_hours": user.sleep_hours,
            "workout_frequency": user.workout_frequency,
            "medical_conditions": user.get_medical_conditions(),
            "food_allergies": user.get_food_allergies(),
            "foods_dislikes": user.get_foods_dislikes(),
            "foods_likes": user.get_foods_likes(),
            "notification_preference": user.notification_preference,
            "morning_meal_time": user.morning_meal_time,
            "evening_meal_time": user.evening_meal_time
        }


class CalorieCalculatorTool:
    @staticmethod
    def run(age: int, gender: str, height: float, weight: float, activity: str, goal: str) -> float:
        """Calculates daily target calorie intake based on profile inputs using Mifflin-St Jeor formula."""
        if not age or not height or not weight:
            return 2000.0  # Default baseline
            
        # Mifflin-St Jeor Formula
        if gender and gender.lower() == "female":
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
            
        # Activity Factor
        activity_factors = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725
        }
        factor = activity_factors.get(activity.lower() if activity else "sedentary", 1.2)
        tdee = bmr * factor
        
        # Goal Adjustment
        goal_lower = goal.lower() if goal else "healthy lifestyle"
        if "loss" in goal_lower:
            target_calories = tdee - 500
        elif "gain" in goal_lower:
            target_calories = tdee + 500
        elif "muscle" in goal_lower:
            target_calories = tdee + 300
        else:
            target_calories = tdee
            
        return round(max(target_calories, 1200.0), 0) # Floor at 1200 kcal for safety


class ProteinCalculatorTool:
    @staticmethod
    def run(weight: float, goal: str, activity: str) -> float:
        """Calculates protein target in grams based on user weight, goal, and activity level."""
        if not weight:
            return 60.0 # Default baseline
            
        goal_lower = goal.lower() if goal else "healthy lifestyle"
        activity_lower = activity.lower() if activity else "sedentary"
        
        # Base factor based on goal and activity
        if "muscle" in goal_lower or "gain" in goal_lower:
            factor = 1.8 if activity_lower in ["moderate", "active"] else 1.6
        elif "loss" in goal_lower:
            factor = 1.6
        else:
            factor = 1.2 if activity_lower in ["moderate", "active"] else 1.0
            
        return round(weight * factor, 1)


class NutritionAnalysisTool:
    @staticmethod
    def run(age: int, gender: str, height: float, weight: float, activity: str, goal: str) -> Dict[str, float]:
        """Generates full macronutrient targets: Calories, Protein, Carbs, Fat, and Fiber."""
        calories = CalorieCalculatorTool.run(age, gender, height, weight, activity, goal)
        protein_g = ProteinCalculatorTool.run(weight, goal, activity)
        
        # Calculate Carbs and Fats
        # Fats: 25% of calories
        fat_calories = calories * 0.25
        fat_g = round(fat_calories / 9.0, 1)
        
        # Carbs: Remaining calories
        protein_calories = protein_g * 4.0
        carb_calories = calories - (protein_calories + fat_calories)
        carb_g = round(max(carb_calories / 4.0, 50.0), 1)
        
        # Fiber: 14g per 1000 kcal
        fiber_g = round((calories / 1000.0) * 14.0, 1)
        
        return {
            "calories": calories,
            "protein": protein_g,
            "carbs": carb_g,
            "fat": fat_g,
            "fiber": fiber_g
        }


class MemoryTool:
    @staticmethod
    def run(user_id: int, db: Session) -> Dict[str, Any]:
        """Retrieves semantic memory from ChromaDB and historical list of meals/feedback from SQLite db."""
        # 1. Fetch recent meals (last 5 days) from SQLite db to avoid immediate repetition
        five_days_ago = datetime.date.today() - datetime.timedelta(days=5)
        recent_meals = db.query(MealHistory).filter(
            MealHistory.user_id == user_id,
            MealHistory.date >= five_days_ago
        ).all()
        
        suggested_meal_names = [m.name for m in recent_meals]
        
        # 2. Fetch feedback history
        recent_progress = db.query(DailyProgress).filter(
            DailyProgress.user_id == user_id,
            DailyProgress.date >= five_days_ago
        ).all()
        
        feedback_items = []
        for p in recent_progress:
            if p.morning_feedback:
                feedback_items.append(f"Morning meal rated {p.morning_feedback}")
            if p.evening_feedback:
                feedback_items.append(f"Evening meal rated {p.evening_feedback}")
                
        # 3. Query ChromaDB for semantic memory about this user's preferences
        semantic_memories = query_memories(user_id, "user meal likes dislikes preferences food ratings", limit=5)
        
        return {
            "recent_suggested_meals": suggested_meal_names,
            "feedback_history": feedback_items,
            "semantic_memories": semantic_memories
        }


class NotificationTool:
    @staticmethod
    def run(user_id: int, meal_type: str, db: Session) -> bool:
        """Triggers an email notification for the user's specific meal type (morning/evening) for today."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.notification_preference != "Email":
            logger.warning(f"Notification bypassed. User: {user_id}, Pref: {user.notification_preference if user else 'None'}")
            return False
            
        today = datetime.date.today()
        meal = db.query(MealHistory).filter(
            MealHistory.user_id == user_id,
            MealHistory.date == today,
            MealHistory.meal_type == meal_type
        ).first()
        
        if not meal:
            logger.error(f"Cannot send reminder. No meal found for user {user_id} on {today} of type {meal_type}")
            return False
            
        # Extract items list
        items = meal.get_ingredients()
        items_names = [f"{item.get('name', '')} ({item.get('quantity', '')})" for item in items if isinstance(item, dict)]
        if not items_names:
            items_names = [meal.quantity or meal.name]
            
        # Send
        return send_meal_reminder(
            email=user.email,
            name=user.name,
            meal_type=meal_type,
            meal_name=meal.name,
            protein=meal.protein,
            calories=meal.calories,
            goal=user.goal or "Healthy Lifestyle",
            items=items_names
        )


class SchedulerTool:
    @staticmethod
    def run(user_id: int, db: Session) -> str:
        """Checks and configures meal time trigger events in the Scheduler database config."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return "User not found"
        return f"Scheduler configured for Morning: {user.morning_meal_time}, Evening: {user.evening_meal_time}"


class FeedbackAnalyzerTool:
    @staticmethod
    def run(user_id: int, db: Session) -> Dict[str, Any]:
        """Analyzes recent user progress logs to suggest profile baseline tweaks."""
        logs = db.query(DailyProgress).filter(
            DailyProgress.user_id == user_id
        ).order_by(DailyProgress.date.desc()).limit(3).all()
        
        if not logs:
            return {"adjustment_note": "No feedback logs available yet. Keeping default plans.", "calorie_tweak": 0.0}
            
        bad_count = 0
        total_energy = 0
        logged_water = 0.0
        
        for log in logs:
            if log.morning_feedback == "Bad" or log.evening_feedback == "Bad":
                bad_count += 1
            if log.energy_level:
                total_energy += log.energy_level
            if log.water_intake_ml:
                logged_water += log.water_intake_ml
                
        avg_energy = total_energy / len(logs) if logs else 7.0
        avg_water_liters = (logged_water / len(logs)) / 1000.0 if logs else 2.0
        
        calorie_tweak = 0.0
        notes = []
        
        if bad_count >= 2:
            notes.append("Multiple meals rated 'Bad'. Transitioning suggestions to simpler, lighter Indian recipes.")
        if avg_energy < 5:
            notes.append("User energy levels are low. Increasing carbohydrate targets by 20g.")
            calorie_tweak += 80.0
        if avg_water_liters < 2.0:
            notes.append("Water intake is low. Adding reminders to drink more water during meals.")
            
        return {
            "adjustment_note": " | ".join(notes) if notes else "User adapting well. No calorie adjustments needed.",
            "calorie_tweak": calorie_tweak
        }
