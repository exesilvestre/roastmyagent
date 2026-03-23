from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "009_drop_session_status"
down_revision = "008_drop_mcp_agent_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("evaluation_sessions", "status")


def downgrade() -> None:
    op.add_column(
        "evaluation_sessions",
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
    )
    op.alter_column("evaluation_sessions", "status", server_default=None)

