from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Uuid
from sqlalchemy.schema import ColumnDefault
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, synonym

from .db import Base, DB_SCHEMA, engine


def uid():
    return str(uuid4())


def now():
    return datetime.now(timezone.utc)


Base.metadata.reflect(bind=engine, schema=DB_SCHEMA if engine.dialect.name == "postgresql" else None)

for reflected_table in Base.metadata.tables.values():
    for column in reflected_table.columns:
        if column.type.__class__.__name__ == "UUID":
            column.type = Uuid(as_uuid=False)
            if column.primary_key and column.default is None and column.server_default is None:
                column.default = ColumnDefault(uid)


def table(name):
    key = f"{DB_SCHEMA}.{name}" if engine.dialect.name == "postgresql" else name
    try:
        return Base.metadata.tables[key]
    except KeyError as exc:
        raise RuntimeError(f"Required table {DB_SCHEMA}.{name} does not exist") from exc


class Organization(Base):
    __table__ = table("organizations")
    organization_type = synonym("org_type")
    contact_name = synonym("primary_contact")
    contact_email = synonym("email")
    contact_phone = synonym("phone")

    @property
    def operating_location(self):
        return ", ".join(part for part in (self.city, self.state, self.country) if part)

    @operating_location.setter
    def operating_location(self, value):
        self.city = value


class User(Base):
    __table__ = table("users")
    last_login_at = synonym("last_login")

    @property
    def designation(self):
        return self.role.replace("_", " ").title() if self.role else None

    @hybrid_property
    def is_active(self):
        return self.status not in {"DISABLED", "SUSPENDED"}

    @is_active.setter
    def is_active(self, value):
        if not value:
            self.status = "DISABLED"
        elif self.status in {"DISABLED", "SUSPENDED"}:
            self.status = "ACTIVE"

    @is_active.expression
    def is_active(cls):
        return cls.status.notin_(("DISABLED", "SUSPENDED"))


class Membership(Base):
    __table__ = table("organization_memberships")


class SiteMembership(Base):
    __table__ = table("site_memberships")


class Site(Base):
    __table__ = table("sites")
    code = synonym("project_code")
    area = synonym("area_acres")
    completion_date = synonym("expected_end_date")


class Zone(Base):
    __table__ = table("zones")
    code = synonym("zone_code")


class ZoneThreshold(Base):
    __table__ = table("zone_thresholds")


class MapLayerPreference(Base):
    __table__ = table("map_layer_preferences")


class ConstructionActivity(Base):
    __table__ = table("construction_activities")


class SiteMapConfig(Base):
    __table__ = table("site_boundaries")
    boundary_geojson = synonym("geometry_geojson")


class SiteAsset(Base):
    __table__ = table("site_layouts")
    object_key = synonym("storage_key")
    filename = synonym("file_name")
    mime_type = synonym("file_type")
    asset_type = synonym("layout_name")
    created_at = synonym("uploaded_at")

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    site = relationship("Site", foreign_keys=[table("site_layouts").c.site_id], viewonly=True)


class Invitation(Base):
    __table__ = table("invitations")
    role = synonym("intended_role")


class Device(Base):
    __table__ = table("devices")
    last_seen_at = synonym("last_seen")
    firmware_version = synonym("firmware")

    site = relationship("Site", foreign_keys=[table("devices").c.site_id], viewonly=True)

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @hybrid_property
    def enabled(self):
        return self.status not in {"DISABLED", "INACTIVE"}

    @enabled.setter
    def enabled(self, value):
        self.status = "ACTIVE" if value else "INACTIVE"

    @enabled.expression
    def enabled(cls):
        return cls.status.notin_(("DISABLED", "INACTIVE"))

    @property
    def credential_hash(self):
        metadata = self.metadata or {}
        return metadata.get("_credential_hash")

    @credential_hash.setter
    def credential_hash(self, value):
        metadata = dict(self.metadata or {})
        metadata["_credential_hash"] = value
        self.metadata = metadata


class TelemetryEvent(Base):
    __table__ = table("telemetry_events")
    raw_payload = synonym("payload")
    device = relationship("Device", foreign_keys=[table("telemetry_events").c.device_id], viewonly=True)

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @property
    def metrics(self):
        return (self.payload or {}).get("metrics", {})

    @property
    def states(self):
        return (self.payload or {}).get("states", {})

    @property
    def quality(self):
        return self.processing_status

    site = relationship("Site", foreign_keys=[table("telemetry_events").c.site_id], viewonly=True)


class RiskAssessment(Base):
    __table__ = table("risk_assessments")
    score = synonym("risk_score")
    level = synonym("risk_level")
    calculated_at = synonym("assessed_at")
    site = relationship("Site", foreign_keys=[table("risk_assessments").c.site_id], viewonly=True)

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @property
    def reasons(self):
        return [self.explanation] if self.explanation else []


