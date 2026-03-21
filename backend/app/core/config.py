from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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
