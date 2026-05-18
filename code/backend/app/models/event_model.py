from sqlalchemy import Column, String
from app.db.database import Base

class Event(Base):
    """
    Database model for events, stores metadata for:
    - Event type
    - Sensor node
    - File reference
    - Timestamp
    - Status
    """

    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    file_id = Column(String)
    event_type = Column(String)
    node_id = Column(String)
    timestamp = Column(String)
    status = Column(String, default="detected")