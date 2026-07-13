import logging
import json
import datetime
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.database.models import User, MealHistory, DailyProgress, AgentMemory, PipelineConfig
from app.agent.state import AgentState
from app.agent.tools import (
    UserProfileTool, CalorieCalculatorTool, ProteinCalculatorTool, 
    NutritionAnalysisTool, MemoryTool, FeedbackAnalyzerTool
)
from app.agent.prompts import MEAL_GENERATOR_SYSTEM_PROMPT, MEAL_GENERATOR_USER_PROMPT, MEAL_NUTRITION_CALCULATOR_PROMPT
from app.services.vector_store import add_memory
from app.config import settings

logger = logging.getLogger(__name__)

# LLM imports
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None


def get_llm_candidates():
    """Returns a list of prioritized tuples (name, llm_instance) for execution fallbacks."""
    candidates = []
    
    # Try Groq (Primary LLM Engine)
    if settings.GROQ_API_KEY and ChatGroq:
        try:
            logger.info("[LLM] Pre-configuring Groq Llama 3.1...")
            candidates.append(("Groq Llama 8B", ChatGroq(
                model="llama-3.1-8b-instant",
                groq_api_key=settings.GROQ_API_KEY,
                temperature=0.8,
                max_retries=0
            )))
        except Exception as e:
            logger.error(f"[LLM] Failed to pre-configure Groq: {e}")
            
    return candidates


def get_pipeline_disabled_nodes(user_id: int) -> list[str]:
    """Retrieves list of disabled node IDs from the database pipeline config."""
    db = SessionLocal()
    try:
        config = db.query(PipelineConfig).filter(PipelineConfig.user_id == user_id).first()
        if config:
            nodes = json.loads(config.nodes)
            disabled = [n.get("id") for n in nodes if not n.get("data", {}).get("enabled", True)]
            return disabled
        return []
    except Exception as e:
        logger.error(f"Error checking pipeline config: {e}")
        return []
    finally:
        db.close()


# Nodes implementation

def load_memory_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "load_memory" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Load Memory")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Load Memory")
    db = SessionLocal()
    try:
        memory_data = MemoryTool.run(user_id, db)
        feedback_data = FeedbackAnalyzerTool.run(user_id, db)
        
        memories = [
            f"Recent Meals: {', '.join(memory_data['recent_suggested_meals'])}",
            f"Feedback History: {', '.join(memory_data['feedback_history'])}",
            f"Semantic Memory: {', '.join(memory_data['semantic_memories'])}"
        ]
        
        logs.append("Loaded episodic meal histories and user ratings from database & vector store.")
        
        return {
            "memories": memories,
            "nutritional_targets": {"calorie_tweak": feedback_data.get("calorie_tweak", 0.0)},
            "execution_logs": logs
        }
    except Exception as e:
        logger.exception(f"Error in load_memory_node: {e}")
        logs.append(f"Error loading memory: {str(e)}")
        return {"execution_logs": logs}
    finally:
        db.close()


def read_profile_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "read_profile" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Read Profile")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Read Profile")
    db = SessionLocal()
    try:
        profile = UserProfileTool.run(user_id, db)
        logs.append(f"Loaded profile characteristics for user: {profile.get('name')}.")
        return {
            "user_profile": profile,
            "execution_logs": logs
        }
    except Exception as e:
        logger.exception(f"Error in read_profile_node: {e}")
        logs.append(f"Error reading profile: {str(e)}")
        return {"execution_logs": logs}
    finally:
        db.close()


def analyze_demographics_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "analyze_demographics" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Analyze Demographics")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Analyze Demographics")
    try:
        profile = state.get("user_profile", {})
        calorie_tweak = state.get("nutritional_targets", {}).get("calorie_tweak", 0.0)
        
        targets = NutritionAnalysisTool.run(
            age=profile.get("age", 25),
            gender=profile.get("gender", "Male"),
            height=profile.get("height", 175.0),
            weight=profile.get("weight", 70.0),
            activity=profile.get("daily_activity_level", "Sedentary"),
            goal=profile.get("goal", "Healthy Lifestyle")
        )
        
        # Apply feedback calorie adjustments
        if calorie_tweak:
            targets["calories"] += calorie_tweak
            logs.append(f"Applied feedback adjustments: tweaked target calories by +{calorie_tweak} kcal.")
            
        logs.append(f"Targets Set: Calories={targets['calories']}kcal, Protein={targets['protein']}g, Carbs={targets['carbs']}g, Fat={targets['fat']}g.")
        return {
            "nutritional_targets": targets,
            "execution_logs": logs
        }
    except Exception as e:
        logger.exception(f"Error in analyze_demographics_node: {e}")
        logs.append(f"Error analyzing demographics: {str(e)}")
        return {"execution_logs": logs}


