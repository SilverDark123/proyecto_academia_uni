from fastapi import APIRouter, Depends
from middleware.auth import require_role
from config.database import get_db
import asyncpg
import controllers.adminController as adminController

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/dashboard", dependencies=[Depends(require_role(["admin"]))])
async def get_dashboard(db: asyncpg.Connection = Depends(get_db)):
    return await adminController.get_dashboard_data(db)

@router.get("/analytics", dependencies=[Depends(require_role(["admin"]))])
async def get_analytics(
    cycle_id: int = None, 
    student_id: int = None,
    db: asyncpg.Connection = Depends(get_db)
):
    return await adminController.get_analytics(cycle_id, student_id, db)

@router.get("/notifications", dependencies=[Depends(require_role(["admin"]))])
async def get_notifications(
    student_id: int = None,
    type: str = None,
    limit: int = 50,
    db: asyncpg.Connection = Depends(get_db)
):
    return await adminController.get_notifications(student_id, type, limit, db)

@router.get("/stats", dependencies=[Depends(require_role(["admin"]))])
async def get_stats(db: asyncpg.Connection = Depends(get_db)):
    return await adminController.get_general_stats(db)
