from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

revision = "003_session_agent_connections"
down_revision = "002_add_agent_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_agent_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_kind", sa.String(length=32), nullable=False),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=text("'{}'::jsonb"),
        ),
        sa.Column("encrypted_secret", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["evaluation_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )


def downgrade() -> None:
    op.drop_table("session_agent_connections")
