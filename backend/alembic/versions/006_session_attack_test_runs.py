from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006_attack_test_runs"
down_revision = "005_drop_rationale"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_attack_test_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delay_seconds", sa.Integer(), nullable=False),
        sa.Column("total_steps", sa.Integer(), nullable=False),
        sa.Column("ok_count", sa.Integer(), nullable=False),
        sa.Column("fail_count", sa.Integer(), nullable=False),
        sa.Column("events", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["evaluation_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_session_attack_test_runs_session_created",
        "session_attack_test_runs",
        ["session_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_session_attack_test_runs_session_created", table_name="session_attack_test_runs")
    op.drop_table("session_attack_test_runs")
