import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User, PipelineConfig
from app.auth.utils import get_current_user
from app.agent.graph import run_nutrition_agent
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline Configuration"])

class PipelineSaveRequest(BaseModel):
    nodes: str # JSON encoded string
    edges: str # JSON encoded string

def get_default_pipeline():
    """Generates the standard React Flow configuration for the nutrition agent."""
    nodes = [
        {"id": "load_memory", "type": "custom", "position": {"x": 50, "y": 150}, "data": {"label": "Load User Memory", "enabled": True, "description": "Fetches historical preferences and previous meals."}},
        {"id": "read_profile", "type": "custom", "position": {"x": 280, "y": 150}, "data": {"label": "Read Profile", "enabled": True, "description": "Loads physical details, food choice, and allergen lists."}},
        {"id": "analyze_demographics", "type": "custom", "position": {"x": 510, "y": 150}, "data": {"label": "Analyze Goal & Macros", "enabled": True, "description": "Calculates targeted daily caloric and protein limits."}},
        {"id": "generate_meals", "type": "custom", "position": {"x": 740, "y": 150}, "data": {"label": "Generate Meals (LLM)", "enabled": True, "description": "Calls Gemini to prepare custom morning and evening menus."}},
        {"id": "validate_nutrition", "type": "custom", "position": {"x": 970, "y": 150}, "data": {"label": "Validate Nutrition", "enabled": True, "description": "Checks generated menu against calorie ranges and allergies."}},
        {"id": "save_history", "type": "custom", "position": {"x": 1200, "y": 150}, "data": {"label": "Save History", "enabled": True, "description": "Saves meals in SQLite and index in ChromaDB memory."}},
        {"id": "schedule_reminder", "type": "custom", "position": {"x": 1430, "y": 150}, "data": {"label": "Schedule Reminder", "enabled": True, "description": "Triggers email dispatch jobs 1 hour before dining."}}
    ]
    
    edges = [
        {"id": "e1-2", "source": "load_memory", "target": "read_profile", "animated": True},
        {"id": "e2-3", "source": "read_profile", "target": "analyze_demographics", "animated": True},
        {"id": "e3-4", "source": "analyze_demographics", "target": "generate_meals", "animated": True},
        {"id": "e4-5", "source": "generate_meals", "target": "validate_nutrition", "animated": True},
        {"id": "e5-6", "source": "validate_nutrition", "target": "save_history", "animated": True},
        {"id": "e6-7", "source": "save_history", "target": "schedule_reminder", "animated": True}
    ]
    
    return {
        "nodes": json.dumps(nodes),
        "edges": json.dumps(edges)
    }

@router.get("/config")
def get_pipeline_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(PipelineConfig).filter(PipelineConfig.user_id == current_user.id).first()
    if not config:
        # Return default template
        return get_default_pipeline()
        
    return {
        "nodes": config.nodes,
        "edges": config.edges
    }

@router.post("/config")
def save_pipeline_config(data: PipelineSaveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(PipelineConfig).filter(PipelineConfig.user_id == current_user.id).first()
    if not config:
        config = PipelineConfig(
            user_id=current_user.id,
            nodes=data.nodes,
            edges=data.edges
        )
        db.add(config)
    else:
        config.nodes = data.nodes
        config.edges = data.edges
        
    db.commit()
    return {"message": "Pipeline configuration saved successfully!"}

@router.post("/test")
def test_pipeline_execution(current_user: User = Depends(get_current_user)):
    """Triggers an instantaneous dry run of the active workflow graph and returns logs."""
    if not current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete onboarding first."
        )
        
    agent_result = run_nutrition_agent(current_user.id)
    
    return {
        "logs": agent_result.get("execution_logs", []),
        "errors": agent_result.get("validation_errors", []),
        "generated_meals": agent_result.get("generated_meals", {})
    }
