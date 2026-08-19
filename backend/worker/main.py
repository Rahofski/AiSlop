"""arq worker: executes task pipelines.

Slice 1: steps are fake (sleep-based) — the point is the delivery
infrastructure: statuses land in Postgres (source of truth) and are published
to Redis pub/sub for SSE. The real step executors (llm/sandbox/package)
replace `_run_fake_step` in the next slices.
"""

import asyncio
import json
from datetime import UTC, datetime

from arq.connections import ArqRedis, RedisSettings
from redis.asyncio import Redis

from app.config import get_settings
from app.db import SessionLocal
from app.models import PipelineStep, Task
from app.queue import task_channel
from app.schemas import PipelineStepOut

STEP_TEMPLATES: dict[str, list[tuple[str, str]]] = {
    "code": [
        ("analyze", "Analyzing assignment"),
        ("generate", "Generating code"),
        ("build", "Compiling (dotnet build)"),
        ("test", "Running tests"),
        ("package", "Packaging"),
    ],
    "doc": [
        ("analyze", "Analyzing topic"),
        ("outline", "Outlining document"),
        ("write", "Writing content"),
        ("format", "Formatting & styling"),
        ("export", "Exporting to .docx"),
    ],
}

FAKE_NOTES: dict[str, list[str]] = {
    "code": ["3s", "21s", "ok", "12/12", "zip"],
    "doc": ["2s", "6 sections", "34s", "GOST 7.32", "docx"],
}

FAKE_STEP_SECONDS = 0.9


def utcnow() -> datetime:
    return datetime.now(UTC)


async def _publish(redis: Redis, task_id: str, payload: dict) -> None:
    await redis.publish(task_channel(task_id), json.dumps(payload))


async def _publish_step(redis: Redis, task_id: str, step: PipelineStep) -> None:
    step_out = PipelineStepOut.model_validate(step).model_dump()
    await _publish(redis, task_id, {"type": "step", "task_id": task_id, "step": step_out})


async def _publish_task(redis: Redis, task: Task) -> None:
    payload = {
        "type": "task",
        "task_id": task.id,
        "status": task.status,
        "error_summary": task.error_summary,
    }
    await _publish(redis, task.id, payload)


async def run_task(ctx: dict, task_id: str) -> None:
    redis: ArqRedis = ctx["redis"]
    async with SessionLocal() as session:
        task = await session.get(Task, task_id)
        if task is None or task.status != "queued":
            return

        task.status = "running"
        task.started_at = utcnow()
        template = STEP_TEMPLATES.get(task.kind, STEP_TEMPLATES["code"])
        steps = [
            PipelineStep(task_id=task.id, idx=i, step_id=step_id, label=label, status="pending")
            for i, (step_id, label) in enumerate(template)
        ]
        session.add_all(steps)
        await session.commit()
        await _publish_task(redis, task)

        notes = FAKE_NOTES.get(task.kind, FAKE_NOTES["code"])
        # Demo failure hook: mention "fail" in the assignment to exercise the
        # failure path end-to-end.
        fail_at = len(steps) - 2 if "fail" in task.prompt_text.lower() else -1

        for i, step in enumerate(steps):
            step.status = "active"
            step.started_at = utcnow()
            await session.commit()
            await _publish_step(redis, task.id, step)

            await asyncio.sleep(FAKE_STEP_SECONDS)

            if i == fail_at:
                step.status = "failed"
                step.note = "error"
                step.finished_at = utcnow()
                task.status = "failed"
                task.error_summary = (
                    "Tests kept failing after 3 repair attempts (simulated). "
                    "Real pipeline arrives in the next slices."
                )
                task.finished_at = utcnow()
                await session.commit()
                await _publish_step(redis, task.id, step)
                await _publish_task(redis, task)
                return

            step.status = "done"
            step.note = notes[i] if i < len(notes) else None
            step.finished_at = utcnow()
            await session.commit()
            await _publish_step(redis, task.id, step)

        task.status = "done"
        task.finished_at = utcnow()
        await session.commit()
        await _publish_task(redis, task)


class WorkerSettings:
    functions = [run_task]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    max_jobs = 4
