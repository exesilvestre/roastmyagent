from alembic import context
from sqlalchemy import create_engine, pool
from app.core.config import settings
from app.db.base import Base

target_metadata = Base.metadata


def run_migrations_online() -> None:
    connectable = create_engine(
        settings.sync_database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if not context.is_offline_mode():
    run_migrations_online()