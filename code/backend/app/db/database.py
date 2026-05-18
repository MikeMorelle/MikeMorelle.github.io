from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import time

"""
Database configuration layer.
- Creates database engine
- connection retries
- Provide reusable DB sessions

PostgreSQL stores structured metadata only, th image files are stored separately in object storage.
"""

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin@localhost:5432/backend")

def create_db_engine():
    """ Creates database connection with retry logic. """
    for i in range(10):
        try:
            engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            connection = engine.connect()
            connection.close()
            return engine
        except Exception:
            time.sleep(2)

    raise Exception("Database connection failed")

engine = create_db_engine()

# Creates DB sessions for each request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Creates DB sessions for each request
Base = declarative_base()