class Alert(Base):
    __table__ = table("alerts")
    site = relationship("Site", foreign_keys=[table("alerts").c.site_id], viewonly=True)

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @property
    def details(self):
        return {
            "message": self.message,
            "trigger_condition": self.trigger_condition,
            "measured_value": self.measured_value,
            "metric_code": self.metric_code,
            "recommended_response": self.recommended_response,
        }

    @property
    def note(self):
        return None


class AlertNote(Base):
    __table__ = table("alert_notes")


class Intervention(Base):
    __table__ = table("interventions")
    rationale = synonym("reason")
    requested_by = synonym("operator_user_id")
    site = relationship("Site", foreign_keys=[table("interventions").c.site_id], viewonly=True)

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @property
    def source_type(self):
        return "MANUAL"

    @property
    def approved_by(self):
        return None

    @property
    def payload(self):
        return {
            "title": self.title,
            "control_mode": self.control_mode,
            "equipment_id": self.equipment_id,
            "water_target_litres": self.water_target_litres,
            "water_used_litres": self.water_used_litres,
            "before_readings": self.before_readings,
            "after_readings": self.after_readings,
            "outcome": self.outcome,
            "outcome_notes": self.outcome_notes,
        }


class InterventionEvent(Base):
    __table__ = table("intervention_events")


class DeviceCommand(Base):
    __table__ = table("control_commands")
    payload = synonym("command_payload")

    @property
    def acknowledgement(self):
        return self.result or {}

    @property
    def expires_at(self):
        return None


class ResourceMeasurement(Base):
    __table__ = table("water_resource_events")
    resource_type = synonym("event_type")
    quantity = synonym("quantity_litres")
    observed_at = synonym("occurred_at")

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @property
    def unit(self):
        return "L"

    @property
    def source_type(self):
        return self.verification_source

    @property
    def evidence(self):
        return {"water_source": self.water_source}

    site = relationship("Site", foreign_keys=[table("water_resource_events").c.site_id], viewonly=True)


class Report(Base):
    __table__ = table("reports")
    parameters = synonym("filters")
    creator_id = synonym("generated_by")
    created_at = synonym("generated_at")

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    site = relationship("Site", foreign_keys=[table("reports").c.site_id], viewonly=True)


class Notification(Base):
    __table__ = table("notifications")

    @property
    def payload(self):
        return {
            "type": self.notification_type,
            "title": self.title,
            "message": self.body,
            "channel": self.channel,
            "delivery_status": self.delivery_status,
            "alert_id": self.alert_id,
            "task_id": self.task_id,
        }

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    site = relationship("Site", foreign_keys=[table("notifications").c.site_id], viewonly=True)


class DemoRequest(Base):
    __table__ = table("contact_requests")


class AuditLog(Base):
    __table__ = table("audit_events")
    actor_id = synonym("actor_user_id")
    object_type = synonym("entity_type")
    object_id = synonym("entity_id")


class DriverProfile(Base):
    __table__ = table("driver_profiles")


class DriverSiteAssignment(Base):
    __table__ = table("driver_site_assignments")
    user_id = synonym("driver_user_id")
    created_at = synonym("assigned_at")

    @property
    def status(self):
        return "ACTIVE" if self.is_active else "INACTIVE"

    @status.setter
    def status(self, value):
        self.is_active = value == "ACTIVE"

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    site = relationship("Site", foreign_keys=[table("driver_site_assignments").c.site_id], viewonly=True)


class WaterTask(Base):
    __table__ = table("water_tasks")
    instructions = synonym("instruction")
    accepted_by = synonym("assigned_driver_id")
    site = relationship("Site", foreign_keys=[table("water_tasks").c.site_id], viewonly=True)

    @property
    def organization_id(self):
        return self.site.organization_id if self.site else None

    @property
    def destination(self):
        return None

    @property
    def duration_minutes(self):
        return None

    @property
    def approved_by(self):
        return None

    @property
    def dedupe_key(self):
        return None


class WaterTaskOffer(Base):
    __table__ = table("water_task_assignments")
    driver_id = synonym("driver_user_id")
    status = synonym("assignment_status")
    task = relationship("WaterTask", foreign_keys=[table("water_task_assignments").c.task_id], viewonly=True)

    @property
    def expires_at(self):
        return self.task.expires_at if self.task else None


class WaterTaskEvent(Base):
    __table__ = table("water_task_events")
    actor_id = synonym("actor_user_id")
    details = synonym("metadata")


PlatformAuditLog = AuditLog
