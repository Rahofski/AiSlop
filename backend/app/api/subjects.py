from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models import Subject, Task, User
from app.schemas import SubjectCreate, SubjectOut

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectOut])
async def list_subjects(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[SubjectOut]:
    stmt = (
        select(
            Subject,
            func.count(Task.id).label("task_count"),
            func.max(Task.created_at).label("last_task_at"),
        )
        .where(Subject.user_id == user.id)
        .outerjoin(Task, Task.subject_id == Subject.id)
        .group_by(Subject.id)
        .order_by(Subject.created_at)
    )
    rows = (await session.execute(stmt)).all()
    return [
        SubjectOut(
            id=subject.id,
            name=subject.name,
            teacher=subject.teacher,
            task_count=task_count,
            last_task_at=last_task_at,
        )
        for subject, task_count, last_task_at in rows
    ]


@router.post("", response_model=SubjectOut, status_code=201)
async def create_subject(
    payload: SubjectCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
) -> SubjectOut:
    subject = Subject(name=payload.name, teacher=payload.teacher, user_id=user.id)
    session.add(subject)
    await session.commit()
    await session.refresh(subject)
    return SubjectOut(id=subject.id, name=subject.name, teacher=subject.teacher)
