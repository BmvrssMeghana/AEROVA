import csv, hashlib, io, os, secrets, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy import desc, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from .models import (Alert, AuditLog, DemoRequest, Device, DriverProfile, DriverSiteAssignment, Intervention, Invitation, Membership, Notification,
                     PlatformAdminMembership, PlatformAuditLog, WaterTask, WaterTaskEvent, WaterTaskEvidence, WaterTaskOffer,
                     Organization, Report, ResourceMeasurement, RiskAssessment, Site, SiteAsset,
                     SiteMapConfig, SiteMembership, TelemetryEvent, User, VendorRequest, Zone, now)
from .schemas import AlertAction, CustomerCreate, DemoRequestCreate, DeviceProvision, InterventionCreate, InvitationAccept, InvitationActivation, InvitationCreate, Login, Signup, SiteAssignments, SiteCreate, Telemetry, WaterTaskCreate, WaterTaskOfferCreate, WaterTaskTransition, ZoneCreate
from .security import current_user, create_access_token, hash_password, membership_for, platform_admin, require_platform_admin, require_role, site_for_user, verify_password

app = FastAPI(title="AEROVA API", version="1.0.0", openapi_url="/api/v1/openapi.json", docs_url="/api/v1/docs")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","), allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type", "X-Device-Credential", "X-Request-ID"])
API = "/api/v1"
UPLOAD_ROOT = Path(os.getenv("AEROVA_UPLOAD_DIR", "./private_uploads")).resolve()
ROLES_ADMIN = {"CUSTOMER_MANAGER"}
ROLES_MANAGE = {"CUSTOMER_MANAGER"}
ROLES_OPERATOR = {"CUSTOMER_MANAGER", "SITE_MANAGER"}

