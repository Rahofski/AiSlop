from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.db import get_session
from app.models import Subject, Task, User
from app.schemas import TaskCreate, TaskDetailOut, TaskOut

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
    # Job enqueueing into arq arrives with the pipeline core (manual phase).
    return TaskOut.model_validate(task)
