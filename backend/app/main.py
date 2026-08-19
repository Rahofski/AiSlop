from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router, health_router
from app.config import get_settings
from app.queue import create_arq_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.arq = await create_arq_pool()
    yield
    await app.state.arq.aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="AI-Helper API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(api_router)
    return app


app = create_app()
