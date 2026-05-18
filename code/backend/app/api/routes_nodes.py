from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from app.db.database import SessionLocal
from app.models.node_model import Node

router = APIRouter()

"""
Node API routes.

Handles:
- registration
- availability
- heartbeats
- offline detection
"""

@router.post("/")
def create_node(node_id: str, name: str):
    """ Register a new node. """
    db = SessionLocal()

    try:
        existing = db.query(Node).filter(Node.id == node_id).first()

        if existing:
            raise HTTPException(status_code=400, detail="Node already exists")

        node = Node(id=node_id, name=name, status="online", last_seen=datetime.utcnow().isoformat())

        db.add(node)
        db.commit()
        db.refresh(node)

        return {
            "message": "Node created successfully",
            "node": {
                "id": node.id,
                "name": node.name,
                "status": node.status,
                "last_seen": node.last_seen
            }
        }

    finally:
        db.close()

@router.get("/")
def get_nodes():
    """ Get all nodes with computed online/offline status. """
    db = SessionLocal()

    try:
        nodes = db.query(Node).all()
        now = datetime.utcnow()

        for node in nodes:
            last_seen = datetime.fromisoformat(node.last_seen)

            if now - last_seen > timedelta(minutes=2):
                node.status = "offline"
            else:
                node.status = "online"

        db.commit()
        return [
            {
                "id": node.id,
                "name": node.name,
                "status": node.status,
                "last_seen": node.last_seen
            }
            for node in nodes
        ]

    finally:
        db.close()

@router.get("/{node_id}")
def get_node(node_id: str):
    """ Return single node information. """
    db = SessionLocal()

    try:
        node = db.query(Node).filter(Node.id == node_id).first()

        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        return {
            "id": node.id,
            "name": node.name,
            "status": node.status,
            "last_seen": node.last_seen
        }

    finally:
        db.close()

@router.delete("/{node_id}")
def delete_node(node_id: str):
    """ Remove a node from the system. """
    db = SessionLocal()

    try:
        node = db.query(Node).filter(Node.id == node_id).first()

        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        db.delete(node)
        db.commit()

        return {
            "message": "Node deleted",
            "node_id": node_id
        }

    finally:
        db.close()

@router.post("/{node_id}/heartbeat")
def heartbeat(node_id: str):
    """ Heartbeat endpoint used to confirm that nodes are still online. """
    db = SessionLocal()

    try:
        node = db.query(Node).filter(Node.id == node_id).first()

        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        node.status = "online"
        node.last_seen = datetime.utcnow().isoformat()

        db.commit()

        return {
            "message": "Heartbeat received",
            "node_id": node.id,
            "status": node.status,
            "last_seen": node.last_seen
        }

    finally:
        db.close()