from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User
from app.auth.utils import get_current_user
from app.agent.graph import run_nutrition_agent
from pydantic import BaseModel, EmailStr
from typing import Optional, List

router = APIRouter(prefix="/api/users", tags=["Users"])

class OnboardRequest(BaseModel):
    age: int
    gender: str
    height: float
    weight: float
    target_weight: Optional[float] = None
    goal: str
    food_preference: str
    daily_activity_level: str
    smoking: bool
    alcohol: bool
    water_intake: float
    sleep_hours: float
    workout_frequency: str
    medical_conditions: List[str] = []
    food_allergies: List[str] = []
    foods_dislikes: List[str] = []
    foods_likes: List[str] = []
    notification_preference: str = "Email"
    morning_meal_time: str = "08:00"
    evening_meal_time: str = "20:00"

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    target_weight: Optional[float] = None
    goal: Optional[str] = None
    food_preference: Optional[str] = None
    daily_activity_level: Optional[str] = None
    smoking: Optional[bool] = None
    alcohol: Optional[bool] = None
    water_intake: Optional[float] = None
    sleep_hours: Optional[float] = None
    workout_frequency: Optional[str] = None
    medical_conditions: Optional[List[str]] = None
    food_allergies: Optional[List[str]] = None
    foods_dislikes: Optional[List[str]] = None
    foods_likes: Optional[List[str]] = None
    notification_preference: Optional[str] = None
    morning_meal_time: Optional[str] = None
    evening_meal_time: Optional[str] = None

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "is_onboarded": current_user.is_onboarded,
        "age": current_user.age,
        "gender": current_user.gender,
        "height": current_user.height,
        "weight": current_user.weight,
        "target_weight": current_user.target_weight,
        "goal": current_user.goal,
        "food_preference": current_user.food_preference,
        "daily_activity_level": current_user.daily_activity_level,
        "smoking": current_user.smoking,
        "alcohol": current_user.alcohol,
        "water_intake": current_user.water_intake,
        "sleep_hours": current_user.sleep_hours,
        "workout_frequency": current_user.workout_frequency,
        "medical_conditions": current_user.get_medical_conditions(),
        "food_allergies": current_user.get_food_allergies(),
        "foods_dislikes": current_user.get_foods_dislikes(),
        "foods_likes": current_user.get_foods_likes(),
        "notification_preference": current_user.notification_preference,
        "morning_meal_time": current_user.morning_meal_time,
        "evening_meal_time": current_user.evening_meal_time,
    }

@router.put("/onboard")
def onboard_user(data: OnboardRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Save onboard details
    current_user.age = data.age
    current_user.gender = data.gender
    current_user.height = data.height
    current_user.weight = data.weight
    current_user.target_weight = data.target_weight
    current_user.goal = data.goal
    current_user.food_preference = data.food_preference
    current_user.daily_activity_level = data.daily_activity_level
    current_user.smoking = data.smoking
    current_user.alcohol = data.alcohol
    current_user.water_intake = data.water_intake
    current_user.sleep_hours = data.sleep_hours
    current_user.workout_frequency = data.workout_frequency
    current_user.notification_preference = data.notification_preference
    current_user.morning_meal_time = data.morning_meal_time
    current_user.evening_meal_time = data.evening_meal_time
    
    current_user.set_medical_conditions(data.medical_conditions)
    current_user.set_food_allergies(data.food_allergies)
    current_user.set_foods_dislikes(data.foods_dislikes)
    current_user.set_foods_likes(data.foods_likes)
    
    current_user.is_onboarded = True
    
    db.commit()
    db.refresh(current_user)
    
    # Run the LangGraph agent immediately on onboarding to create today's first meals!
    run_nutrition_agent(current_user.id)
    
    return {"message": "Onboarding complete!", "user": get_me(current_user)}

@router.put("/profile")
def update_profile(data: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.name is not None:
        current_user.name = data.name
    if data.age is not None:
        current_user.age = data.age
    if data.gender is not None:
        current_user.gender = data.gender
    if data.height is not None:
        current_user.height = data.height
    if data.weight is not None:
        current_user.weight = data.weight
    if data.target_weight is not None:
        current_user.target_weight = data.target_weight
    if data.goal is not None:
        current_user.goal = data.goal
    if data.food_preference is not None:
        current_user.food_preference = data.food_preference
    if data.daily_activity_level is not None:
        current_user.daily_activity_level = data.daily_activity_level
    if data.smoking is not None:
        current_user.smoking = data.smoking
    if data.alcohol is not None:
        current_user.alcohol = data.alcohol
    if data.water_intake is not None:
        current_user.water_intake = data.water_intake
    if data.sleep_hours is not None:
        current_user.sleep_hours = data.sleep_hours
    if data.workout_frequency is not None:
        current_user.workout_frequency = data.workout_frequency
    if data.notification_preference is not None:
        current_user.notification_preference = data.notification_preference
    if data.morning_meal_time is not None:
        current_user.morning_meal_time = data.morning_meal_time
    if data.evening_meal_time is not None:
        current_user.evening_meal_time = data.evening_meal_time
        
    if data.medical_conditions is not None:
        current_user.set_medical_conditions(data.medical_conditions)
    if data.food_allergies is not None:
        current_user.set_food_allergies(data.food_allergies)
    if data.foods_dislikes is not None:
        current_user.set_foods_dislikes(data.foods_dislikes)
    if data.foods_likes is not None:
        current_user.set_foods_likes(data.foods_likes)
        
    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully!", "user": get_me(current_user)}
