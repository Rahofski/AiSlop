from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import get_session
from app.main import create_app
from app.models import Base
from app.queue import get_arq


class StubArq:
    """Records enqueued jobs instead of talking to Redis."""

    def __init__(self) -> None:
        self.jobs: list[tuple[str, tuple]] = []

    async def enqueue_job(self, name: str, *args) -> None:
        self.jobs.append((name, args))


@pytest.fixture
async def client(tmp_path: Path) -> AsyncIterator[httpx.AsyncClient]:
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_arq] = lambda: StubArq()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
    await engine.dispose()


@pytest.fixture
async def auth_client(client: httpx.AsyncClient) -> httpx.AsyncClient:
    """A client registered as student@example.com with the token attached."""
    response = await client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "name": "Student", "password": "secret-pass-1"},
    )
    assert response.status_code == 201, response.text
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client
