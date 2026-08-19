from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.subjects import router as subjects_router
from app.api.tasks import router as tasks_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(subjects_router)
api_router.include_router(tasks_router)

__all__ = ["api_router", "health_router"]
