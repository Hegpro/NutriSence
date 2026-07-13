from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime
from app.database.connection import get_db
from app.database.models import User, MealHistory
from app.auth.utils import get_current_user
from app.agent.graph import run_nutrition_agent

router = APIRouter(prefix="/api/meals", tags=["Meals"])

@router.get("/today")
def get_today_meals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete onboarding first."
        )
        
    today = datetime.date.today()
    meals = db.query(MealHistory).filter(
        MealHistory.user_id == current_user.id,
        MealHistory.date == today
    ).all()
    
    # If no meals generated for today yet, trigger the agent on-the-fly!
    if not meals:
        agent_result = run_nutrition_agent(current_user.id)
        meals = db.query(MealHistory).filter(
            MealHistory.user_id == current_user.id,
            MealHistory.date == today
        ).all()
        
    # Format and return
    res = {"morning_meal": None, "evening_meal": None}
    for m in meals:
        formatted = {
            "id": m.id,
            "name": m.name,
            "ingredients": m.get_ingredients(),
            "quantity": m.quantity,
            "calories": m.calories,
            "protein": m.protein,
            "carbs": m.carbs,
            "fat": m.fat,
            "fiber": m.fiber,
            "vitamins": m.get_vitamins(),
            "cooking_instructions": m.cooking_instructions,
            "estimated_cost": m.estimated_cost,
            "prep_time": m.prep_time,
            "reason": m.reason
        }
        if m.meal_type == "morning":
            res["morning_meal"] = formatted
        elif m.meal_type == "evening":
            res["evening_meal"] = formatted
            
    return res

@router.post("/generate")
def force_generate_meals(current_user: User = Depends(get_current_user)):
    if not current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete onboarding first."
        )
        
    # Trigger LangGraph agent
    agent_result = run_nutrition_agent(current_user.id)
    
    return {
        "message": "Meals regenerated successfully!",
        "logs": agent_result.get("execution_logs", []),
        "errors": agent_result.get("validation_errors", []),
        "meals": agent_result.get("generated_meals", {})
    }

@router.get("/history")
def get_meal_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    meals = db.query(MealHistory).filter(
        MealHistory.user_id == current_user.id
    ).order_by(MealHistory.date.desc()).all()
    
    history = []
    for m in meals:
        history.append({
            "id": m.id,
            "date": m.date.strftime("%Y-%m-%d"),
            "meal_type": m.meal_type,
            "name": m.name,
            "calories": m.calories,
            "protein": m.protein,
            "carbs": m.carbs,
            "fat": m.fat,
            "prep_time": m.prep_time,
            "cost": m.estimated_cost
        })
    return history
