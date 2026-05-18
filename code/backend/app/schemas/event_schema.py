from pydantic import BaseModel

"""
Pydantic schemas for event API operations.
"""

class EventCreate(BaseModel):
    """ Request payload for creating events. """
    event_type: str
    node_id: str

class EventResponse(BaseModel):
    """ Response returned after a successful upload. """
    message: str
    file_id: str
    event_type: str
    node_id: str
    timestamp: str
    status: str

class ErrorResponse(BaseModel):
    """ Standard error response structure. """
    detail: str