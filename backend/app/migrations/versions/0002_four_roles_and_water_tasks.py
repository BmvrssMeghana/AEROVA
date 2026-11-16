"""Four primary roles, driver profile and water task history.

Revision ID: 0002_roles_tasks
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from app.db import Base
from app import models  # noqa: F401

revision = "0002_roles_tasks"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    bind=op.get_bind(); inspector=inspect(bind)
    for table,column in (("users",sa.Column("status",sa.String(24),nullable=False,server_default="ACTIVE")),("users",sa.Column("last_login_at",sa.DateTime(timezone=True),nullable=True)),("organizations",sa.Column("contact_name",sa.String(180),nullable=True)),("organizations",sa.Column("contact_email",sa.String(254),nullable=True)),("organizations",sa.Column("contact_phone",sa.String(40),nullable=True)),("organization_memberships",sa.Column("status",sa.String(24),nullable=False,server_default="ACTIVE"))):
        if column.name not in {c["name"] for c in inspector.get_columns(table)}:op.add_column(table,column)
    op.execute("UPDATE organization_memberships SET role='CUSTOMER_MANAGER' WHERE role='ORGANIZATION_ADMIN'")
    op.execute("UPDATE organization_memberships SET role='DISABLED_LEGACY' WHERE role IN ('EHS_OFFICER','MAINTENANCE','VIEWER')")
    op.execute("UPDATE users SET status='DISABLED' WHERE id IN (SELECT user_id FROM organization_memberships WHERE role='DISABLED_LEGACY')")
    op.execute("UPDATE organization_memberships SET role='SITE_MANAGER' WHERE role IN ('PROJECT_MANAGER','SITE_OPERATOR')")
    Base.metadata.create_all(bind=bind)

def downgrade():
    for name in ("platform_audit_logs", "water_task_evidence", "water_task_events", "water_task_offers", "water_tasks", "driver_site_assignments", "driver_profiles", "platform_admin_memberships"):
        op.drop_table(name)
    for table,column in (("users","last_login_at"),("users","status"),("organizations","contact_name"),("organizations","contact_email"),("organizations","contact_phone"),("organization_memberships","status")):
        if column in {c["name"] for c in inspect(op.get_bind()).get_columns(table)}:op.drop_column(table,column)
