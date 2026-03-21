from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004_session_attack_prompts"
down_revision = "003_session_agent_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_attack_prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("intent", sa.Text(), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["evaluation_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_session_attack_prompts_session_sort",
        "session_attack_prompts",
        ["session_id", "sort_order"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_session_attack_prompts_session_sort", table_name="session_attack_prompts")
    op.drop_table("session_attack_prompts")
