from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["CUSTOMER_MANAGER", "SITE_MANAGER", "WATER_DRIVER"]

class Signup(BaseModel):
    full_name: str = Field(min_length=2, max_length=180)
    email: EmailStr
    company_name: str = Field(min_length=2, max_length=180)
    password: str = Field(min_length=10, max_length=128)
    phone: str | None = Field(default=None, max_length=40)
    designation: str = Field(min_length=2, max_length=100)
    terms_accepted: bool
    industry: str | None = None
    organization_type: str | None = None
    operating_location: str | None = None
    @field_validator("terms_accepted")
    @classmethod
    def accepted(cls, v):
        if not v: raise ValueError("Terms and privacy acceptance are required")
        return v

class Login(BaseModel):
    email: EmailStr
    password: str

class SiteCreate(BaseModel):
    organization_id: str
    name: str = Field(min_length=2, max_length=180)
    code: str = Field(min_length=2, max_length=60)
    address: str | None = None
    project_type: str | None = None
    area: float | None = Field(default=None, gt=0)
    start_date: str | None = None
    completion_date: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    sensitive_receptors: list[str] = Field(default_factory=list)
    working_hours: dict[str, Any] = Field(default_factory=dict)
    existing_controls: list[str] = Field(default_factory=list)
    water_source: str | None = None

class ZoneCreate(BaseModel):
    code: str = Field(min_length=2, max_length=24)
    name: str = Field(min_length=2, max_length=160)
    zone_type: str = "GENERAL"
    geometry: dict[str, Any] | None = None
    configuration: dict[str, Any] = Field(default_factory=dict)

class DeviceProvision(BaseModel):
    site_id: str
    zone_id: str | None = None
    device_uid: str = Field(min_length=3, max_length=80)
    name: str = Field(min_length=2, max_length=180)
    device_type: str = Field(min_length=2, max_length=80)
    source_type: Literal["PHYSICAL", "SIMULATION"]
    firmware_version: str | None = None

class Telemetry(BaseModel):
    schema_version: str = "1.0"
    event_id: str = Field(min_length=8, max_length=80)
    device_uid: str = Field(min_length=3, max_length=80)
    boot_id: str = Field(min_length=3, max_length=80)
    sequence_no: int = Field(ge=0)
    device_uptime_ms: int | None = Field(default=None, ge=0)
    source_type: Literal["PHYSICAL", "SIMULATION"]
    metrics: dict[str, Any] = Field(default_factory=dict)
    states: dict[str, Any] = Field(default_factory=dict)
    raw: dict[str, Any] | None = None

class InterventionCreate(BaseModel):
    site_id: str
    zone_id: str | None = None
    intervention_type: str = Field(min_length=2, max_length=100)
    rationale: str = Field(min_length=5, max_length=2000)
    payload: dict[str, Any] = Field(default_factory=dict)

class AlertAction(BaseModel):
    note: str | None = Field(default=None, max_length=2000)
    assigned_to: str | None = None

class InvitationCreate(BaseModel):
    email: EmailStr
    role: Literal["CUSTOMER_MANAGER", "SITE_MANAGER", "WATER_DRIVER"]
    site_id: str | None = None

class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    industry: str | None = None
    organization_type: str | None = None
    operating_location: str | None = None
    contact_name: str = Field(min_length=2, max_length=180)
    contact_email: EmailStr
    contact_phone: str | None = None
    status: Literal["ACTIVE", "INACTIVE", "SUSPENDED"] = "ACTIVE"
    reason: str = Field(min_length=3, max_length=500)

class WaterTaskCreate(BaseModel):
    zone_id: str | None = None
    title: str = Field(default="Water required", min_length=3, max_length=180)
    instructions: str = Field(min_length=3, max_length=2000)
    destination: str | None = Field(default=None, max_length=500)
    requested_litres: float | None = Field(default=None, gt=0, le=100000)
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    dedupe_key: str | None = Field(default=None, min_length=4, max_length=160)
    approval_required: bool = True

class WaterTaskOfferCreate(BaseModel):
    driver_id: str
    expires_minutes: int = Field(default=5, ge=1, le=60)

class WaterTaskTransition(BaseModel):
    note: str | None = Field(default=None, max_length=1000)
    litres_reported: float | None = Field(default=None, ge=0, le=100000)

class SiteAssignments(BaseModel):
    site_ids: list[str] = Field(min_length=1, max_length=100)

class InvitationAccept(BaseModel):
    token: str = Field(min_length=20, max_length=200)

class InvitationActivation(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    full_name: str = Field(min_length=2, max_length=180)
    password: str = Field(min_length=12, max_length=128)
    phone: str | None = Field(default=None, max_length=40)

class DemoRequestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    company: str = Field(min_length=2, max_length=180)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    project_type: str = Field(min_length=2, max_length=80)
    location: str | None = Field(default=None, max_length=180)
    message: str | None = Field(default=None, max_length=3000)
    consented: bool
    @field_validator("consented")
    @classmethod
    def require_consent(cls, v):
        if not v: raise ValueError("Consent is required")
        return v
