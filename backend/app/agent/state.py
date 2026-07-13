from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    user_id: int
    user_profile: Dict[str, Any]
    memories: List[str]
    nutritional_targets: Dict[str, float]
    generated_meals: Dict[str, Any] # "morning" and "evening" meal schemas
    validation_errors: List[str]
    execution_logs: List[str]
    pipeline_config: Optional[Dict[str, Any]]
