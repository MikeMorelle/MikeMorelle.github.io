import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes_events import router as event_router
from app.api.routes_nodes import router as node_router
from app.services.storage_service import create_bucket
from app.db.database import Base, engine

"""
Main entry point of the backend application.

Responsibilities:
- Start FastAPI application
- Initialize database tables
- Initialize object storage bucket
- Register API routes
- Configure CORS
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs during application startup/shutdown.
    - Waits for external services (DB/Storage)
    - Creates database tables
    - Creates object storage bucket
    """

    print("Starting backend...")
    time.sleep(2)

    try:
        Base.metadata.create_all(bind=engine)
        create_bucket()
        print("Storage connected")
    except Exception as e:
        print("Storage not available:", e)

    yield

    print("Shutting down backend...")

app = FastAPI(
    title="Cloud Computing Backend",
    description="""
    Features:
    - Sensor node management
    - Event storage
    - Object storage integration
    """,
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "docExpansion": "list",
        "displayRequestDuration": True
    }
)

# Allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Backend running"}

@app.get("/health")
def health():
    return {"status": "System is healthy"}

app.include_router(event_router, prefix="/events", tags=["Events"])
app.include_router(node_router, prefix="/nodes", tags=["Nodes"])
