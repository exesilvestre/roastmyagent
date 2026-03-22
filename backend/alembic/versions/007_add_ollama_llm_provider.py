from alembic import op
from sqlalchemy import text

revision = "007_add_ollama_llm_provider"
down_revision = "006_attack_test_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        text(
            "INSERT INTO llm_provider_configs (id) SELECT 'ollama' "
            "WHERE NOT EXISTS (SELECT 1 FROM llm_provider_configs WHERE id = 'ollama')"
        )
    )


def downgrade() -> None:
    op.execute(
        text(
            "UPDATE app_settings SET active_provider_id = NULL WHERE active_provider_id = 'ollama'"
        )
    )
    op.execute(text("DELETE FROM llm_provider_configs WHERE id = 'ollama'"))