@app.get(f"{API}/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(select(func.now()))
        database = "connected"
    except Exception:
        database = "unavailable"
    return {"status": "ok" if database == "connected" else "degraded", "database": database, "timestamp": now().isoformat()}

def model_dict(obj, fields):
    return {key: getattr(obj, key) for key in fields}

def audit(db, org_id, actor_id, action, object_type, object_id=None, details=None):
    db.add(AuditLog(organization_id=org_id, actor_id=actor_id, action=action, object_type=object_type, object_id=object_id, details=details or {}))

def orgs_for(db, user):
    rows = db.query(Membership, Organization).join(Organization, Organization.id == Membership.organization_id).filter(Membership.user_id == user.id,Membership.status=="ACTIVE",Organization.status=="ACTIVE").all()
    return [{"id": o.id, "name": o.name, "role": m.role, "industry": o.industry, "organization_type": o.organization_type} for m, o in rows]

def role_for_user(db, user):
    if platform_admin(db, user): return "AEROVA_ADMIN"
    rows=orgs_for(db,user)
    roles={x["role"] for x in rows}
    if "CUSTOMER_MANAGER" in roles: return "CUSTOMER_MANAGER"
    if "SITE_MANAGER" in roles: return "SITE_MANAGER"
    if "WATER_DRIVER" in roles: return "WATER_DRIVER"
    return None

@app.post(f"{API}/auth/signup", status_code=201)
def signup(body: Signup, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(func.lower(User.email) == email).first(): raise HTTPException(409, "An account with this email already exists")
    user = User(full_name=body.full_name.strip(), email=email, phone=body.phone, designation=body.designation, password_hash=hash_password(body.password))
    org = Organization(name=body.company_name.strip(), industry=body.industry, organization_type=body.organization_type, operating_location=body.operating_location)
    db.add_all([user, org]); db.flush()
    db.add(Membership(organization_id=org.id, user_id=user.id, role="CUSTOMER_MANAGER"))
    audit(db, org.id, user.id, "ORGANIZATION_CREATED", "organization", org.id)
    db.commit()
    response_user=public_user(user, org.id, "CUSTOMER_MANAGER");response_user["company_name"]=org.name
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "expires_in": 900,
            "user": response_user, "organizations": orgs_for(db, user), "sites": [], "next_step": "site_setup"}

@app.post(f"{API}/demo-requests", status_code=201)
def create_demo_request(body: DemoRequestCreate, db: Session = Depends(get_db)):
    item=DemoRequest(name=body.name,company=body.company,email=body.email.lower(),phone=body.phone,project_type=body.project_type,location=body.location,message=body.message)
    db.add(item);db.commit();db.refresh(item)
    return {"id":item.id,"status":"received","created_at":item.created_at.isoformat()}

def public_user(user, org_id=None, role=None):
    return {"id": user.id, "full_name": user.full_name, "email": user.email, "phone": user.phone, "designation": user.designation, "organization_id": org_id, "company_name": None, "role": role, "status": user.status, "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None}

@app.post(f"{API}/auth/login")
def login(body: Login, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash): raise HTTPException(401, "Email or password is incorrect")
    if not user.is_active or user.status != "ACTIVE": raise HTTPException(403, "This account is disabled. Contact your customer administrator.")
    user.last_login_at=now();db.commit()
    orgs = orgs_for(db, user)
    primary = orgs[0] if orgs else None
    sites = sites_for(db, user)
    response_user = public_user(user, primary["id"] if primary else None, role_for_user(db,user))
    response_user["company_name"] = primary["name"] if primary else None
    role=role_for_user(db,user)
    if not role:raise HTTPException(403,"This account has no active AEROVA role. Contact your customer administrator.")
    response_user["role"]=role
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "expires_in": 900, "user": response_user, "organizations": orgs, "sites": sites, "next_step": "site_setup" if role=="CUSTOMER_MANAGER" and not sites else "dashboard"}

def sites_for(db, user):
    org_ids = [x["id"] for x in orgs_for(db, user)]
    if not org_ids: return []
    if role_for_user(db,user)=="CUSTOMER_MANAGER":
        q = db.query(Site).filter(Site.organization_id.in_(org_ids))
    else:
        scoped_site_ids = {x.site_id for x in db.query(SiteMembership).filter_by(user_id=user.id,role="SITE_MANAGER").all()}
        q = db.query(Site).filter(Site.id.in_(scoped_site_ids))
    return [site_json(s) for s in q.order_by(Site.created_at.desc()).all()]

def site_json(s):
    return {"id": s.id, "organization_id": s.organization_id, "name": s.name, "code": s.code, "address": s.address,
            "latitude": s.latitude, "longitude": s.longitude, "timezone": s.timezone, "project_type": s.project_type,
            "area": s.area, "start_date": s.start_date, "completion_date": s.completion_date, "status": s.status, "thresholds": s.thresholds or {}, "settings": s.settings or {}}

@app.get(f"{API}/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    orgs = orgs_for(db, user); primary = orgs[0] if orgs else None
    result = public_user(user, primary["id"] if primary else None, role_for_user(db,user))
    result["company_name"] = primary["name"] if primary else None
    return {**result, "organizations": orgs, "sites": sites_for(db, user)}

@app.get(f"{API}/organizations")
def list_organizations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return orgs_for(db, user)

@app.patch(f"{API}/organizations/{{organization_id}}")
def update_organization(organization_id: str, body: dict[str, Any], user: User = Depends(current_user), db: Session = Depends(get_db)):
    membership=membership_for(db,user,organization_id);require_role(membership,ROLES_ADMIN)
    org=db.get(Organization,organization_id)
    for key in ("name","industry","organization_type","operating_location"):
        if key in body:setattr(org,key,body[key])
    audit(db,org.id,user.id,"ORGANIZATION_UPDATED","organization",org.id,{"fields":list(body.keys())});db.commit();db.refresh(org)
    return {"id":org.id,"name":org.name,"industry":org.industry,"organization_type":org.organization_type,"operating_location":org.operating_location}

@app.post(f"{API}/invitations", status_code=201)
def create_invitation(body: InvitationCreate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    if body.role == "CUSTOMER_MANAGER": raise HTTPException(403,"Only an AEROVA Admin can invite a Customer Manager")
    if body.site_id:
        site=site_for_user(db,user,body.site_id);org_id=site.organization_id
        require_role(membership_for(db,user,org_id),ROLES_MANAGE)
    else:
        orgs=orgs_for(db,user)
        if not orgs:raise HTTPException(404,"Organization not found")
        org_id=orgs[0]["id"];require_role(membership_for(db,user,org_id),ROLES_ADMIN)
    if not body.site_id: raise HTTPException(422,"Site Manager and Water Driver invitations must be assigned to a site")
    raw=secrets.token_urlsafe(32);inv=Invitation(organization_id=org_id,site_id=body.site_id,email=body.email.lower(),role=body.role,token_hash=hashlib.sha256(raw.encode()).hexdigest(),expires_at=now()+timedelta(days=7),invited_by=user.id)
    db.add(inv);db.flush();audit(db,org_id,user.id,"INVITATION_CREATED","invitation",inv.id,{"email":inv.email,"role":inv.role,"site_id":inv.site_id});db.commit()
    return {"id":inv.id,"email":inv.email,"role":inv.role,"site_id":inv.site_id,"expires_at":inv.expires_at.isoformat(),"delivery":"EMAIL_PROVIDER_NOT_CONFIGURED","development_token":raw if os.getenv("AEROVA_ENV","development")!="production" else None}

@app.get(f"{API}/invitations")
def list_invitations(organization_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_role(membership_for(db,user,organization_id),ROLES_ADMIN)
    return [{"id":i.id,"email":i.email,"role":i.role,"site_id":i.site_id,"expires_at":i.expires_at.isoformat(),"accepted_at":i.accepted_at.isoformat() if i.accepted_at else None,"revoked":i.revoked_at is not None} for i in db.query(Invitation).filter_by(organization_id=organization_id).order_by(desc(Invitation.created_at)).limit(300).all()]

@app.post(f"{API}/invitations/accept")
def accept_invitation(body:InvitationAccept,user:User=Depends(current_user),db:Session=Depends(get_db)):
    token_hash=hashlib.sha256(body.token.encode()).hexdigest();inv=db.query(Invitation).filter_by(token_hash=token_hash).first()
    if not inv or inv.revoked_at or inv.accepted_at or inv.expires_at<now():raise HTTPException(400,"Invitation is invalid, expired or already used")
    if inv.email.lower()!=user.email.lower():raise HTTPException(403,"Invitation email does not match the signed-in account")
    if not db.query(Membership).filter_by(organization_id=inv.organization_id,user_id=user.id).first():db.add(Membership(organization_id=inv.organization_id,user_id=user.id,role=inv.role))
    if inv.role=="SITE_MANAGER" and inv.site_id and not db.query(SiteMembership).filter_by(site_id=inv.site_id,user_id=user.id).first():db.add(SiteMembership(site_id=inv.site_id,user_id=user.id,role="SITE_MANAGER"))
    if inv.role=="WATER_DRIVER":
        profile=db.query(DriverProfile).filter_by(user_id=user.id).first()
        if not profile:db.add(DriverProfile(user_id=user.id,phone=user.phone))
        if inv.site_id and not db.query(DriverSiteAssignment).filter_by(user_id=user.id,site_id=inv.site_id).first():db.add(DriverSiteAssignment(organization_id=inv.organization_id,site_id=inv.site_id,user_id=user.id,assigned_by=inv.invited_by))
    inv.accepted_at=now();audit(db,inv.organization_id,user.id,"INVITATION_ACCEPTED","invitation",inv.id,{"role":inv.role,"site_id":inv.site_id});db.commit()
    return {"status":"accepted","organization_id":inv.organization_id,"site_id":inv.site_id,"role":inv.role}

@app.post(f"{API}/invitations/activate",status_code=201)
def activate_invitation(body:InvitationActivation,db:Session=Depends(get_db)):
    token_hash=hashlib.sha256(body.token.encode()).hexdigest();inv=db.query(Invitation).filter_by(token_hash=token_hash).with_for_update().first()
    if not inv or inv.revoked_at or inv.accepted_at or inv.expires_at<now():raise HTTPException(400,"Invitation is invalid, expired or already used")
    if db.query(User).filter(func.lower(User.email)==inv.email.lower()).first():raise HTTPException(409,"An account already exists for this email. Sign in and accept the invitation.")
    org=db.get(Organization,inv.organization_id)
    if not org or org.status!="ACTIVE":raise HTTPException(403,"This customer account is not active")
    user=User(full_name=body.full_name.strip(),email=inv.email.lower(),phone=body.phone,password_hash=hash_password(body.password),status="ACTIVE",is_active=True)
    db.add(user);db.flush();db.add(Membership(organization_id=org.id,user_id=user.id,role=inv.role))
    if inv.role=="SITE_MANAGER" and inv.site_id:db.add(SiteMembership(site_id=inv.site_id,user_id=user.id,role="SITE_MANAGER"))
    if inv.role=="WATER_DRIVER":
        db.add(DriverProfile(user_id=user.id,phone=body.phone,availability="INACTIVE"))
        if inv.site_id:db.add(DriverSiteAssignment(organization_id=org.id,site_id=inv.site_id,user_id=user.id,assigned_by=inv.invited_by))
    inv.accepted_at=now()
    audit(db,org.id,user.id,"INVITATION_ACCEPTED","invitation",inv.id,{"role":inv.role,"site_id":inv.site_id});db.commit()
    user_info=public_user(user,org.id,inv.role);user_info["company_name"]=org.name
    return {"access_token":create_access_token(user.id),"token_type":"bearer","expires_in":900,"user":user_info,"organizations":orgs_for(db,user),"sites":sites_for(db,user),"next_step":"dashboard"}

@app.get(f"{API}/sites")
def list_sites(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return sites_for(db, user)

@app.post(f"{API}/sites", status_code=201)
def create_site(body: SiteCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    membership = membership_for(db, user, body.organization_id); require_role(membership, ROLES_MANAGE)
    if db.query(Site).filter_by(organization_id=body.organization_id, code=body.code).first(): raise HTTPException(409, "Project ID already exists in this organization")
    thresholds = {"pm25_warning": 35, "pm25_critical": 55, "pm10_warning": 100, "pm10_critical": 150, "source": "CUSTOMER_CONFIGURED", "persistence_seconds": 60, "recovery_seconds": 120}
    data=body.model_dump();settings={key:data.pop(key) for key in ("sensitive_receptors","working_hours","existing_controls","water_source")}
    site = Site(**data, settings=settings, thresholds=thresholds)
    db.add(site); db.flush()
    membership_rows = db.query(Membership).filter_by(organization_id=body.organization_id).all()
    for m in membership_rows:
        if m.role == "SITE_MANAGER": db.add(SiteMembership(site_id=site.id, user_id=m.user_id, role="SITE_MANAGER"))
    starters = [("Z1", "Excavation and dust generation", "EXCAVATION"), ("Z2", "Haul road and vehicle movement", "HAUL_ROAD"), ("Z3", "Main monitoring zone", "MONITORING"), ("Z4", "Downwind boundary", "BOUNDARY"), ("Z5", "Residential / worker exposure", "EXPOSURE")]
    db.add_all([Zone(site_id=site.id, code=c, name=n, zone_type=t) for c, n, t in starters])
    db.add(SiteMapConfig(site_id=site.id, basemap="satellite"))
    audit(db, body.organization_id, user.id, "SITE_CREATED", "site", site.id)
    db.commit(); db.refresh(site)
    return site_json(site)

@app.get(f"{API}/sites/{{site_id}}")
def get_site(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return site_json(site_for_user(db, user, site_id))

@app.patch(f"{API}/sites/{{site_id}}")
def update_site(site_id: str, body: dict[str, Any], user: User = Depends(current_user), db: Session = Depends(get_db)):
    site = site_for_user(db, user, site_id); membership = membership_for(db, user, site.organization_id); require_role(membership, ROLES_OPERATOR)
    if membership.role != "CUSTOMER_MANAGER" and "thresholds" in body: raise HTTPException(403,"Only the Customer Manager can change site thresholds")
    allowed = {"name", "code", "address", "latitude", "longitude", "project_type", "area", "start_date", "completion_date", "status", "thresholds", "settings"}
    for key, value in body.items():
        if key in allowed: setattr(site, key, value)
    audit(db, site.organization_id, user.id, "SITE_UPDATED", "site", site.id, {"fields": list(body.keys())}); db.commit(); db.refresh(site)
    return site_json(site)

@app.get(f"{API}/sites/{{site_id}}/zones")
def get_zones(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    site = site_for_user(db, user, site_id)
    return [zone_json(z) for z in db.query(Zone).filter_by(site_id=site.id).order_by(Zone.code).all()]

def zone_json(z): return {"id": z.id, "site_id": z.site_id, "code": z.code, "name": z.name, "zone_type": z.zone_type, "geometry": z.geometry, "configuration": z.configuration, "enabled": z.enabled}

@app.post(f"{API}/sites/{{site_id}}/zones", status_code=201)
def add_zone(site_id: str, body: ZoneCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    site = site_for_user(db, user, site_id); require_role(membership_for(db, user, site.organization_id), ROLES_OPERATOR)
    if db.query(Zone).filter_by(site_id=site_id, code=body.code).first(): raise HTTPException(409, "Zone code already exists")
    zone = Zone(site_id=site_id, **body.model_dump()); db.add(zone); audit(db, site.organization_id, user.id, "ZONE_CREATED", "zone", zone.id); db.commit(); db.refresh(zone)
    return zone_json(zone)

@app.patch(f"{API}/zones/{{zone_id}}")
def update_zone(zone_id: str, body: dict[str, Any], user: User = Depends(current_user), db: Session = Depends(get_db)):
    zone = db.get(Zone, zone_id)
    if not zone: raise HTTPException(404, "Zone not found")
    site = site_for_user(db, user, zone.site_id); require_role(membership_for(db, user, site.organization_id), ROLES_OPERATOR)
    for key in ("name", "code", "zone_type", "geometry", "configuration", "enabled"):
        if key in body: setattr(zone, key, body[key])
    audit(db, site.organization_id, user.id, "ZONE_UPDATED", "zone", zone.id, {"fields": list(body.keys())}); db.commit(); db.refresh(zone)
    return zone_json(zone)

@app.put(f"{API}/sites/{{site_id}}/map")
def save_map(site_id: str, body: dict[str, Any], user: User = Depends(current_user), db: Session = Depends(get_db)):
    site = site_for_user(db, user, site_id); require_role(membership_for(db, user, site.organization_id), ROLES_OPERATOR)
    boundary = body.get("boundary_geojson")
    if boundary and (boundary.get("type") != "Polygon" or not boundary.get("coordinates")):
        raise HTTPException(422, "Boundary must be a GeoJSON Polygon using WGS84 longitude/latitude coordinates")
    config = db.query(SiteMapConfig).filter_by(site_id=site_id).first() or SiteMapConfig(site_id=site_id)
    config.basemap = body.get("basemap", config.basemap)
    config.boundary_geojson = boundary
    config.georeference = body.get("georeference", {})
    config.overlay_asset_id = body.get("overlay_asset_id")
    config.version = (config.version or 0) + 1
    db.add(config); audit(db, site.organization_id, user.id, "SITE_MAP_SAVED", "site_map", config.id, {"version": config.version}); db.commit()
    return {"site_id": site_id, "basemap": config.basemap, "boundary_geojson": config.boundary_geojson, "georeference": config.georeference, "version": config.version}

@app.post(f"{API}/sites/{{site_id}}/assets", status_code=201)
async def upload_asset(site_id: str, file: UploadFile = File(...), asset_type: str = "SITE_PLAN", user: User = Depends(current_user), db: Session = Depends(get_db)):
    site = site_for_user(db, user, site_id); require_role(membership_for(db, user, site.organization_id), ROLES_OPERATOR)
    filename = Path(file.filename or "upload").name
    ext = Path(filename).suffix.lower()
    accepted = {".png": ("image/png", b"\x89PNG\r\n\x1a\n"), ".jpg": ("image/jpeg", b"\xff\xd8\xff"), ".jpeg": ("image/jpeg", b"\xff\xd8\xff"), ".pdf": ("application/pdf", b"%PDF-")}
    if ext not in accepted: raise HTTPException(415, "Supported formats are PNG, JPG, JPEG and PDF")
    data = await file.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024: raise HTTPException(413, "Maximum upload size is 20 MB")
    mime, magic = accepted[ext]
    if not data.startswith(magic): raise HTTPException(415, "File contents do not match the file type")
    directory = (UPLOAD_ROOT / site.id).resolve(); directory.mkdir(parents=True, exist_ok=True)
    object_name = f"{uuid.uuid4().hex}{ext}"; path = (directory / object_name).resolve()
    if directory not in path.parents: raise HTTPException(400, "Invalid file name")
    path.write_bytes(data)
    asset = SiteAsset(site_id=site.id, organization_id=site.organization_id, object_key=str(path), filename=filename, mime_type=mime, size_bytes=len(data), asset_type=asset_type, uploaded_by=user.id)
    db.add(asset); db.commit(); db.refresh(asset)
    return {"id": asset.id, "filename": filename, "mime_type": mime, "size_bytes": len(data), "asset_type": asset.asset_type, "created_at": asset.created_at.isoformat(), "preview_url": f"{API}/assets/{asset.id}"}

@app.get(f"{API}/assets/{{asset_id}}")
def download_asset(asset_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    asset = db.get(SiteAsset, asset_id)
    if not asset: raise HTTPException(404, "Asset not found")
    site_for_user(db, user, asset.site_id)
    path = Path(asset.object_key).resolve()
    if not path.is_file(): raise HTTPException(404, "Stored file is unavailable")
    return FileResponse(path, media_type=asset.mime_type, filename=asset.filename)

@app.post(f"{API}/devices/provision", status_code=201)
def provision_device(body: DeviceProvision, user: User = Depends(current_user), db: Session = Depends(get_db)):
    site = site_for_user(db, user, body.site_id); require_role(membership_for(db, user, site.organization_id), ROLES_ADMIN)
    if body.zone_id and not db.query(Zone).filter_by(id=body.zone_id, site_id=site.id).first(): raise HTTPException(422, "Zone does not belong to this site")
    if db.query(Device).filter_by(device_uid=body.device_uid).first(): raise HTTPException(409, "Device ID already provisioned")
    credential = secrets.token_urlsafe(32)
    device = Device(organization_id=site.organization_id, site_id=site.id, zone_id=body.zone_id, device_uid=body.device_uid, name=body.name, device_type=body.device_type, source_type=body.source_type, credential_hash=hashlib.sha256(credential.encode()).hexdigest(), firmware_version=body.firmware_version)
    db.add(device); audit(db, site.organization_id, user.id, "DEVICE_PROVISIONED", "device", device.id, {"device_uid": body.device_uid, "source_type": body.source_type}); db.commit(); db.refresh(device)
    return {"id": device.id, "device_uid": device.device_uid, "credential": credential, "warning": "Copy this credential now. It is only shown once."}

METRIC_RANGES = {"pm10_ug_m3": (0, 5000), "pm25_ug_m3": (0, 2500), "temperature_c": (-50, 80), "humidity_pct": (0, 100), "wind_speed_kmh": (0, 250), "wind_direction_deg": (0, 360), "soil_moisture_pct": (0, 100), "tank_level_pct": (0, 100), "water_flow_lpm": (0, 10000), "gas_raw_pct": (0, 100), "vibration_level": (0, 100000)}

def normalize_metrics(input_metrics):
    clean, invalid = {}, []
    aliases = {"pm10_ugm3":"pm10_ug_m3", "pm25_ugm3":"pm25_ug_m3", "wind_dir_deg":"wind_direction_deg", "wind_direction":"wind_direction_sector", "activity":"activity_type", "total_water_litres":"cumulative_water_litres_device", "gas_simulated_pct":"gas_raw_pct"}
    for key, raw in input_metrics.items():
        name = aliases.get(key, key)
        if name in METRIC_RANGES:
            if raw is None: clean[name] = None; continue
            try: number = float(raw)
            except (TypeError, ValueError): clean[name] = None; invalid.append(name); continue
            low, high = METRIC_RANGES[name]
            if not low <= number <= high: clean[name] = None; invalid.append(name); continue
            clean[name] = round(number, 3)
        elif name in ("wind_direction_sector", "activity_type"):
            clean[name] = str(raw)[:64] if raw is not None else None
        elif name in ("cumulative_water_litres_device",):
            try: clean[name] = max(0, round(float(raw), 3)) if raw is not None else None
            except (TypeError, ValueError): clean[name] = None; invalid.append(name)
    return clean, invalid

@app.post(f"{API}/ingest/telemetry", status_code=202)
def ingest_telemetry(body: Telemetry, x_device_credential: str | None = Header(default=None), db: Session = Depends(get_db)):
    if not x_device_credential: raise HTTPException(401, "Device credential required")
    device = db.query(Device).filter_by(device_uid=body.device_uid, enabled=True).first()
    if not device or not device.credential_hash or not secrets.compare_digest(device.credential_hash, hashlib.sha256(x_device_credential.encode()).hexdigest()): raise HTTPException(401, "Unknown or disabled device")
    if body.source_type != device.source_type: raise HTTPException(422, "Source type does not match provisioned device")
    existing = db.query(TelemetryEvent).filter_by(device_id=device.id, boot_id=body.boot_id, sequence_no=body.sequence_no).first()
    if existing: return {"status":"duplicate", "event_id":existing.event_id, "received_at_utc":existing.received_at.isoformat()}
    metrics, invalid = normalize_metrics(body.metrics)
    event = TelemetryEvent(event_id=body.event_id, device_id=device.id, organization_id=device.organization_id, site_id=device.site_id, zone_id=device.zone_id, source_type=device.source_type, boot_id=body.boot_id, sequence_no=body.sequence_no, device_uptime_ms=body.device_uptime_ms, metrics=metrics, states=body.states, raw_payload=body.raw or {"metrics":body.metrics,"states":body.states,"schema_version":body.schema_version}, quality="INVALID_FIELDS" if invalid else "VALID")
    received = now(); event.received_at=received; device.last_seen_at=received
    db.add(event)
    thresholds = db.get(Site, device.site_id).thresholds or {}
    for metric, critical_key, warning_key in (("pm25_ug_m3","pm25_critical","pm25_warning"),("pm10_ug_m3","pm10_critical","pm10_warning")):
        value=metrics.get(metric)
        if value is None: continue
        critical=thresholds.get(critical_key); warning=thresholds.get(warning_key)
        if critical is not None and value >= critical or warning is not None and value >= warning:
            severity="CRITICAL" if critical is not None and value >= critical else "WARNING"
            exists=db.query(Alert).filter_by(site_id=device.site_id,zone_id=device.zone_id,alert_type=f"HIGH_{metric.upper()}",status="ACTIVE").first()
            if not exists:
                db.add(Alert(organization_id=device.organization_id,site_id=device.site_id,zone_id=device.zone_id,device_id=device.id,alert_type=f"HIGH_{metric.upper()}",severity=severity,title=f"{metric.upper()} above configured threshold",details={"value":value,"threshold":critical if severity=="CRITICAL" else warning,"unit":"µg/m³","rule_source":"CUSTOMER_CONFIGURED"},source_type=device.source_type))
    db.commit()
    return {"status":"accepted", "event_id":body.event_id, "received_at_utc":received.isoformat(), "quality":"INVALID_FIELDS" if invalid else "VALID", "invalid_fields":invalid, "site_id":device.site_id, "zone_id":device.zone_id}

@app.get(f"{API}/sites/{{site_id}}/telemetry")
def telemetry_history(site_id: str, limit: int = 100, source_type: str | None = None, zone_id: str | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    site=site_for_user(db,user,site_id); q=db.query(TelemetryEvent).filter_by(site_id=site.id)
    if source_type: q=q.filter_by(source_type=source_type.upper())
    if zone_id: q=q.filter_by(zone_id=zone_id)
    records=q.order_by(desc(TelemetryEvent.received_at)).limit(min(max(limit,1),1000)).all()
    return {"items":[event_json(x) for x in reversed(records)],"count":len(records)}

def event_json(x): return {"event_id":x.event_id,"device_uid":x.device.device_uid if x.device else None,"zone_id":x.zone_id,"source_type":x.source_type,"metrics":x.metrics,"states":x.states,"quality":x.quality,"received_at_utc":x.received_at.isoformat(),"device_uptime_ms":x.device_uptime_ms}

def latest_by_zone(db, site_id, zone_id=None):
    q=db.query(TelemetryEvent).filter_by(site_id=site_id)
    if zone_id: q=q.filter_by(zone_id=zone_id)
    return q.order_by(desc(TelemetryEvent.received_at)).first()

def risk_for(site, event, at=None):
    at=at or now()
    if not event: return {"score":None,"level":"UNKNOWN","reasons":["No telemetry received"],"data_quality":"MISSING"}
    received=event.received_at
    age=(at-received).total_seconds()
    if age<0: age=0
    if age>60: return {"score":None,"level":"UNKNOWN","reasons":["Latest data is stale"],"data_quality":"STALE","age_seconds":round(age)}
    m=event.metrics or {}; thresholds=site.thresholds or {}; score=0; reasons=[]; available=False
    pm10=m.get("pm10_ug_m3"); pm25=m.get("pm25_ug_m3")
    for key,value in (("PM10",pm10),("PM2.5",pm25)):
        if value is None: continue
        available=True; warn=thresholds.get("pm10_warning" if key=="PM10" else "pm25_warning")
        critical=thresholds.get("pm10_critical" if key=="PM10" else "pm25_critical")
        if critical is not None and value>=critical: score=max(score,85); reasons.append(f"{key} exceeds configured critical threshold")
        elif warn is not None and value>=warn: score=max(score,60); reasons.append(f"{key} exceeds configured warning threshold")
        elif value >= (50 if key=="PM10" else 20): score=max(score,35); reasons.append(f"{key} is elevated against the configured context")
    states=event.states or {}; activity=states.get("activity_type") or m.get("activity_type")
    if activity and activity not in ("idle","none"): score=min(100,score+10); reasons.append(f"Active {activity} can generate dust")
    wind=m.get("wind_speed_kmh")
    if wind is not None and wind>=25: score=min(100,score+8); reasons.append("High wind may increase dust movement")
    soil=m.get("soil_moisture_pct")
    if soil is not None and soil<20 and (pm10 or pm25): score=min(100,score+8); reasons.append("Dry surface conditions may increase dust")
    if states.get("rain_detected") is True: score=max(0,score-12); reasons.append("Rain detected; reassess suppression need")
    if not available: return {"score":None,"level":"UNKNOWN","reasons":["Fresh event has no usable particulate reading"],"data_quality":"INSUFFICIENT"}
    level="CRITICAL" if score>=85 else "HIGH" if score>=60 else "MODERATE" if score>=35 else "LOW"
    return {"score":score,"level":level,"reasons":reasons or ["Fresh readings below configured thresholds"],"data_quality":"VALID","age_seconds":round(age),"rule_version":"aerova-rules-1","source_type":event.source_type}

@app.get(f"{API}/sites/{{site_id}}/risk")
def site_risk(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    site=site_for_user(db,user,site_id); rows=[]
    for zone in db.query(Zone).filter_by(site_id=site.id,enabled=True).all():
        event=latest_by_zone(db,site.id,zone.id); assessment=risk_for(site,event)
        snap={"metrics":event.metrics,"states":event.states} if event else {}
        saved=RiskAssessment(organization_id=site.organization_id,site_id=site.id,zone_id=zone.id,score=assessment.get("score"),level=assessment["level"],reasons=assessment["reasons"],rule_version=assessment.get("rule_version","aerova-rules-1"),input_snapshot=snap,data_quality=assessment["data_quality"])
        db.add(saved); rows.append({"zone_id":zone.id,"zone_code":zone.code,"zone_name":zone.name,**assessment})
    db.commit()
    known=[x["score"] for x in rows if x.get("score") is not None]
    return {"site_id":site.id,"overall":max(known) if known else None,"level":max(rows,key=lambda x:(x.get("score") or -1))["level"] if known else "UNKNOWN","zones":rows,"calculated_at":now().isoformat()}

@app.get(f"{API}/sites/{{site_id}}/overview")
def overview(site_id: str, range: str = "24 hours", user: User = Depends(current_user), db: Session = Depends(get_db)):
    site=site_for_user(db,user,site_id); zones=db.query(Zone).filter_by(site_id=site.id).order_by(Zone.code).all(); latest=latest_by_zone(db,site.id)
    risk=site_risk_compute(site,zones,db); alerts=db.query(Alert).filter_by(site_id=site.id,status="ACTIVE").count()
    fresh=db.query(Device).filter_by(site_id=site.id,enabled=True).filter(Device.last_seen_at >= now()-timedelta(seconds=60)).count()
    since=now()-timedelta(days=1 if range in ("24 hours","Today") else 7 if range=="7 days" else 30)
    events=db.query(TelemetryEvent).filter(TelemetryEvent.site_id==site.id,TelemetryEvent.received_at>=since).order_by(TelemetryEvent.received_at).limit(1000).all()
    series=[]
    for e in events:
        m=e.metrics or {}
        if m.get("pm10_ug_m3") is not None or m.get("pm25_ug_m3") is not None: series.append({"time":e.received_at.strftime("%H:%M"),"pm10":m.get("pm10_ug_m3"),"pm25":m.get("pm25_ug_m3"),"source_type":e.source_type})
    pm=latest.metrics if latest else {}; source=latest.source_type if latest else "NO DATA"
    return {"site_id":site.id,"source":source,"last_updated_at":latest.received_at.isoformat() if latest else None,
            "kpis":{"pm25":pm.get("pm25_ug_m3"),"pm10":pm.get("pm10_ug_m3"),"risk_level":risk["level"],"active_alerts":alerts,"connected_devices":fresh,"tank_level_pct":pm.get("tank_level_pct"),"water_today_litres":sum((e.metrics or {}).get("water_flow_lpm",0) or 0 for e in events)},
            "zones":[{"id":z.id,"code":z.code,"name":z.name,"type":z.zone_type,"risk":risk["zones"].get(z.id),"latest":event_json(latest_by_zone(db,site.id,z.id)) if latest_by_zone(db,site.id,z.id) else None} for z in zones],"series":series,"data_quality":risk["data_quality"]}

def site_risk_compute(site,zones,db):
    zone_results={}; scores=[]; qualities=[]
    for z in zones:
        ev=latest_by_zone(db,site.id,z.id); r=risk_for(site,ev); zone_results[z.id]=r; qualities.append(r["data_quality"])
        if r["score"] is not None:scores.append(r["score"])
    level="UNKNOWN" if not scores else "CRITICAL" if max(scores)>=85 else "HIGH" if max(scores)>=60 else "MODERATE" if max(scores)>=35 else "LOW"
    return {"level":level,"zones":zone_results,"data_quality":"VALID" if scores else "INSUFFICIENT"}

@app.get(f"{API}/sites/{{site_id}}/map-state")
def map_state(site_id: str, user: User=Depends(current_user), db: Session=Depends(get_db)):
    site=site_for_user(db,user,site_id); config=db.query(SiteMapConfig).filter_by(site_id=site.id).first(); zones=db.query(Zone).filter_by(site_id=site.id,enabled=True).all()
    return {"site_id":site.id,"center":{"longitude":site.longitude,"latitude":site.latitude},"basemap":config.basemap if config else "satellite","boundary_geojson":config.boundary_geojson if config else None,"zones":[zone_json(z) for z in zones],"mapbox_configured":bool(os.getenv("VITE_MAPBOX_TOKEN"))}

@app.get(f"{API}/sites/{{site_id}}/alerts")
def list_alerts(site_id: str, status_filter: str | None = None, severity: str | None = None, user: User=Depends(current_user), db: Session=Depends(get_db)):
    site=site_for_user(db,user,site_id); q=db.query(Alert).filter_by(site_id=site.id)
    if status_filter:q=q.filter_by(status=status_filter.upper())
    if severity:q=q.filter_by(severity=severity.upper())
    return [alert_json(a) for a in q.order_by(desc(Alert.created_at)).limit(500).all()]

def alert_json(a): return {"id":a.id,"alert_type":a.alert_type,"severity":a.severity,"title":a.title,"details":a.details,"source_type":a.source_type,"status":a.status,"zone_id":a.zone_id,"device_id":a.device_id,"assigned_to":a.assigned_to,"note":a.note,"created_at":a.created_at.isoformat(),"resolved_at":a.resolved_at.isoformat() if a.resolved_at else None}

def alert_action(alert_id, action, body, user, db):
    a=db.get(Alert,alert_id)
    if not a:raise HTTPException(404,"Alert not found")
    site_for_user(db,user,a.site_id)
    if action=="acknowledge":
        if a.status=="ACTIVE": a.status="ACKNOWLEDGED"
    else:a.status="RESOLVED";a.resolved_at=now()
    if body.note:a.note=body.note
    if body.assigned_to:a.assigned_to=body.assigned_to
    audit(db,a.organization_id,user.id,f"ALERT_{action.upper()}","alert",a.id,{"note":body.note})
    db.commit();return alert_json(a)

@app.post(f"{API}/alerts/{{alert_id}}/acknowledge")
def acknowledge(alert_id: str, body: AlertAction, user: User=Depends(current_user), db: Session=Depends(get_db)): return alert_action(alert_id,"acknowledge",body,user,db)
@app.post(f"{API}/alerts/{{alert_id}}/resolve")
def resolve_alert(alert_id: str, body: AlertAction, user: User=Depends(current_user), db: Session=Depends(get_db)): return alert_action(alert_id,"resolve",body,user,db)

@app.post(f"{API}/sites/{{site_id}}/interventions", status_code=201)
def create_intervention(site_id: str, body: InterventionCreate, user: User=Depends(current_user), db: Session=Depends(get_db)):
    site=site_for_user(db,user,site_id);membership=membership_for(db,user,site.organization_id);require_role(membership,ROLES_OPERATOR)
    if body.site_id!=site.id:raise HTTPException(422,"Site mismatch")
    if body.zone_id and not db.query(Zone).filter_by(id=body.zone_id,site_id=site.id).first():raise HTTPException(422,"Zone mismatch")
    item=Intervention(organization_id=site.organization_id,site_id=site.id,zone_id=body.zone_id,intervention_type=body.intervention_type,rationale=body.rationale,status="DRAFT",source_type="MANUAL",requested_by=user.id,payload=body.payload)
    db.add(item);db.flush();audit(db,site.organization_id,user.id,"INTERVENTION_DRAFTED","intervention",item.id);db.commit();db.refresh(item);return intervention_json(item)

def intervention_json(i):return {"id":i.id,"site_id":i.site_id,"zone_id":i.zone_id,"intervention_type":i.intervention_type,"rationale":i.rationale,"status":i.status,"source_type":i.source_type,"requested_by":i.requested_by,"approved_by":i.approved_by,"created_at":i.created_at.isoformat(),"payload":i.payload}

@app.get(f"{API}/sites/{{site_id}}/interventions")
def list_interventions(site_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    site=site_for_user(db,user,site_id);return [intervention_json(x) for x in db.query(Intervention).filter_by(site_id=site.id).order_by(desc(Intervention.created_at)).limit(300).all()]

@app.post(f"{API}/interventions/{{intervention_id}}/approve")
def approve_intervention(intervention_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    item=db.get(Intervention,intervention_id)
    if not item:raise HTTPException(404,"Intervention not found")
    site=site_for_user(db,user,item.site_id);require_role(membership_for(db,user,site.organization_id),ROLES_MANAGE)
    if item.status!="DRAFT" and item.status!="PENDING_APPROVAL":raise HTTPException(409,"Intervention is not awaiting approval")
    item.status="APPROVED";item.approved_by=user.id;audit(db,site.organization_id,user.id,"INTERVENTION_APPROVED","intervention",item.id);db.commit();return intervention_json(item)

@app.post(f"{API}/interventions/{{intervention_id}}/execute")
def execute_intervention(intervention_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    item=db.get(Intervention,intervention_id)
    if not item:raise HTTPException(404,"Intervention not found")
    site=site_for_user(db,user,item.site_id);require_role(membership_for(db,user,site.organization_id),ROLES_OPERATOR)
    if item.status!="APPROVED":raise HTTPException(409,"Only an approved intervention can be queued")
    raise HTTPException(409,"No verified actuator transport is configured. The ESP32 local interlocks must remain authoritative.")

@app.get(f"{API}/sites/{{site_id}}/reports")
def report_history(site_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    site=site_for_user(db,user,site_id);return [{"id":r.id,"report_type":r.report_type,"parameters":r.parameters,"created_at":r.created_at.isoformat()} for r in db.query(Report).filter_by(site_id=site.id).order_by(desc(Report.created_at)).limit(100).all()]

@app.post(f"{API}/sites/{{site_id}}/reports",status_code=201)
def create_report(site_id:str,body:dict[str,Any],user:User=Depends(current_user),db:Session=Depends(get_db)):
    site=site_for_user(db,user,site_id);require_role(membership_for(db,user,site.organization_id),{"CUSTOMER_MANAGER","SITE_MANAGER"})
    report_type=body.get("report_type","DAILY").upper();include_sim=bool(body.get("include_simulation",False));q=db.query(TelemetryEvent).filter_by(site_id=site.id)
    if not include_sim:q=q.filter(TelemetryEvent.source_type=="PHYSICAL")
    events=q.order_by(TelemetryEvent.received_at).all()
    record=Report(organization_id=site.organization_id,site_id=site.id,report_type=report_type,parameters={**body,"include_simulation":include_sim,"event_count":len(events),"created_at":now().isoformat()},creator_id=user.id)
    db.add(record);audit(db,site.organization_id,user.id,"REPORT_CREATED","report",record.id,record.parameters);db.commit();db.refresh(record)
    output=io.StringIO();writer=csv.writer(output);writer.writerow(["received_at_utc","device_uid","zone_id","source_type","quality","pm25_ug_m3","pm10_ug_m3","temperature_c","humidity_pct","wind_speed_kmh","tank_level_pct","water_flow_lpm"])
    for e in events:
        m=e.metrics or {};writer.writerow([e.received_at.isoformat(),e.device.device_uid if e.device else "",e.zone_id or "",e.source_type,e.quality,*[m.get(k) for k in ("pm25_ug_m3","pm10_ug_m3","temperature_c","humidity_pct","wind_speed_kmh","tank_level_pct","water_flow_lpm")]])
    content=output.getvalue().encode("utf-8");filename=f"aerova-{report_type.lower()}-{record.id[:8]}.csv"
    return StreamingResponse(io.BytesIO(content),media_type="text/csv",headers={"Content-Disposition":f'attachment; filename="{filename}"',"X-Report-ID":record.id,"X-Data-Gaps":str(max(0,1-len(events)))})

@app.get(f"{API}/notifications")
def notifications(user:User=Depends(current_user),db:Session=Depends(get_db)):
    org_ids=[x["id"] for x in orgs_for(db,user)];return [{"id":n.id,"site_id":n.site_id,"payload":n.payload,"read_at":n.read_at.isoformat() if n.read_at else None,"created_at":n.created_at.isoformat()} for n in db.query(Notification).filter(Notification.user_id==user.id,Notification.organization_id.in_(org_ids)).order_by(desc(Notification.created_at)).limit(100).all()]

@app.post(f"{API}/notifications/{{notification_id}}/read")
def mark_read(notification_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    item=db.get(Notification,notification_id)
    if not item or item.user_id!=user.id:raise HTTPException(404,"Notification not found")
    item.read_at=now();db.commit();return {"id":item.id,"read_at":item.read_at.isoformat()}

@app.get(f"{API}/audit-logs")
def audit_logs(organization_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    membership=membership_for(db,user,organization_id);require_role(membership,ROLES_ADMIN)
    return [{"id":r.id,"actor_id":r.actor_id,"action":r.action,"object_type":r.object_type,"object_id":r.object_id,"details":r.details,"created_at":r.created_at.isoformat()} for r in db.query(AuditLog).filter_by(organization_id=organization_id).order_by(desc(AuditLog.created_at)).limit(500).all()]

# Platform console: only separately granted AEROVA Admin users can call these routes.
def platform_audit(db,user,action,object_type,object_id,reason,details=None):
    if len((reason or "").strip()) < 3: raise HTTPException(422,"Provide an administrative reason")
    db.add(PlatformAuditLog(actor_id=user.id,action=action,object_type=object_type,object_id=object_id,reason=reason.strip(),details=details or {}))

@app.get(f"{API}/platform/overview")
def platform_overview(user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user)
    return {"total_customers":db.query(Organization).count(),"active_customers":db.query(Organization).filter_by(status="ACTIVE").count(),"active_projects":db.query(Site).filter(Site.status=="ACTIVE").count(),"site_managers":db.query(Membership).filter_by(role="SITE_MANAGER").count(),"water_drivers":db.query(Membership).filter_by(role="WATER_DRIVER").count(),"connected_devices":db.query(Device).filter(Device.enabled==True,Device.last_seen_at>=now()-timedelta(seconds=60)).count(),"critical_alert_sites":db.query(Alert.site_id).filter_by(status="ACTIVE",severity="CRITICAL").distinct().count(),"recent_activity":[{"action":x.action,"object_type":x.object_type,"created_at":x.created_at.isoformat()} for x in db.query(PlatformAuditLog).order_by(desc(PlatformAuditLog.created_at)).limit(12).all()]}

@app.get(f"{API}/platform/customers")
def platform_customers(search:str|None=None,status_filter:str|None=None,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user);q=db.query(Organization)
    if search:q=q.filter(Organization.name.ilike(f"%{search.strip()}%"))
    if status_filter:q=q.filter_by(status=status_filter.upper())
    result=[]
    for org in q.order_by(desc(Organization.created_at)).limit(500).all():
        result.append({"id":org.id,"name":org.name,"contact_name":org.contact_name,"contact_email":org.contact_email,"contact_phone":org.contact_phone,"industry":org.industry,"operating_location":org.operating_location,"status":org.status,"created_at":org.created_at.isoformat(),"active_projects":db.query(Site).filter_by(organization_id=org.id,status="ACTIVE").count(),"site_managers":db.query(Membership).filter_by(organization_id=org.id,role="SITE_MANAGER").count(),"water_drivers":db.query(Membership).filter_by(organization_id=org.id,role="WATER_DRIVER").count()})
    return result

@app.post(f"{API}/platform/customers",status_code=201)
def platform_create_customer(body:CustomerCreate,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user)
    if db.query(User).filter(func.lower(User.email)==body.contact_email.lower()).first():raise HTTPException(409,"Contact already has an account; use the organization invitation workflow")
    org=Organization(name=body.name,industry=body.industry,organization_type="CONSTRUCTION",operating_location=body.operating_location,contact_name=body.contact_name,contact_email=body.contact_email.lower(),contact_phone=body.contact_phone,status=body.status)
    db.add(org);db.flush();raw=secrets.token_urlsafe(32);invite=Invitation(organization_id=org.id,email=body.contact_email.lower(),role="CUSTOMER_MANAGER",token_hash=hashlib.sha256(raw.encode()).hexdigest(),expires_at=now()+timedelta(days=7),invited_by=user.id)
    db.add(invite);platform_audit(db,user,"CUSTOMER_CREATED","organization",org.id,body.reason,{"status":org.status,"manager_email":invite.email});db.commit()
    return {"customer":{"id":org.id,"name":org.name,"status":org.status},"invitation":{"id":invite.id,"email":invite.email,"expires_at":invite.expires_at.isoformat(),"delivery":"EMAIL_PROVIDER_NOT_CONFIGURED","development_token":raw if os.getenv("AEROVA_ENV","development")!="production" else None}}

@app.patch(f"{API}/platform/customers/{{organization_id}}")
def platform_update_customer(organization_id:str,body:dict[str,Any],user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user);org=db.get(Organization,organization_id)
    if not org:raise HTTPException(404,"Customer not found")
    status_value=body.get("status");reason=str(body.get("reason",""))
    if status_value not in ("ACTIVE","INACTIVE","SUSPENDED"):raise HTTPException(422,"Status must be ACTIVE, INACTIVE or SUSPENDED")
    old=org.status;org.status=status_value;platform_audit(db,user,"CUSTOMER_STATUS_CHANGED","organization",org.id,reason,{"from":old,"to":status_value});db.commit()
    return {"id":org.id,"status":org.status}

@app.get(f"{API}/platform/projects")
def platform_projects(search:str|None=None,status_filter:str|None=None,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user);q=db.query(Site,Organization).join(Organization,Organization.id==Site.organization_id)
    if search:q=q.filter((Site.name.ilike(f"%{search}%"))|(Site.address.ilike(f"%{search}%"))|(Organization.name.ilike(f"%{search}%")))
    if status_filter:q=q.filter(Site.status==status_filter.upper())
    return [{"id":s.id,"name":s.name,"customer":o.name,"location":s.address,"status":s.status,"created_at":s.created_at.isoformat()} for s,o in q.order_by(desc(Site.created_at)).limit(1000).all()]

@app.get(f"{API}/platform/users")
def platform_users(search:str|None=None,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user);q=db.query(User)
    if search:q=q.filter((User.full_name.ilike(f"%{search}%"))|(User.email.ilike(f"%{search}%")))
    output=[]
    for person in q.order_by(desc(User.created_at)).limit(1000).all():
        for m,org in db.query(Membership,Organization).join(Organization,Organization.id==Membership.organization_id).filter(Membership.user_id==person.id).all():
            if m.role not in ("CUSTOMER_MANAGER","SITE_MANAGER","WATER_DRIVER"):continue
            output.append({"id":person.id,"name":person.full_name,"email":person.email,"customer":org.name,"role":m.role,"status":person.status,"last_login_at":person.last_login_at.isoformat() if person.last_login_at else None})
    return output

@app.post(f"{API}/platform/users/{{user_id}}/status")
def platform_user_status(user_id:str,body:dict[str,str],user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user);target=db.get(User,user_id)
    if not target:raise HTTPException(404,"User not found")
    state=body.get("status");reason=body.get("reason","")
    if state not in ("ACTIVE","DISABLED"):raise HTTPException(422,"Status must be ACTIVE or DISABLED")
    target.status=state;target.is_active=state=="ACTIVE";platform_audit(db,user,"USER_STATUS_CHANGED","user",target.id,reason,{"status":state});db.commit();return {"id":target.id,"status":state}

@app.get(f"{API}/platform/health")
def platform_health(user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_platform_admin(db,user)
    total=db.query(Device).filter_by(enabled=True).count();connected=db.query(Device).filter(Device.enabled==True,Device.last_seen_at>=now()-timedelta(seconds=60)).count()
    return {"database":"connected","api":"operational","total_devices":total,"connected_devices":connected,"offline_devices":total-connected,"telemetry_last_minute":db.query(TelemetryEvent).filter(TelemetryEvent.received_at>=now()-timedelta(minutes=1)).count(),"background_jobs":"not configured","system_availability":"not configured","platform_errors":"not configured"}

@app.get(f"{API}/organizations/{{organization_id}}/summary")
def organization_summary(organization_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_role(membership_for(db,user,organization_id),ROLES_ADMIN)
    sites=db.query(Site).filter_by(organization_id=organization_id).all();ids=[x.id for x in sites]
    return {"projects":len(ids),"active_projects":sum(s.status=="ACTIVE" for s in sites),"critical_projects":db.query(Alert.site_id).filter(Alert.site_id.in_(ids),Alert.status=="ACTIVE",Alert.severity=="CRITICAL").distinct().count() if ids else 0,"site_managers":db.query(Membership).filter_by(organization_id=organization_id,role="SITE_MANAGER").count(),"water_drivers":db.query(Membership).filter_by(organization_id=organization_id,role="WATER_DRIVER").count(),"active_drivers":db.query(DriverProfile).join(Membership,Membership.user_id==DriverProfile.user_id).filter(Membership.organization_id==organization_id,DriverProfile.availability=="ACTIVE").count(),"active_interventions":db.query(Intervention).filter(Intervention.site_id.in_(ids),Intervention.status.in_(["ACTIVE","APPROVED","EXECUTING"])).count() if ids else 0,"water_usage_today":0,"water_usage_source":"No persisted resource totals available"}

@app.post(f"{API}/sites/{{site_id}}/water-tasks",status_code=201)
def create_water_task(site_id:str,body:WaterTaskCreate,user:User=Depends(current_user),db:Session=Depends(get_db)):
    site=site_for_user(db,user,site_id);require_role(membership_for(db,user,site.organization_id),ROLES_OPERATOR)
    if body.zone_id and not db.query(Zone).filter_by(id=body.zone_id,site_id=site.id).first():raise HTTPException(422,"Zone does not belong to this site")
    if body.dedupe_key:
        duplicate=db.query(WaterTask).filter_by(site_id=site.id,dedupe_key=body.dedupe_key).first()
        if duplicate:return water_task_json(db,duplicate)
    task=WaterTask(organization_id=site.organization_id,site_id=site.id,zone_id=body.zone_id,title=body.title,instructions=body.instructions,destination=body.destination or site.address,requested_litres=body.requested_litres,duration_minutes=body.duration_minutes,status="PENDING_APPROVAL" if body.approval_required else "READY",dedupe_key=body.dedupe_key,created_by=user.id)
    db.add(task);db.flush();db.add(WaterTaskEvent(task_id=task.id,actor_id=user.id,event_type="TASK_CREATED",details={"approval_required":body.approval_required}));audit(db,site.organization_id,user.id,"WATER_TASK_CREATED","water_task",task.id,{"status":task.status});db.commit();return water_task_json(db,task)

def water_task_json(db,task,driver_view=False):
    site=db.get(Site,task.site_id);zone=db.get(Zone,task.zone_id) if task.zone_id else None
    result={"id":task.id,"status":task.status,"title":task.title,"instructions":task.instructions,"site_name":site.name if site else "Assigned site","destination":task.destination,"zone_name":zone.name if zone else None,"zone_id":task.zone_id,"requested_litres":task.requested_litres,"duration_minutes":task.duration_minutes,"created_at":task.created_at.isoformat(),"accepted_at":task.accepted_at.isoformat() if task.accepted_at else None,"started_at":task.started_at.isoformat() if task.started_at else None,"completed_at":task.completed_at.isoformat() if task.completed_at else None,"accepted_by":task.accepted_by}
    if not driver_view:result["events"]=[{"event_type":e.event_type,"created_at":e.created_at.isoformat(),"actor_id":e.actor_id,"details":e.details} for e in db.query(WaterTaskEvent).filter_by(task_id=task.id).order_by(WaterTaskEvent.created_at).all()]
    else:result.pop("accepted_by",None)
    return result

@app.get(f"{API}/sites/{{site_id}}/water-tasks")
def site_water_tasks(site_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    site=site_for_user(db,user,site_id);return [water_task_json(db,t) for t in db.query(WaterTask).filter_by(site_id=site.id).order_by(desc(WaterTask.created_at)).limit(300).all()]

@app.get(f"{API}/sites/{{site_id}}/drivers")
def site_drivers(site_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    site=site_for_user(db,user,site_id)
    assignments=db.query(DriverSiteAssignment,User).join(User,User.id==DriverSiteAssignment.user_id).filter(DriverSiteAssignment.site_id==site.id,DriverSiteAssignment.status=="ACTIVE").all()
    result=[]
    for _,person in assignments:
        profile=db.query(DriverProfile).filter_by(user_id=person.id).first()
        task=db.query(WaterTask).filter_by(site_id=site.id,accepted_by=person.id).filter(WaterTask.status.in_(["ACCEPTED","ARRIVED","IN_PROGRESS","BLOCKED"])).first()
        result.append({"id":person.id,"name":person.full_name,"availability":profile.availability if profile else "INACTIVE","phone":person.phone,"active_task":task.id if task else None})
    return result

def offer_next_driver(db,task,actor_id=None):
    already={o.driver_id for o in db.query(WaterTaskOffer).filter_by(task_id=task.id).all()}
    candidates=db.query(DriverSiteAssignment,DriverProfile,User).join(DriverProfile,DriverProfile.user_id==DriverSiteAssignment.user_id).join(User,User.id==DriverSiteAssignment.user_id).filter(DriverSiteAssignment.site_id==task.site_id,DriverSiteAssignment.organization_id==task.organization_id,DriverSiteAssignment.status=="ACTIVE",DriverProfile.availability=="ACTIVE",User.is_active==True,User.status=="ACTIVE").order_by(DriverSiteAssignment.created_at).all()
    for assignment,profile,driver in candidates:
        if driver.id in already:continue
        active_task=db.query(WaterTask).filter_by(accepted_by=driver.id).filter(WaterTask.status.in_(["ACCEPTED","ARRIVED","IN_PROGRESS","BLOCKED"])).first()
        if active_task:continue
        expiry=now()+timedelta(minutes=5);offer=WaterTaskOffer(task_id=task.id,driver_id=driver.id,expires_at=expiry);task.status="OFFERED"
        db.add(offer);db.add(WaterTaskEvent(task_id=task.id,actor_id=actor_id,event_type="OFFERED",details={"driver_id":driver.id,"expires_at":expiry.isoformat()}));db.add(Notification(organization_id=task.organization_id,site_id=task.site_id,user_id=driver.id,payload={"type":"WATER_TASK_OFFER","task_id":task.id,"title":"Water required","message":f"{db.get(Site,task.site_id).name}: {task.title}"}));return driver.id
    task.status="READY"
    for membership in db.query(SiteMembership).filter_by(site_id=task.site_id,role="SITE_MANAGER").all():
        db.add(Notification(organization_id=task.organization_id,site_id=task.site_id,user_id=membership.user_id,payload={"type":"NO_DRIVER_AVAILABLE","task_id":task.id,"title":"No water driver available","message":"No active assigned driver can take this task yet."}))
    return None

@app.post(f"{API}/water-tasks/{{task_id}}/approve")
def approve_water_task(task_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    task=db.get(WaterTask,task_id)
    if not task:raise HTTPException(404,"Task not found")
    site=site_for_user(db,user,task.site_id);require_role(membership_for(db,user,site.organization_id),ROLES_ADMIN)
    if task.status!="PENDING_APPROVAL":raise HTTPException(409,"Task is not awaiting approval")
    task.status="READY";task.approved_by=user.id;db.add(WaterTaskEvent(task_id=task.id,actor_id=user.id,event_type="APPROVED"));audit(db,site.organization_id,user.id,"WATER_TASK_APPROVED","water_task",task.id);db.commit();return water_task_json(db,task)

@app.post(f"{API}/water-tasks/{{task_id}}/offers",status_code=201)
def offer_water_task(task_id:str,body:WaterTaskOfferCreate,user:User=Depends(current_user),db:Session=Depends(get_db)):
    task=db.get(WaterTask,task_id)
    if not task:raise HTTPException(404,"Task not found")
    site=site_for_user(db,user,task.site_id);require_role(membership_for(db,user,site.organization_id),ROLES_OPERATOR)
    driver=db.get(User,body.driver_id);assignment=db.query(DriverSiteAssignment).filter_by(user_id=body.driver_id,site_id=site.id,organization_id=site.organization_id,status="ACTIVE").first();profile=db.query(DriverProfile).filter_by(user_id=body.driver_id,availability="ACTIVE").first()
    if not driver or not driver.is_active or not assignment or not profile:raise HTTPException(422,"Driver must be active and assigned to this site")
    if task.status!="READY" or task.accepted_by:raise HTTPException(409,"Task is not available for assignment")
    offer=WaterTaskOffer(task_id=task.id,driver_id=driver.id,expires_at=now()+timedelta(minutes=body.expires_minutes));task.status="OFFERED";db.add(offer);db.add(WaterTaskEvent(task_id=task.id,actor_id=user.id,event_type="OFFERED",details={"driver_id":driver.id,"expires_at":offer.expires_at.isoformat()}));db.add(Notification(organization_id=site.organization_id,site_id=site.id,user_id=driver.id,payload={"type":"WATER_TASK_OFFER","task_id":task.id,"title":"Water required","message":f"{site.name}: {task.title}"}));db.commit();return {"offer_id":offer.id,"task_id":task.id,"status":offer.status,"expires_at":offer.expires_at.isoformat(),"delivery":"IN_APP"}

@app.patch(f"{API}/drivers/me/availability")
def driver_availability(body:dict[str,str],user:User=Depends(current_user),db:Session=Depends(get_db)):
    if role_for_user(db,user)!="WATER_DRIVER":raise HTTPException(403,"Water Driver access is required")
    state=body.get("availability")
    if state not in ("ACTIVE","INACTIVE"):raise HTTPException(422,"Availability must be ACTIVE or INACTIVE")
    profile=db.query(DriverProfile).filter_by(user_id=user.id).first()
    if not profile:profile=DriverProfile(user_id=user.id);db.add(profile)
    profile.availability=state;profile.availability_updated_at=now();db.commit();return {"availability":state,"updated_at":profile.availability_updated_at.isoformat()}

@app.get(f"{API}/drivers/me/tasks")
def driver_tasks(user:User=Depends(current_user),db:Session=Depends(get_db)):
    if role_for_user(db,user)!="WATER_DRIVER":raise HTTPException(403,"Water Driver access is required")
    expired=db.query(WaterTaskOffer).filter_by(driver_id=user.id,status="OFFERED").filter(WaterTaskOffer.expires_at<now()).all()
    for offer in expired:
        offer.status="EXPIRED";task=db.query(WaterTask).filter_by(id=offer.task_id,accepted_by=None,status="OFFERED").with_for_update().first()
        if task:offer_next_driver(db,task)
    if expired:db.commit()
    offers=db.query(WaterTaskOffer).filter_by(driver_id=user.id).order_by(desc(WaterTaskOffer.offered_at)).limit(100).all();ids={o.task_id for o in offers}
    ids.update(t.id for t in db.query(WaterTask).filter_by(accepted_by=user.id).all())
    return {"availability":(db.query(DriverProfile).filter_by(user_id=user.id).first().availability if db.query(DriverProfile).filter_by(user_id=user.id).first() else "INACTIVE"),"offers":[{"id":o.id,"status":o.status,"expires_at":o.expires_at.isoformat(),"task":water_task_json(db,db.get(WaterTask,o.task_id),True)} for o in offers if db.get(WaterTask,o.task_id)],"tasks":[water_task_json(db,t,True) for t in db.query(WaterTask).filter(WaterTask.accepted_by==user.id).order_by(desc(WaterTask.created_at)).all()]}

@app.post(f"{API}/water-task-offers/{{offer_id}}/accept")
def accept_water_offer(offer_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    if role_for_user(db,user)!="WATER_DRIVER":raise HTTPException(403,"Water Driver access is required")
    offer=db.query(WaterTaskOffer).filter_by(id=offer_id,driver_id=user.id).with_for_update().first()
    if not offer:raise HTTPException(404,"Task offer not found")
    if offer.status!="OFFERED" or offer.expires_at<now():offer.status="EXPIRED";db.commit();raise HTTPException(409,"This offer has expired")
    task=db.query(WaterTask).filter_by(id=offer.task_id).with_for_update().first()
    result=db.execute(update(WaterTask).where(WaterTask.id==task.id,WaterTask.accepted_by.is_(None),WaterTask.status=="OFFERED").values(accepted_by=user.id,accepted_at=now(),status="ACCEPTED"))
    if result.rowcount!=1:offer.status="LOST";db.commit();raise HTTPException(409,"Another driver has accepted this task")
    offer.status="ACCEPTED";offer.responded_at=now();db.add(WaterTaskEvent(task_id=task.id,actor_id=user.id,event_type="ACCEPTED"));db.commit();db.refresh(task);return water_task_json(db,task,True)

@app.post(f"{API}/water-task-offers/{{offer_id}}/decline")
def decline_water_offer(offer_id:str,body:WaterTaskTransition,user:User=Depends(current_user),db:Session=Depends(get_db)):
    if role_for_user(db,user)!="WATER_DRIVER":raise HTTPException(403,"Water Driver access is required")
    offer=db.query(WaterTaskOffer).filter_by(id=offer_id,driver_id=user.id).first()
    if not offer or offer.status!="OFFERED":raise HTTPException(404,"Active offer not found")
    offer.status="DECLINED";offer.responded_at=now();task=db.query(WaterTask).filter_by(id=offer.task_id,accepted_by=None).with_for_update().first()
    db.add(WaterTaskEvent(task_id=offer.task_id,actor_id=user.id,event_type="DECLINED",details={"note":body.note}))
    if task:offer_next_driver(db,task,user.id)
    db.commit();return {"status":"DECLINED"}

def change_driver_task(task_id,user,db,next_state,body):
    task=db.query(WaterTask).filter_by(id=task_id,accepted_by=user.id).with_for_update().first()
    if not task:raise HTTPException(404,"Assigned task not found")
    allowed={"ARRIVED":{"ACCEPTED"},"STARTED":{"ARRIVED"},"COMPLETED":{"IN_PROGRESS"},"BLOCKED":{"ACCEPTED","ARRIVED","IN_PROGRESS"}}
    if task.status not in allowed[next_state]:raise HTTPException(409,f"Cannot mark {next_state.lower()} from {task.status.lower()}")
    if next_state=="ARRIVED":task.status="ARRIVED"
    elif next_state=="STARTED":task.status="IN_PROGRESS";task.started_at=now()
    elif next_state=="COMPLETED":task.status="COMPLETED";task.completed_at=now()
    else:task.status="BLOCKED"
    db.add(WaterTaskEvent(task_id=task.id,actor_id=user.id,event_type=next_state,details={"note":body.note}))
    if body.litres_reported is not None:db.add(WaterTaskEvidence(task_id=task.id,source="DRIVER_REPORTED",litres=body.litres_reported,note=body.note,created_by=user.id))
    db.commit();db.refresh(task);return water_task_json(db,task,True)

@app.post(f"{API}/water-tasks/{{task_id}}/arrive")
def driver_task_arrive(task_id:str,body:WaterTaskTransition,user:User=Depends(current_user),db:Session=Depends(get_db)):return change_driver_task(task_id,user,db,"ARRIVED",body)
@app.post(f"{API}/water-tasks/{{task_id}}/start")
def driver_task_start(task_id:str,body:WaterTaskTransition,user:User=Depends(current_user),db:Session=Depends(get_db)):return change_driver_task(task_id,user,db,"STARTED",body)
@app.post(f"{API}/water-tasks/{{task_id}}/complete")
def driver_task_complete(task_id:str,body:WaterTaskTransition,user:User=Depends(current_user),db:Session=Depends(get_db)):return change_driver_task(task_id,user,db,"COMPLETED",body)
@app.post(f"{API}/water-tasks/{{task_id}}/problem")
def driver_task_problem(task_id:str,body:WaterTaskTransition,user:User=Depends(current_user),db:Session=Depends(get_db)):return change_driver_task(task_id,user,db,"BLOCKED",body)

@app.get(f"{API}/organizations/{{organization_id}}/members")
def organization_members(organization_id:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_role(membership_for(db,user,organization_id),ROLES_ADMIN)
    output=[]
    for membership,person in db.query(Membership,User).join(User,User.id==Membership.user_id).filter(Membership.organization_id==organization_id).all():
        profile=db.query(DriverProfile).filter_by(user_id=person.id).first()
        site_ids=[x.site_id for x in db.query(SiteMembership).join(Site,Site.id==SiteMembership.site_id).filter(SiteMembership.user_id==person.id,Site.organization_id==organization_id).all()]
        site_ids += [x.site_id for x in db.query(DriverSiteAssignment).filter_by(user_id=person.id,organization_id=organization_id,status="ACTIVE").all()]
        output.append({"user_id":person.id,"full_name":person.full_name,"email":person.email,"phone":person.phone,"role":membership.role,"status":"DISABLED" if person.status!="ACTIVE" else membership.status,"last_login_at":person.last_login_at.isoformat() if person.last_login_at else None,"site_ids":sorted(set(site_ids)),"availability":profile.availability if profile else None})
    return output

@app.put(f"{API}/organizations/{{organization_id}}/members/{{member_id}}/sites")
def replace_member_sites(organization_id:str,member_id:str,body:SiteAssignments,user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_role(membership_for(db,user,organization_id),ROLES_ADMIN)
    member=db.query(Membership).filter_by(organization_id=organization_id,user_id=member_id).first();person=db.get(User,member_id)
    if not member or not person:raise HTTPException(404,"Organization user not found")
    if member.role not in ("SITE_MANAGER","WATER_DRIVER"):raise HTTPException(422,"Only Site Managers and Water Drivers receive site assignments")
    sites=db.query(Site).filter(Site.organization_id==organization_id,Site.id.in_(body.site_ids)).all()
    if len({x.id for x in sites})!=len(set(body.site_ids)):raise HTTPException(422,"Every assigned site must belong to this customer")
    if member.role=="SITE_MANAGER":
        db.query(SiteMembership).filter(SiteMembership.user_id==member_id,SiteMembership.site_id.in_(db.query(Site.id).filter_by(organization_id=organization_id))).delete(synchronize_session=False)
        db.add_all([SiteMembership(site_id=sid,user_id=member_id,role="SITE_MANAGER") for sid in sorted(set(body.site_ids))])
    else:
        existing={a.site_id:a for a in db.query(DriverSiteAssignment).filter_by(user_id=member_id,organization_id=organization_id).all()}
        for assignment in existing.values():assignment.status="ACTIVE" if assignment.site_id in body.site_ids else "INACTIVE"
        for sid in set(body.site_ids)-set(existing):db.add(DriverSiteAssignment(organization_id=organization_id,site_id=sid,user_id=member_id,assigned_by=user.id,status="ACTIVE"))
    audit(db,organization_id,user.id,"MEMBER_SITES_REPLACED","user",member_id,{"role":member.role,"site_ids":body.site_ids});db.commit();return {"user_id":member_id,"site_ids":body.site_ids}

@app.post(f"{API}/organizations/{{organization_id}}/members/{{member_id}}/status")
def update_member_status(organization_id:str,member_id:str,body:dict[str,str],user:User=Depends(current_user),db:Session=Depends(get_db)):
    require_role(membership_for(db,user,organization_id),ROLES_ADMIN);membership=db.query(Membership).filter_by(organization_id=organization_id,user_id=member_id).first();person=db.get(User,member_id)
    if not membership or not person:raise HTTPException(404,"Organization user not found")
    if membership.role=="CUSTOMER_MANAGER":raise HTTPException(403,"Customer Manager accounts require a verified ownership transfer")
    state=body.get("status")
    if state not in ("ACTIVE","DISABLED"):raise HTTPException(422,"Status must be ACTIVE or DISABLED")
    membership.status=state;audit(db,organization_id,user.id,"ORG_USER_STATUS_CHANGED","user",person.id,{"status":state,"role":membership.role});db.commit();return {"user_id":person.id,"status":state}
