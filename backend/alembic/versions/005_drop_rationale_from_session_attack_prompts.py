from alembic import op

# Keep ≤32 chars: alembic_version.version_num is VARCHAR(32) (see 001_initial).
revision = "005_drop_rationale"
down_revision = "004_session_attack_prompts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("session_attack_prompts", "rationale")


def downgrade() -> None:
    import sqlalchemy as sa

    op.add_column(
        "session_attack_prompts",
        sa.Column("rationale", sa.Text(), nullable=True),
    )