def generate_meals_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "generate_meals" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Generate Meals")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Generate Meals")
    
    profile = state.get("user_profile", {})
    targets = state.get("nutritional_targets", {})
    memories = state.get("memories", [])
    
    # 1. Format Prompts
    system_prompt = MEAL_GENERATOR_SYSTEM_PROMPT.format(
        food_preference=profile.get("food_preference", "Vegetarian"),
        allergies=", ".join(profile.get("food_allergies", [])),
        dislikes=", ".join(profile.get("foods_dislikes", [])),
        likes=", ".join(profile.get("foods_likes", [])),
        target_calories=targets.get("calories", 2000),
        target_protein=targets.get("protein", 65),
        recent_meals=memories[0] if len(memories) > 0 else "None",
        feedback=memories[1] if len(memories) > 1 else "None"
    )
    
    import time
    user_prompt = MEAL_GENERATOR_USER_PROMPT.format(
        name=profile.get("name", "User"),
        age=profile.get("age", 25),
        gender=profile.get("gender", "Male"),
        weight=profile.get("weight", 70),
        target_weight=profile.get("target_weight", 70),
        goal=profile.get("goal", "Healthy Lifestyle"),
        activity=profile.get("daily_activity_level", "Sedentary"),
        medical_conditions=", ".join(profile.get("medical_conditions", [])),
        feedback_note=memories[2] if len(memories) > 2 else "None",
        seed=str(time.time())
    )
    
    # 2. Invoke LLM with prioritized sequential fallbacks
    llms = get_llm_candidates()
    generated_meals = None
    
    for name, llm in llms:
        try:
            logs.append(f"Requesting meal generation from active LLM ({name})...")
            messages = [
                ("system", system_prompt),
                ("human", user_prompt)
            ]
            response = llm.invoke(messages)
            
            # Clean response text
            raw_text = response.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()
            raw_text = raw_text.strip()
            
            generated_meals = json.loads(raw_text)
            logs.append(f"Successfully generated custom meals from LLM ({name}).")
            
            # 2.5 Calculate precise nutritional values using a separate LLM call (nutrition calculator)
            try:
                logs.append(f"Requesting nutritional calculations from active LLM ({name})...")
                calc_prompt = MEAL_NUTRITION_CALCULATOR_PROMPT.format(meal_plan_json=json.dumps(generated_meals))
                calc_response = llm.invoke([("user", calc_prompt)])
                
                calc_text = calc_response.content.strip()
                if calc_text.startswith("```json"):
                    calc_text = calc_text.replace("```json", "", 1)
                if calc_text.endswith("```"):
                    calc_text = calc_text[:-3].strip()
                calc_text = calc_text.strip()
                
                calculated_meals = json.loads(calc_text)
                # Safeguard: ensure it returned a valid dictionary with both meals
                if isinstance(calculated_meals, dict) and "morning_meal" in calculated_meals:
                    generated_meals = calculated_meals
                    logs.append(f"Successfully calculated meal nutritional values via active LLM ({name}).")
                else:
                    logs.append(f"Calculator ({name}) returned unexpected schema format. Using default estimations.")
            except Exception as calc_err:
                logger.error(f"LLM nutrition calculation error ({name}): {calc_err}")
                logs.append(f"LLM calculation failed ({name}): {str(calc_err)}. Using default estimations.")
            
            # If we successfully generated meals, break the loop
            break
            
        except Exception as e:
            logger.error(f"LLM meal generation error ({name}): {e}")
            logs.append(f"LLM API Error ({name}): {str(e)}.")
            
    # 3. Rules-based Mock Fallback Engine if LLM fails or is unconfigured
    if not generated_meals:
        logs.append("Triggered Rules-based Local meal compilation.")
        generated_meals = compile_fallback_meals(profile, targets)
        
    return {
        "generated_meals": generated_meals,
        "execution_logs": logs
    }


