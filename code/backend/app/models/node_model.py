from sqlalchemy import Column, String
from app.db.database import Base

class Node(Base):
    """
    Database model for nodes, stores metadata for:
    - Unique id
    - Device name
    - Current status
    - Last heartbeat
    """

    __tablename__ = "nodes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)
    last_seen = Column(String)