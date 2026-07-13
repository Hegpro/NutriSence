import datetime
import json
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    
    # Personal Info (Onboarding)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    height = Column(Float, nullable=True) # in cm
    weight = Column(Float, nullable=True) # in kg
    target_weight = Column(Float, nullable=True) # in kg
    
    # Preferences & Profile
    goal = Column(String, nullable=True) # Weight Loss, Weight Gain, Healthy Lifestyle, Muscle Gain
    food_preference = Column(String, nullable=True) # Vegetarian, Eggetarian, Non-Vegetarian, Vegan
    daily_activity_level = Column(String, nullable=True) # Sedentary, Light, Moderate, Active
    smoking = Column(Boolean, default=False)
    alcohol = Column(Boolean, default=False)
    water_intake = Column(Float, nullable=True) # in Liters
    sleep_hours = Column(Float, nullable=True)
    workout_frequency = Column(String, nullable=True)
    
    # Medical & Allergies (Stored as JSON-encoded string)
    medical_conditions = Column(Text, default="[]")
    food_allergies = Column(Text, default="[]")
    foods_dislikes = Column(Text, default="[]")
    foods_likes = Column(Text, default="[]")
    
    # Settings & Reminders
    notification_preference = Column(String, default="Email") # Email, WhatsApp
    morning_meal_time = Column(String, default="08:00") # HH:MM format
    evening_meal_time = Column(String, default="20:00") # HH:MM format
    
    is_onboarded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    meals = relationship("MealHistory", back_populates="user", cascade="all, delete-orphan")
    progress_logs = relationship("DailyProgress", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("AgentMemory", back_populates="user", cascade="all, delete-orphan")
    pipeline_configs = relationship("PipelineConfig", back_populates="user", cascade="all, delete-orphan")

    def get_medical_conditions(self):
        try:
            return json.loads(self.medical_conditions or "[]")
        except:
            return []

    def set_medical_conditions(self, value):
        self.medical_conditions = json.dumps(value)

    def get_food_allergies(self):
        try:
            return json.loads(self.food_allergies or "[]")
        except:
            return []

    def set_food_allergies(self, value):
        self.food_allergies = json.dumps(value)

    def get_foods_dislikes(self):
        try:
            return json.loads(self.foods_dislikes or "[]")
        except:
            return []

    def set_foods_dislikes(self, value):
        self.foods_dislikes = json.dumps(value)

    def get_foods_likes(self):
        try:
            return json.loads(self.foods_likes or "[]")
        except:
            return []

    def set_foods_likes(self, value):
        self.foods_likes = json.dumps(value)


class MealHistory(Base):
    __tablename__ = "meal_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, default=datetime.date.today)
    meal_type = Column(String, nullable=False) # "morning" or "evening"
    
    name = Column(String, nullable=False)
    ingredients = Column(Text, default="[]") # JSON string of ingredients and quantities
    quantity = Column(String, nullable=True)
    
    # Nutrition Details
    calories = Column(Float, nullable=False, default=0.0)
    protein = Column(Float, nullable=False, default=0.0)
    carbs = Column(Float, nullable=False, default=0.0)
    fat = Column(Float, nullable=False, default=0.0)
    fiber = Column(Float, default=0.0)
    vitamins = Column(Text, default="[]") # JSON string of vitamins/minerals
    
    # Recipe & Prep
    cooking_instructions = Column(Text, nullable=True)
    estimated_cost = Column(Float, nullable=True) # in INR/USD
    prep_time = Column(String, nullable=True) # e.g. "20 mins"
    reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="meals")

    def get_ingredients(self):
        try:
            return json.loads(self.ingredients or "[]")
        except:
            return []

    def set_ingredients(self, value):
        self.ingredients = json.dumps(value)

    def get_vitamins(self):
        try:
            return json.loads(self.vitamins or "[]")
        except:
            return []

    def set_vitamins(self, value):
        self.vitamins = json.dumps(value)


class DailyProgress(Base):
    __tablename__ = "daily_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, default=datetime.date.today)
    
    weight = Column(Float, nullable=True)
    
    # Meal Completion & Ratings
    ate_morning_meal = Column(Boolean, default=False)
    ate_evening_meal = Column(Boolean, default=False)
    morning_feedback = Column(String, nullable=True) # Good, Average, Bad
    evening_feedback = Column(String, nullable=True) # Good, Average, Bad
    
    energy_level = Column(Integer, nullable=True) # 1 to 10
    workout_completed = Column(Boolean, default=False)
    water_intake_ml = Column(Float, default=0.0) # in ml
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="progress_logs")


class AgentMemory(Base):
    __tablename__ = "agent_memory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    memory_type = Column(String, nullable=False) # e.g., "preference", "previous_meals", "feedback_summary"
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="memories")


class PipelineConfig(Base):
    __tablename__ = "pipeline_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Store React Flow graph JSON schema directly
    nodes = Column(Text, nullable=False)
    edges = Column(Text, nullable=False)
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="pipeline_configs")


class UserOTP(Base):
    __tablename__ = "user_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expiry = Column(DateTime, nullable=False)
