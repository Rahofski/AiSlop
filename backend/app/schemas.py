from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    teacher: str = Field(default="", max_length=200)


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    teacher: str
    task_count: int = 0
    last_task_at: datetime | None = None


class TaskCreate(BaseModel):
    prompt_text: str = Field(min_length=1)
    subject_id: str
    tasktype_id: str = Field(min_length=1, max_length=64)


class PipelineStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    idx: int
    step_id: str
    label: str
    status: str
    note: str | None = None


class ArtifactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: str
    filename: str
    size_bytes: int
    manifest: list | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subject_id: str
    tasktype_id: str
    kind: str
    title: str
    status: str
    error_summary: str | None = None
    created_at: datetime
    artifact_filename: str | None = None


class TaskDetailOut(TaskOut):
    prompt_text: str
    steps: list[PipelineStepOut] = []
    artifacts: list[ArtifactOut] = []
