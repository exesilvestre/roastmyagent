from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load `.env` from the backend package root so Alembic and uvicorn use the same DB URL
# regardless of the shell current working directory.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "RoastMyAgent API"
    cors_origins: str = "http://localhost:3000"
    database_url: str = "postgresql+asyncpg://roastmyagent:roastmyagent@localhost:5432/roastmyagent"
    fernet_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sync_database_url(self) -> str:
        url = self.database_url
        if "+asyncpg" in url:
            return url.replace("+asyncpg", "+psycopg", 1)
        return url


settings = Settings()
