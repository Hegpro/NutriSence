import logging
import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.database.models import User, MealHistory
from app.agent.graph import run_nutrition_agent
from app.agent.tools import NotificationTool

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def generate_all_meals_job():
    """Daily job that runs at midnight to generate meals for all onboarded users."""
    logger.info("[Scheduler] Starting daily meal generation job for all users...")
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_onboarded == True).all()
        for user in users:
            try:
                run_nutrition_agent(user.id)
                logger.info(f"[Scheduler] Generated meals for User ID: {user.id}")
            except Exception as e:
                logger.error(f"[Scheduler] Error generating meals for user {user.id}: {e}")
    finally:
        db.close()
    logger.info("[Scheduler] Daily meal generation job completed.")

def check_reminders_job():
    """Job that runs every minute to send email alerts 1 hour before scheduled meal times."""
    db = SessionLocal()
    try:
        now = datetime.datetime.now()
        # Format current time + 1 hour as HH:MM
        one_hour_later = now + datetime.timedelta(hours=1)
        target_time_str = one_hour_later.strftime("%H:%M")
        
        # Check morning meal times
        morning_users = db.query(User).filter(
            User.is_onboarded == True,
            User.morning_meal_time == target_time_str
        ).all()
        
        for user in morning_users:
            logger.info(f"[Scheduler] Sending morning meal reminder to User {user.name} ({user.email}) for target time {user.morning_meal_time}")
            NotificationTool.run(user.id, "morning", db)
            
        # Check evening meal times
        evening_users = db.query(User).filter(
            User.is_onboarded == True,
            User.evening_meal_time == target_time_str
        ).all()
        
        for user in evening_users:
            logger.info(f"[Scheduler] Sending evening meal reminder to User {user.name} ({user.email}) for target time {user.evening_meal_time}")
            NotificationTool.run(user.id, "evening", db)
            
    except Exception as e:
        logger.error(f"[Scheduler] Error in check_reminders_job: {e}")
    finally:
        db.close()

def start_scheduler():
    """Starts the background scheduler and registers jobs."""
    if not scheduler.running:
        # 1. Schedule daily generation at midnight
        scheduler.add_job(
            generate_all_meals_job, 
            trigger="cron", 
            hour=0, 
            minute=0, 
            id="daily_meal_generation",
            replace_existing=True
        )
        
        # 2. Schedule reminder checks every minute
        scheduler.add_job(
            check_reminders_job, 
            trigger="cron", 
            minute="*", 
            id="meal_reminder_checks",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("[Scheduler] APScheduler background service started successfully.")

def shutdown_scheduler():
    """Shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[Scheduler] APScheduler background service shut down.")
