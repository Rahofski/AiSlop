from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from fastapi import Request

from app.config import get_settings


def task_channel(task_id: str) -> str:
    return f"task-events:{task_id}"


async def create_arq_pool() -> ArqRedis:
    return await create_pool(RedisSettings.from_dsn(get_settings().redis_url))


async def get_arq(request: Request) -> ArqRedis:
    return request.app.state.arq