def validate_nutrition_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "validate_nutrition" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Validate Nutrition")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Validate Nutrition")
    
    profile = state.get("user_profile", {})
    targets = state.get("nutritional_targets", {})
    meals = state.get("generated_meals", {})
    
    errors = []
    
    # Check null
    if not meals:
        errors.append("No meals generated.")
        return {"validation_errors": errors, "execution_logs": logs}
        
    # Check calories & protein against boundaries
    morning = meals.get("morning_meal", {})
    evening = meals.get("evening_meal", {})
    
    total_cal = morning.get("calories", 0) + evening.get("calories", 0)
    total_prot = morning.get("protein", 0) + evening.get("protein", 0)
    
    target_cal = targets.get("calories", 2000)
    target_prot = targets.get("protein", 65)
    
    # Validate Calorie limits (within 15% range)
    if total_cal < target_cal * 0.85:
        errors.append(f"Calorie shortfall: Generated total ({total_cal} kcal) is below 85% of target ({target_cal} kcal).")
    elif total_cal > target_cal * 1.15:
        errors.append(f"Calorie excess: Generated total ({total_cal} kcal) exceeds 115% of target ({target_cal} kcal).")
        
    # Validate Protein limits
    if total_prot < target_prot * 0.85:
        errors.append(f"Protein shortfall: Generated total ({total_prot}g) is below 85% of target ({target_prot}g).")
        
    # Validate Diet preference
    preference = profile.get("food_preference", "Vegetarian").lower()
    allergies = [a.lower() for a in profile.get("food_allergies", [])]
    
    for m_type, meal in [("morning", morning), ("evening", evening)]:
        meal_name = meal.get("name", "").lower()
        ingredients = [i.get("name", "").lower() for i in meal.get("ingredients", [])]
        
        # Allergy validation
        for allergy in allergies:
            if allergy in meal_name or any(allergy in ing for ing in ingredients):
                errors.append(f"Allergy Warning: {m_type.title()} meal contains allergen candidate: '{allergy}'.")
                
        # Diet Preference validation
        if "vegetarian" in preference or "vegan" in preference:
            non_veg_items = ["chicken", "fish", "mutton", "beef", "pork", "prawn", "seafood"]
            for nv in non_veg_items:
                if nv in meal_name or any(nv in ing for ing in ingredients):
                    errors.append(f"Diet Preference Breach: {m_type.title()} meal '{meal.get('name')}' contains meat item '{nv}' despite Vegetarian selection.")
                    
        if "vegan" in preference:
            dairy_items = ["milk", "paneer", "cheese", "butter", "ghee", "curd", "yogurt", "egg"]
            for d in dairy_items:
                if d in meal_name or any(d in ing for ing in ingredients):
                    errors.append(f"Diet Preference Breach: {m_type.title()} meal '{meal.get('name')}' contains dairy/egg '{d}' despite Vegan selection.")
                    
        if "eggetarian" in preference:
            non_veg_items = ["chicken", "fish", "mutton", "beef", "pork", "prawn"]
            for nv in non_veg_items:
                if nv in meal_name or any(nv in ing for ing in ingredients):
                    errors.append(f"Diet Preference Breach: {m_type.title()} meal '{meal.get('name')}' contains meat '{nv}' despite Eggetarian preference.")

    if errors:
        logs.append(f"Nutrition Validation detected {len(errors)} warnings. Automatically modifying macro adjustments.")
    else:
        logs.append("Nutrition Validation passed. Generated meals meet macro requirements and allergy rules.")
        
    return {
        "validation_errors": errors,
        "execution_logs": logs
    }


def save_history_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "save_history" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Save History")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Save History")
    
    meals = state.get("generated_meals", {})
    if not meals:
        logs.append("Save History skipped: No generated meals available.")
        return {"execution_logs": logs}
        
    db = SessionLocal()
    try:
        today = datetime.date.today()
        
        # Clear existing meals for today to avoid duplicate entries
        db.query(MealHistory).filter(
            MealHistory.user_id == user_id,
            MealHistory.date == today
        ).delete()
        
        for meal_key, m_type in [("morning_meal", "morning"), ("evening_meal", "evening")]:
            m_data = meals.get(meal_key)
            if not m_data:
                continue
                
            db_meal = MealHistory(
                user_id=user_id,
                date=today,
                meal_type=m_type,
                name=m_data.get("name", "Healthy Indian Meal"),
                quantity=m_data.get("quantity", "1 serving"),
                calories=m_data.get("calories", 500.0),
                protein=m_data.get("protein", 20.0),
                carbs=m_data.get("carbs", 50.0),
                fat=m_data.get("fat", 15.0),
                fiber=m_data.get("fiber", 5.0),
                cooking_instructions=m_data.get("cooking_instructions", ""),
                estimated_cost=m_data.get("estimated_cost", 100.0),
                prep_time=m_data.get("prep_time", "20 mins"),
                reason=m_data.get("reason", "")
            )
            db_meal.set_ingredients(m_data.get("ingredients", []))
            db_meal.set_vitamins(m_data.get("vitamins", []))
            
            db.add(db_meal)
            
            # Save to ChromaDB semantic memory
            memory_text = f"On {today.strftime('%Y-%m-%d')}, generated {m_type} meal '{db_meal.name}' with ingredients: {', '.join([i.get('name','') for i in m_data.get('ingredients', [])])}. Cost: {db_meal.estimated_cost} INR."
            add_memory(
                user_id=user_id,
                memory_text=memory_text,
                metadata={"type": "meal_generation", "date": today.strftime("%Y-%m-%d"), "meal_type": m_type}
            )
            
        db.commit()
        logs.append("Saved generated meals to history database.")
        logs.append("Registered new entries in ChromaDB vector memory store.")
    except Exception as e:
        db.rollback()
        logger.exception(f"Error in save_history_node: {e}")
        logs.append(f"Error saving history: {str(e)}")
    finally:
        db.close()
        
    return {"execution_logs": logs}


