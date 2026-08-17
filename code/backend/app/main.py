import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes_events import router as event_router
from app.api.routes_nodes import router as node_router
from app.services.storage_service import check_storage, create_bucket
from app.db.database import Base, engine
from fastapi.responses import JSONResponse

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
    await asyncio.sleep(2)

    try:
        Base.metadata.create_all(bind=engine)
        create_bucket()
        print("Storage connected")
    except Exception as e:
        print("Storage not available:", e)
        raise

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
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        check_storage()
        return {"status": "System is healthy", "database": "ok", "storage": "ok"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "System is not ready", "database": "unavailable", "storage": "unavailable"},
        )

app.include_router(event_router, prefix="/events", tags=["Events"])
app.include_router(node_router, prefix="/nodes", tags=["Nodes"])