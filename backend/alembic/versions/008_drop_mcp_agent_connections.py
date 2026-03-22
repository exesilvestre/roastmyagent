"""Remove legacy MCP agent connection rows (MCP support removed; HTTP-only).

Users must reconfigure agent connection as HTTP after upgrade.
"""

from alembic import op
from sqlalchemy import text

revision = "008_drop_mcp_agent_connections"
down_revision = "007_add_ollama_llm_provider"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        text("DELETE FROM session_agent_connections WHERE connection_kind = 'MCP'")
    )


def downgrade() -> None:
    # Cannot restore deleted rows.
    pass
