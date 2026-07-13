import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

def clean_database_url(url: str) -> str:
    if url.startswith("postgres") and url.count("@") > 1:
        scheme_end = url.find("://")
        if scheme_end != -1:
            prefix = url[:scheme_end + 3]
            rest = url[scheme_end + 3:]
            credentials, host_part = rest.rsplit("@", 1)
            if ":" in credentials:
                user, password = credentials.split(":", 1)
                encoded_password = urllib.parse.quote_plus(password)
                return f"{prefix}{user}:{encoded_password}@{host_part}"
    return url

db_url = clean_database_url(settings.DATABASE_URL)

# If using SQLite, add connect_args to allow multithreading
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Configure engine arguments
engine_args = {
    "connect_args": connect_args
}
if not db_url.startswith("sqlite"):
    engine_args["pool_pre_ping"] = True
    engine_args["pool_recycle"] = 300

engine = create_engine(
    db_url,
    **engine_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
