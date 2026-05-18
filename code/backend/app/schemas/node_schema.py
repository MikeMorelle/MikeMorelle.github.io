from pydantic import BaseModel

"""
Pydantic schemas for node API operations.
"""

class NodeCreate(BaseModel):
    """ Request schema for registering a new node. """
    id: str
    name: str

class NodeResponse(BaseModel):
    """ Response schema for registering a new node. """
    id: str
    name: str
    status: str
    last_seen: str

class NodeDeleteResponse(BaseModel):
    """ Response schema after successful node deletion. """
    message: str