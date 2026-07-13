import logging
from langgraph.graph import StateGraph, START, END
from app.agent.state import AgentState
from app.agent.nodes import (
    load_memory_node, read_profile_node, analyze_demographics_node,
    generate_meals_node, validate_nutrition_node, save_history_node,
    schedule_reminder_node
)

logger = logging.getLogger(__name__)

def compile_agent():
    """Compiles the nutrition LangGraph workflow agent."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("load_memory", load_memory_node)
    workflow.add_node("read_profile", read_profile_node)
    workflow.add_node("analyze_demographics", analyze_demographics_node)
    workflow.add_node("generate_meals", generate_meals_node)
    workflow.add_node("validate_nutrition", validate_nutrition_node)
    workflow.add_node("save_history", save_history_node)
    workflow.add_node("schedule_reminder", schedule_reminder_node)
    
    # Define execution path
    workflow.add_edge(START, "load_memory")
    workflow.add_edge("load_memory", "read_profile")
    workflow.add_edge("read_profile", "analyze_demographics")
    workflow.add_edge("analyze_demographics", "generate_meals")
    workflow.add_edge("generate_meals", "validate_nutrition")
    workflow.add_edge("validate_nutrition", "save_history")
    workflow.add_edge("save_history", "schedule_reminder")
    workflow.add_edge("schedule_reminder", END)
    
    return workflow.compile()

# Compile global instance
nutrition_agent = compile_agent()

def run_nutrition_agent(user_id: int) -> dict:
    """Helper to execute the compiled LangGraph workflow for a specific user ID."""
    logger.info(f"[LangGraph] Initiating agent execution for User: {user_id}")
    
    initial_state = {
        "user_id": user_id,
        "user_profile": {},
        "memories": [],
        "nutritional_targets": {},
        "generated_meals": {},
        "validation_errors": [],
        "execution_logs": []
    }
    
    try:
        final_state = nutrition_agent.invoke(initial_state)
        logger.info(f"[LangGraph] Agent execution completed for User: {user_id}")
        return final_state
    except Exception as e:
        logger.exception(f"[LangGraph] Runtime crash during agent execution for User {user_id}: {e}")
        return {
            "user_id": user_id,
            "validation_errors": [f"Agent crash: {str(e)}"],
            "execution_logs": [f"CRITICAL ERROR: {str(e)}"]
        }
