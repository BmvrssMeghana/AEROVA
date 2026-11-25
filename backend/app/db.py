import os
import re
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DB_SCHEMA = os.getenv("AEROVA_DB_SCHEMA", "aerova_website")
if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", DB_SCHEMA):
    raise RuntimeError("AEROVA_DB_SCHEMA must be a valid PostgreSQL schema identifier")

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
elif all(os.getenv(key) for key in ("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD")):
    database_url = URL.create(
        "postgresql+psycopg",
        username=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.environ["POSTGRES_DB"],
    )
    engine = create_engine(database_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
else:
    DATABASE_URL = "sqlite:///./aerova_dev.db"
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

class Base(DeclarativeBase):
    metadata = MetaData(schema=DB_SCHEMA if engine.dialect.name == "postgresql" else None)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
