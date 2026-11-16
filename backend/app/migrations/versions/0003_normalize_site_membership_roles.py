"""Align legacy site assignments with the four primary roles.

Revision ID: 0003_site_roles
Revises: 0002_roles_tasks
"""
from alembic import op

revision = "0003_site_roles"
down_revision = "0002_roles_tasks"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("UPDATE site_memberships SET role='SITE_MANAGER' WHERE role IN ('PROJECT_MANAGER','SITE_OPERATOR')")

def downgrade():
    pass