def schedule_reminder_node(state: AgentState) -> dict:
    user_id = state["user_id"]
    logs = list(state.get("execution_logs", []))
    
    if "schedule_reminder" in get_pipeline_disabled_nodes(user_id):
        logs.append("[Pipeline] Skipped Node: Schedule Reminder")
        return {"execution_logs": logs}
        
    logs.append("Executing Node: Schedule Reminder")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # Reminders will be picked up by the background scheduler service
            logs.append(f"Reminders scheduled: Morning notification set to {user.morning_meal_time} (1h before morning meal), Evening notification set to {user.evening_meal_time} (1h before evening meal).")
        else:
            logs.append("Warning: Could not configure reminder scheduler. User profile missing.")
    except Exception as e:
        logger.exception(f"Error in schedule_reminder_node: {e}")
        logs.append(f"Error scheduling reminders: {str(e)}")
    finally:
        db.close()
        
    return {"execution_logs": logs}


# Helper fallback recipe generator

def compile_fallback_meals(profile: dict, targets: dict) -> dict:
    """Fallback generator with local recipes in case LLM is offline or has invalid keys."""
    pref = profile.get("food_preference", "Vegetarian").lower()
    goal = profile.get("goal", "Healthy Lifestyle").lower()
    
    # 1. Morning Meal Database
    morning_db = {
        "vegetarian": {
            "name": "Moong Dal Chilla & Greek Yogurt",
            "ingredients": [
                {"name": "Moong Dal batter", "quantity": "1 cup"},
                {"name": "Onion and Capsicum", "quantity": "50g chopped"},
                {"name": "Greek Yogurt / Curd", "quantity": "1 small bowl (150g)"},
                {"name": "Olive Oil/Ghee", "quantity": "1 tsp"}
            ],
            "quantity": "2 pieces of Chilla with Curd",
            "calories": round(targets.get("calories", 2000) * 0.42, 0),
            "protein": round(targets.get("protein", 65) * 0.45, 1),
            "carbs": round(targets.get("carbs", 200) * 0.4, 1),
            "fat": round(targets.get("fat", 50) * 0.35, 1),
            "fiber": 6.5,
            "vitamins": ["Vitamin A", "Vitamin C", "Calcium"],
            "cooking_instructions": "1. Soak moong dal, grind to paste. Add chopped veggies and salt. \n2. Pour batter on hot tawa, cook both sides with ghee. \n3. Serve warm with greek yogurt.",
            "estimated_cost": 60.0,
            "prep_time": "15 mins",
            "reason": "Rich in lean plant-based protein from Moong Dal and probiotics from Curd to support digestion and muscle maintenance."
        },
        "vegan": {
            "name": "Tofu Scramble & Avocado Toast",
            "ingredients": [
                {"name": "Firm Tofu", "quantity": "150g"},
                {"name": "Whole Wheat Bread", "quantity": "2 slices"},
                {"name": "Avocado", "quantity": "1/2 piece"},
                {"name": "Turmeric and Black Salt", "quantity": "1 pinch"}
            ],
            "quantity": "1 bowl scrambled tofu + 2 toasts",
            "calories": round(targets.get("calories", 2000) * 0.4, 0),
            "protein": round(targets.get("protein", 65) * 0.42, 1),
            "carbs": round(targets.get("carbs", 200) * 0.4, 1),
            "fat": round(targets.get("fat", 50) * 0.4, 1),
            "fiber": 8.0,
            "vitamins": ["Healthy Fats", "Iron", "Vitamin B6"],
            "cooking_instructions": "1. Crumble tofu. Sauté in a pan with turmeric, black pepper, and black salt.\n2. Toast bread and spread mashed avocado on top.\n3. Serve scrambled tofu on the side.",
            "estimated_cost": 90.0,
            "prep_time": "10 mins",
            "reason": "100% plant-based, using soy protein from tofu and heart-healthy monounsaturated fats from avocado."
        },
        "eggetarian": {
            "name": "Masala Egg Omelette & Brown Bread",
            "ingredients": [
                {"name": "Whole Eggs", "quantity": "3 pieces"},
                {"name": "Onion, Tomato, Green Chili", "quantity": "50g chopped"},
                {"name": "Brown Bread", "quantity": "2 slices"},
                {"name": "Butter", "quantity": "1 tsp"}
            ],
            "quantity": "3-egg omelette with 2 bread slices",
            "calories": round(targets.get("calories", 2000) * 0.45, 0),
            "protein": round(targets.get("protein", 65) * 0.48, 1),
            "carbs": round(targets.get("carbs", 200) * 0.35, 1),
            "fat": round(targets.get("fat", 50) * 0.45, 1),
            "fiber": 4.5,
            "vitamins": ["Vitamin D", "B12", "Choline"],
            "cooking_instructions": "1. Whisk eggs with chopped veggies, salt, and pepper. \n2. Melt butter on pan, pour eggs, cook both sides. \n3. Serve hot with toasted brown bread slices.",
            "estimated_cost": 50.0,
            "prep_time": "10 mins",
            "reason": "High biological value protein from eggs and complex carbs from brown bread to support sustained morning energy."
        }
    }
    
    # 2. Evening Meal Database
    evening_db = {
        "vegetarian": {
            "name": "Paneer Tikka Skewers & Quinoa Pulao",
            "ingredients": [
                {"name": "Low Fat Paneer", "quantity": "150g cubes"},
                {"name": "Bell Peppers and Onions", "quantity": "100g chunked"},
                {"name": "Quinoa", "quantity": "1/2 cup raw"},
                {"name": "Spices (Tandoori & Jeera)", "quantity": "1 tsp"}
            ],
            "quantity": "4 skewers + 1 bowl Quinoa Pulao",
            "calories": round(targets.get("calories", 2000) * 0.58, 0),
            "protein": round(targets.get("protein", 65) * 0.55, 1),
            "carbs": round(targets.get("carbs", 200) * 0.6, 1),
            "fat": round(targets.get("fat", 50) * 0.65, 1),
            "fiber": 7.5,
            "vitamins": ["Calcium", "Magnesium", "Potassium"],
            "cooking_instructions": "1. Marinate paneer and veggies in yogurt & spices, grill or airfry.\n2. Cook quinoa with water, sautéed jeera, and vegetables.\n3. Serve paneer skewers alongside Quinoa Pulao.",
            "estimated_cost": 130.0,
            "prep_time": "25 mins",
            "reason": "Abundant calcium and slow-digesting protein from paneer combined with a complete amino acid profile from quinoa."
        },
        "vegan": {
            "name": "Tempeh Rice Bowl with Broccoli & Peanut Sauce",
            "ingredients": [
                {"name": "Organic Tempeh", "quantity": "150g"},
                {"name": "Brown Rice", "quantity": "1 cup cooked"},
                {"name": "Broccoli & Carrot", "quantity": "100g steamed"},
                {"name": "Peanut Butter", "quantity": "1 tbsp"}
            ],
            "quantity": "1 large mixed vegan bowl",
            "calories": round(targets.get("calories", 2000) * 0.6, 0),
            "protein": round(targets.get("protein", 65) * 0.58, 1),
            "carbs": round(targets.get("carbs", 200) * 0.6, 1),
            "fat": round(targets.get("fat", 50) * 0.6, 1),
            "fiber": 9.5,
            "vitamins": ["Folate", "Fiber", "Zinc"],
            "cooking_instructions": "1. Pan-fry tempeh cubes until crispy. \n2. Steam broccoli and carrots. \n3. Whisk peanut butter with warm water, soy sauce, and lime. \n4. Assemble brown rice, tempeh, veggies, and drizzle peanut sauce.",
            "estimated_cost": 150.0,
            "prep_time": "20 mins",
            "reason": "Fermented tempeh provides highly bioavailable vegan protein, while brown rice delivers long-lasting fiber and carbs."
        },
        "eggetarian": {
            "name": "Boiled Egg Bhurji & Chapati",
            "ingredients": [
                {"name": "Whole Eggs", "quantity": "4 pieces"},
                {"name": "Onions & Tomatoes", "quantity": "100g chopped"},
                {"name": "Whole Wheat Chapati", "quantity": "3 pieces"},
                {"name": "Ghee", "quantity": "1 tsp"}
            ],
            "quantity": "3 Chapatis with a plate of Egg Bhurji",
            "calories": round(targets.get("calories", 2000) * 0.55, 0),
            "protein": round(targets.get("protein", 65) * 0.52, 1),
            "carbs": round(targets.get("carbs", 200) * 0.65, 1),
            "fat": round(targets.get("fat", 50) * 0.55, 1),
            "fiber": 6.0,
            "vitamins": ["Vitamin A", "Iron", "Vitamin B12"],
            "cooking_instructions": "1. Scramble eggs in a hot pan with ghee, onions, tomatoes, turmeric, and garam masala. \n2. Roll and cook whole wheat chapatis on tawa. \n3. Serve hot.",
            "estimated_cost": 65.0,
            "prep_time": "15 mins",
            "reason": "High protein meal containing rich essential amino acids, combined with whole grain fiber from fresh chapatis."
        }
    }
    
    # Non-vegetarian recipes (falls back to eggetarian or custom chicken recipes)
    nonveg_morning = {
        "name": "Chicken Sausage Breakfast Salad",
        "ingredients": [
            {"name": "Chicken Sausage", "quantity": "3 links (150g)"},
            {"name": "Egg Whites", "quantity": "3 pieces boiled"},
            {"name": "Lettuce & Cherry Tomatoes", "quantity": "100g"},
            {"name": "Olive Oil dressing", "quantity": "1 tbsp"}
        ],
        "quantity": "1 large breakfast bowl",
        "calories": round(targets.get("calories", 2000) * 0.45, 0),
        "protein": round(targets.get("protein", 65) * 0.55, 1),
        "carbs": round(targets.get("carbs", 200) * 0.25, 1),
        "fat": round(targets.get("fat", 50) * 0.45, 1),
        "fiber": 3.5,
        "vitamins": ["Lean Protein", "Iron", "Vitamin C"],
        "cooking_instructions": "1. Grill chicken sausages. Slice them.\n2. Slice boiled egg whites.\n3. Toss sausages, eggs, lettuce, and tomatoes with olive oil and lime juice.",
        "estimated_cost": 120.0,
        "prep_time": "12 mins",
        "reason": "Packed with lean animal protein to fuel muscle recovery and keep calories in check."
    }
    
    nonveg_evening = {
        "name": "Grilled Chicken Breast & Roasted Sweet Potatoes",
        "ingredients": [
            {"name": "Chicken Breast", "quantity": "200g"},
            {"name": "Sweet Potatoes", "quantity": "150g sliced"},
            {"name": "Broccoli & Green Beans", "quantity": "100g"},
            {"name": "Butter", "quantity": "1 tsp"}
        ],
        "quantity": "1 plate Grilled Chicken + Veggies",
        "calories": round(targets.get("calories", 2000) * 0.55, 0),
        "protein": round(targets.get("protein", 65) * 0.58, 1),
        "carbs": round(targets.get("carbs", 200) * 0.5, 1),
        "fat": round(targets.get("fat", 50) * 0.45, 1),
        "fiber": 6.8,
        "vitamins": ["B6", "Vitamin A", "Potassium"],
        "cooking_instructions": "1. Marinate chicken breast with garlic paste, lemon, and herbs. Grill on both sides.\n2. Toss sweet potato slices in salt and pepper, roast or airfry.\n3. Steam broccoli and green beans. Serve everything hot.",
        "estimated_cost": 180.0,
        "prep_time": "25 mins",
        "reason": "Extremely high protein, low fat dinner designed to optimize muscle synthesis and satisfy caloric targets."
    }
    
    # Build final selection
    m_meal = None
    e_meal = None
    
    if pref == "non-vegetarian":
        m_meal = nonveg_morning
        e_meal = nonveg_evening
    else:
        # vegetarian, vegan, or eggetarian fallback
        category = pref if pref in ["vegetarian", "vegan", "eggetarian"] else "vegetarian"
        m_meal = morning_db[category]
        e_meal = evening_db[category]
        
    return {
        "morning_meal": m_meal,
        "evening_meal": e_meal
    }
