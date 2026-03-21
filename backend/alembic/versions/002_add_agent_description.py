from alembic import op
import sqlalchemy as sa

revision = "002_add_agent_description"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "evaluation_sessions",
        sa.Column("agent_description", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("evaluation_sessions", "agent_description")
