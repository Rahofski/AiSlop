from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="AIH_", extra="ignore")

    # SQLite by default so the API runs without Docker; compose overrides with Postgres.
    database_url: str = "sqlite+aiosqlite:///./ai_helper.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-only-secret-change-me-in-production-0000"
    access_token_ttl_hours: int = 24 * 7
    artifacts_dir: str = "./artifacts"
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
