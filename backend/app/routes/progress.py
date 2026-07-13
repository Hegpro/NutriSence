from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime
from typing import Optional
from pydantic import BaseModel
from app.database.connection import get_db
from app.database.models import User, DailyProgress, MealHistory
from app.auth.utils import get_current_user
from app.services.vector_store import add_memory

router = APIRouter(prefix="/api/progress", tags=["Progress"])

class ProgressLogRequest(BaseModel):
    weight: Optional[float] = None
    ate_morning_meal: Optional[bool] = None
    ate_evening_meal: Optional[bool] = None
    morning_feedback: Optional[str] = None # Good, Average, Bad
    evening_feedback: Optional[str] = None # Good, Average, Bad
    energy_level: Optional[int] = None # 1-10
    workout_completed: Optional[bool] = None
    water_intake_ml: Optional[float] = None

@router.get("/today")
def get_today_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.date.today()
    log = db.query(DailyProgress).filter(
        DailyProgress.user_id == current_user.id,
        DailyProgress.date == today
    ).first()
    
    if not log:
        return {
            "weight": current_user.weight,
            "ate_morning_meal": False,
            "ate_evening_meal": False,
            "morning_feedback": "",
            "evening_feedback": "",
            "energy_level": 7,
            "workout_completed": False,
            "water_intake_ml": 0.0
        }
        
    return {
        "weight": log.weight,
        "ate_morning_meal": log.ate_morning_meal,
        "ate_evening_meal": log.ate_evening_meal,
        "morning_feedback": log.morning_feedback or "",
        "evening_feedback": log.evening_feedback or "",
        "energy_level": log.energy_level or 7,
        "workout_completed": log.workout_completed,
        "water_intake_ml": log.water_intake_ml
    }

