import uuid
from datetime import datetime
from app.db.database import SessionLocal
from app.models.event_model import Event
from app.services.storage_service import upload_file

async def handle_event_upload(file, event_type: str, node_id: str):
    """
    Event upload workflow.
    1. Generate a unique filename
    2. Upload image to storage
    3. Store metadata in a database
    """
    db = SessionLocal()

    try:
        # Generate unique filename to avoid collisions
        file_id = f"{uuid.uuid4()}.jpg"

        # Store image in object storage
        upload_file(file.file, file_id)

        # Store metadata in database
        event = Event(
            id=str(uuid.uuid4()),
            file_id=file_id,
            event_type=event_type,
            node_id=node_id,
            timestamp=datetime.utcnow().isoformat(),
            status="detected"
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        return {
            "message": "Event stored",
            "file_id": file_id,
            "event_type": event_type,
            "node_id": node_id,
            "timestamp": event.timestamp,
            "status": event.status
        }

    finally:
        db.close()