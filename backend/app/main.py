import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.connection import engine, Base
from app.routes import auth, users, meals, progress, pipeline
from app.services.scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Create database tables at startup
try:
    logger.info("[Database] Initializing tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("[Database] Tables initialized successfully.")
except Exception as e:
    logger.exception(f"[Database] Critical failure initializing database: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("[Lifespan] Starting background services...")
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"[Lifespan] Failed to start scheduler: {e}")
        
    yield
    
    # Shutdown actions
    logger.info("[Lifespan] Shutting down background services...")
    shutdown_scheduler()

app = FastAPI(
    title="NutriSense AI Backend",
    description="LangGraph-powered AI nutrition coach with drag-and-drop workflow configuration.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(meals.router)
app.include_router(progress.router)
app.include_router(pipeline.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "NutriSense AI Agent Backend",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on port {settings.PORT}...")
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