@router.post("/log")
def log_progress(data: ProgressLogRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.date.today()
    log = db.query(DailyProgress).filter(
        DailyProgress.user_id == current_user.id,
        DailyProgress.date == today
    ).first()
    
    is_new = False
    if not log:
        is_new = True
        log = DailyProgress(
            user_id=current_user.id,
            date=today,
            weight=data.weight if data.weight is not None else current_user.weight,
            ate_morning_meal=data.ate_morning_meal or False,
            ate_evening_meal=data.ate_evening_meal or False,
            morning_feedback=data.morning_feedback,
            evening_feedback=data.evening_feedback,
            energy_level=data.energy_level or 7,
            workout_completed=data.workout_completed or False,
            water_intake_ml=data.water_intake_ml or 0.0
        )
        db.add(log)
    else:
        if data.weight is not None:
            log.weight = data.weight
            # Update user's current weight baseline
            current_user.weight = data.weight
        if data.ate_morning_meal is not None:
            log.ate_morning_meal = data.ate_morning_meal
        if data.ate_evening_meal is not None:
            log.ate_evening_meal = data.ate_evening_meal
        if data.morning_feedback is not None:
            log.morning_feedback = data.morning_feedback
        if data.evening_feedback is not None:
            log.evening_feedback = data.evening_feedback
        if data.energy_level is not None:
            log.energy_level = data.energy_level
        if data.workout_completed is not None:
            log.workout_completed = data.workout_completed
        if data.water_intake_ml is not None:
            log.water_intake_ml = data.water_intake_ml

    db.commit()
    db.refresh(log)
    if not is_new:
        db.refresh(current_user)
        
    # Build feedback memories to inject into ChromaDB Cloud
    feedback_notes = []
    
    # Check if meals were logged today to associate their names
    today_meals = db.query(MealHistory).filter(
        MealHistory.user_id == current_user.id,
        MealHistory.date == today
    ).all()
    morning_meal_name = next((m.name for m in today_meals if m.meal_type == "morning"), "Morning Meal")
    evening_meal_name = next((m.name for m in today_meals if m.meal_type == "evening"), "Evening Meal")
    
    if data.morning_feedback:
        feedback_notes.append(f"User left feedback on breakfast '{morning_meal_name}': Rated it {data.morning_feedback}.")
    if data.evening_feedback:
        feedback_notes.append(f"User left feedback on dinner '{evening_meal_name}': Rated it {data.evening_feedback}.")
    if data.weight:
        feedback_notes.append(f"User weight recorded today: {data.weight} kg (Goal: {current_user.goal}).")
        
    for note in feedback_notes:
        add_memory(
            user_id=current_user.id,
            memory_text=note,
            metadata={"type": "user_feedback", "date": today.strftime("%Y-%m-%d")}
        )
        
    return {"message": "Progress logged successfully!", "log": get_today_progress(current_user, db)}

@router.get("/stats")
def get_progress_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.date.today()
    
    # 1. Fetch today's meals and check completion status
    today_meals = db.query(MealHistory).filter(
        MealHistory.user_id == current_user.id,
        MealHistory.date == today
    ).all()
    
    today_log = db.query(DailyProgress).filter(
        DailyProgress.user_id == current_user.id,
        DailyProgress.date == today
    ).first()
    
    ate_morning = today_log.ate_morning_meal if today_log else False
    ate_evening = today_log.ate_evening_meal if today_log else False
    
    today_protein = 0.0
    today_calories = 0.0
    
    for m in today_meals:
        if m.meal_type == "morning" and ate_morning:
            today_protein += m.protein
            today_calories += m.calories
        elif m.meal_type == "evening" and ate_evening:
            today_protein += m.protein
            today_calories += m.calories
            
    # Calculate Completion %
    completion_pct = 0
    if ate_morning and ate_evening:
        completion_pct = 100
    elif ate_morning or ate_evening:
        completion_pct = 50
        
    # 2. Next Meal Countdown
    now = datetime.datetime.now()
    morning_time = datetime.datetime.strptime(current_user.morning_meal_time, "%H:%M").time()
    evening_time = datetime.datetime.strptime(current_user.evening_meal_time, "%H:%M").time()
    
    m_dt = datetime.datetime.combine(today, morning_time)
    e_dt = datetime.datetime.combine(today, evening_time)
    
    if now < m_dt:
        diff = m_dt - now
        hours, remainder = divmod(diff.seconds, 3600)
        minutes = remainder // 60
        countdown = f"Morning meal in {hours}h {minutes}m"
    elif now < e_dt:
        diff = e_dt - now
        hours, remainder = divmod(diff.seconds, 3600)
        minutes = remainder // 60
        countdown = f"Evening meal in {hours}h {minutes}m"
    else:
        # Next morning meal tomorrow
        tomorrow = today + datetime.timedelta(days=1)
        next_m_dt = datetime.datetime.combine(tomorrow, morning_time)
        diff = next_m_dt - now
        hours, remainder = divmod(diff.seconds, 3600)
        minutes = remainder // 60
        countdown = f"Morning meal in {hours}h {minutes}m (Tomorrow)"

    # 3. Compile Weekly Data (last 7 days)
    seven_days_ago = today - datetime.timedelta(days=6)
    
    weekly_logs = db.query(DailyProgress).filter(
        DailyProgress.user_id == current_user.id,
        DailyProgress.date >= seven_days_ago
    ).order_by(DailyProgress.date.asc()).all()
    
    weekly_meals = db.query(MealHistory).filter(
        MealHistory.user_id == current_user.id,
        MealHistory.date >= seven_days_ago
    ).order_by(MealHistory.date.asc()).all()
    
    # Map logs & meals by date
    logs_by_date = {log.date: log for log in weekly_logs}
    meals_by_date = {}
    for m in weekly_meals:
        if m.date not in meals_by_date:
            meals_by_date[m.date] = []
        meals_by_date[m.date].append(m)
        
    weekly_protein_chart = []
    weekly_calories_chart = []
    weight_progress_chart = []
    meal_completion_chart = []
    
    for i in range(7):
        date_cursor = seven_days_ago + datetime.timedelta(days=i)
        date_str = date_cursor.strftime("%b %d") # e.g. "Jul 06"
        day_str = date_cursor.strftime("%a") # e.g. "Mon"
        
        log = logs_by_date.get(date_cursor)
        meals = meals_by_date.get(date_cursor, [])
        
        ate_m = log.ate_morning_meal if log else False
        ate_e = log.ate_evening_meal if log else False
        
        # Calculate protein & calorie sum based on what was eaten
        prot = 0.0
        cals = 0.0
        for m in meals:
            if m.meal_type == "morning" and ate_m:
                prot += m.protein
                cals += m.calories
            elif m.meal_type == "evening" and ate_e:
                prot += m.protein
                cals += m.calories
                
        # If no log exists for a past date but meals exist, display target baseline to look complete
        if not log and meals:
            # Assume 0 consumed but don't crash
            prot = 0.0
            cals = 0.0
            
        weekly_protein_chart.append({"day": day_str, "protein": round(prot, 1)})
        weekly_calories_chart.append({"day": day_str, "calories": round(cals, 0)})
        
        # Weight progress chart
        weight = log.weight if (log and log.weight) else (current_user.weight or 0.0)
        weight_progress_chart.append({"date": date_str, "weight": weight})
        
        # Completion Rate chart
        comp_pct = 0
        if ate_m and ate_e:
            comp_pct = 100
        elif ate_m or ate_e:
            comp_pct = 50
        meal_completion_chart.append({"date": date_str, "rate": comp_pct})

    return {
        "summary": {
            "goal": current_user.goal or "Healthy Lifestyle",
            "weight": current_user.weight or 0.0,
            "target_weight": current_user.target_weight or 0.0,
            "today_protein": round(today_protein, 1),
            "today_calories": round(today_calories, 0),
            "meal_completion": completion_pct,
            "next_meal_countdown": countdown,
            "water_intake_ml": today_log.water_intake_ml if today_log else 0.0,
            "workout_completed": today_log.workout_completed if today_log else False
        },
        "charts": {
            "weekly_protein": weekly_protein_chart,
            "weekly_calories": weekly_calories_chart,
            "weight_progress": weight_progress_chart,
            "meal_completion": meal_completion_chart
        }
    }
