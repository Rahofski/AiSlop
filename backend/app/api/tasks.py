import asyncio
import json
from datetime import UTC, datetime, timedelta
from typing import Annotated

from arq.connections import ArqRedis
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from app.auth import get_current_user
from app.db import get_session
from app.models import Subject, Task, User
from app.queue import get_arq, task_channel
from app.schemas import PipelineStepOut, TaskCreate, TaskDetailOut, TaskOut

router = APIRouter(prefix="/tasks", tags=["tasks"])

TITLE_MAX_LEN = 48

# Stub until the TaskType registry lands (manual phase): map known type ids to a kind.
DOC_TASKTYPES = {"docx-report", "gost-format"}


def derive_kind(tasktype_id: str) -> str:
    return "doc" if tasktype_id in DOC_TASKTYPES else "code"


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
    subject_id: str | None = None,
    status: str | None = Query(default=None, pattern="^(queued|running|done|failed)$"),
    kind: str | None = Query(default=None, pattern="^(code|doc)$"),
    days: int | None = Query(default=None, ge=1, le=365),
) -> list[TaskOut]:
    stmt = (
        select(Task)
        .where(Task.user_id == user.id)
        .options(selectinload(Task.artifacts))
        .order_by(Task.created_at.desc())
    )
    if subject_id is not None:
        stmt = stmt.where(Task.subject_id == subject_id)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if kind is not None:
        stmt = stmt.where(Task.kind == kind)
    if days is not None:
        stmt = stmt.where(Task.created_at >= datetime.now(UTC) - timedelta(days=days))
    tasks = (await session.execute(stmt)).scalars().all()
    results = []
    for task in tasks:
        out = TaskOut.model_validate(task)
        if task.artifacts:
            out.artifact_filename = task.artifacts[0].filename
        results.append(out)
    return results


@router.get("/{task_id}", response_model=TaskDetailOut)
async def get_task(
    task_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
) -> TaskDetailOut:
    stmt = (
        select(Task)
        .where(Task.id == task_id, Task.user_id == user.id)
        .options(selectinload(Task.steps), selectinload(Task.artifacts))
    )
    task = (await session.execute(stmt)).scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskDetailOut.model_validate(task)


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    payload: TaskCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
    arq: Annotated[ArqRedis, Depends(get_arq)],
) -> TaskOut:
    subject = await session.get(Subject, payload.subject_id)
    if subject is None or subject.user_id != user.id:
        raise HTTPException(status_code=404, detail="Subject not found")

    title = " ".join(payload.prompt_text.split())[:TITLE_MAX_LEN]
    task = Task(
        user_id=user.id,
        subject_id=payload.subject_id,
        tasktype_id=payload.tasktype_id,
        kind=derive_kind(payload.tasktype_id),
        title=title,
        prompt_text=payload.prompt_text,
        status="queued",
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    await arq.enqueue_job("run_task", task.id)
    return TaskOut.model_validate(task)


@router.get("/{task_id}/events")
async def task_events(
    task_id: str,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
) -> EventSourceResponse:
    stmt = (
        select(Task)
        .where(Task.id == task_id, Task.user_id == user.id)
        .options(selectinload(Task.steps))
    )
    task = (await session.execute(stmt)).scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    redis: ArqRedis = request.app.state.arq

    async def event_stream():
        pubsub = redis.pubsub()
        await pubsub.subscribe(task_channel(task_id))
        try:
            # Snapshot after subscribing so no event falls between the two.
            snapshot = {
                "type": "snapshot",
                "task": {"id": task.id, "status": task.status, "error_summary": task.error_summary},
                "steps": [
                    PipelineStepOut.model_validate(step).model_dump() for step in task.steps
                ],
            }
            yield {"event": "snapshot", "data": json.dumps(snapshot)}
            if task.status in ("done", "failed"):
                return

            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=15)
                if message is None:
                    yield {"event": "ping", "data": "{}"}
                    continue
                raw = message["data"]
                if isinstance(raw, bytes):
                    raw = raw.decode()
                payload = json.loads(raw)
                yield {"event": payload["type"], "data": raw}
                if payload["type"] == "task" and payload["status"] in ("done", "failed"):
                    return
        except asyncio.CancelledError:
            # Client closed the connection — normal termination path.
            raise
        finally:
            await pubsub.unsubscribe(task_channel(task_id))
            await pubsub.aclose()

    return EventSourceResponse(event_stream())
