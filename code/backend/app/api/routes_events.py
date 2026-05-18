from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from app.services.event_service import handle_event_upload
from app.schemas.event_schema import EventResponse, ErrorResponse
from app.db.database import SessionLocal
from app.models.event_model import Event
from app.services.storage_service import delete_file, generate_download_url

router = APIRouter()

"""
Event API routes.

Handles:
- uploads
- retrieval
- filtering
- status updates
- deletion
"""

@router.post("/", response_model=EventResponse, responses={400: {"model": ErrorResponse}})
async def create_event( file: UploadFile = File(...), event_type: str = Form(...), node_id: str = Form(...)):
    """ Creates new detection event. """
    try:
        return await handle_event_upload(file, event_type, node_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
def get_events(event_type: str = Query(None), node_id: str = Query(None), page: int = Query(1), limit: int = Query(10)):
    """ Retrieve events with filtering and pagination. """
    db = SessionLocal()

    query = db.query(Event)

    # Filtering
    if event_type:
        query = query.filter(Event.event_type == event_type)

    if node_id:
        query = query.filter(Event.node_id == node_id)

    # Pagination
    offset = (page - 1) * limit
    events = query.offset(offset).limit(limit).all()

    db.close()
    return events

@router.get("/{event_id}/image")
def get_event_image(event_id: str):
    """ Returns a temporary signed URL for image access. """
    db = SessionLocal()

    event = db.query(Event).filter(Event.id == event_id).first()

    db.close()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    url = generate_download_url(event.file_id)

    return {"image_url": url}

@router.put("/{event_id}/status")
def update_event_status(event_id: str, status: str):
    """
    Update event processing status.

    STATUSES:
    - Detected
    - Reviewed
    - Resolved
    - False_positive
    """
    db = SessionLocal()

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        db.close()
        raise HTTPException(status_code=404, detail="Event not found")

    event.status = status

    db.commit()
    db.close()

    return {
        "message": "Event status updated",
        "status": status
    }

@router.delete("/{event_id}")
def delete_event(event_id: str):
    """ Delete event and associated image, this deletes BOTH metadata and stored image. """
    db = SessionLocal()

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        db.close()
        raise HTTPException(status_code=404, detail="Event not found")

    delete_file(event.file_id)

    db.delete(event)
    db.commit()
    db.close()

    return {"message": "Event deleted"}