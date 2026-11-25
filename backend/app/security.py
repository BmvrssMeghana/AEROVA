import base64, hashlib, hmac, json, os, time
from dataclasses import dataclass
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from .db import get_db
from .models import DriverSiteAssignment, Membership, Organization, Site, SiteMembership, User

passwords = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
SECRET = os.getenv("AEROVA_SECRET_KEY", "local-dev-only-change-me")
if os.getenv("AEROVA_ENV", "development").lower() == "production" and (
    len(SECRET) < 32 or SECRET == "local-dev-only-change-me"
):
    raise RuntimeError("AEROVA_SECRET_KEY must be a unique secret of at least 32 characters in production")

def hash_password(value: str) -> str:
    return passwords.hash(value)

def verify_password(value: str, hashed: str) -> bool:
    if not hashed: return False
    try: return passwords.verify(value, hashed)
    except Exception: return False

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def create_access_token(user_id: str) -> str:
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + 900}, separators=(",", ":")).encode())
    signature = _b64(hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{signature}"

def decode_access_token(token: str) -> str | None:
    try:
        payload, signature = token.split(".", 1)
        expected = _b64(hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected): return None
        body = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if body["exp"] < time.time(): return None
        return body["sub"]
    except Exception: return None

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in is required")
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id else None
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is invalid or expired")
    return user

@dataclass(frozen=True)
class MembershipContext:
    role: str


def membership_for(db: Session, user: User, organization_id: str) -> Membership | MembershipContext:
    org = db.get(Organization, organization_id)
    if not org or org.status != "ACTIVE": raise HTTPException(status_code=403, detail="This customer account is not active")
    membership = db.query(Membership).filter_by(
        user_id=user.id,
        organization_id=organization_id,
        status="ACTIVE",
    ).first()
    if membership and user.role == "CUSTOMER_MANAGER":
        return membership
    if user.role == "SITE_MANAGER":
        assigned = db.query(SiteMembership.id).join(
            Site, Site.id == SiteMembership.site_id
        ).filter(
            Site.organization_id == organization_id,
            SiteMembership.user_id == user.id,
            SiteMembership.role == "SITE_MANAGER",
            SiteMembership.status == "ACTIVE",
        ).first()
        if assigned:
            return MembershipContext("SITE_MANAGER")
    if user.role == "WATER_DRIVER":
        assigned = db.query(DriverSiteAssignment.id).join(
            Site, Site.id == DriverSiteAssignment.site_id
        ).filter(
            Site.organization_id == organization_id,
            DriverSiteAssignment.driver_user_id == user.id,
            DriverSiteAssignment.is_active.is_(True),
        ).first()
        if assigned:
            return MembershipContext("WATER_DRIVER")
    raise HTTPException(status_code=404, detail="Workspace not found")

def platform_admin(db: Session, user: User) -> bool:
    return user.role == "AEROVA_ADMIN" and user.is_active

def require_platform_admin(db: Session, user: User):
    if not platform_admin(db, user):
        raise HTTPException(status_code=403, detail="AEROVA Admin access is required")

def require_org_role(db: Session, user: User, organization_id: str, roles: set[str]):
    membership = membership_for(db, user, organization_id)
    if membership.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action")
    return membership

def site_for_user(db: Session, user: User, site_id: str):
    from .models import Site, SiteMembership
    site = db.get(Site, site_id)
    if not site: raise HTTPException(status_code=404, detail="Site not found")
    if user.role == "CUSTOMER_MANAGER":
        membership_for(db, user, site.organization_id)
        return site
    if user.role == "SITE_MANAGER" and db.query(SiteMembership.id).filter_by(
        site_id=site.id,
        user_id=user.id,
        role="SITE_MANAGER",
        status="ACTIVE",
    ).first():
        return site
    if user.role == "WATER_DRIVER" and db.query(DriverSiteAssignment.id).filter_by(
        site_id=site.id,
        driver_user_id=user.id,
        is_active=True,
    ).first():
        return site
    else:
        raise HTTPException(status_code=404, detail="Site not found")

def require_role(membership: Membership, roles: set[str]):
    if membership.role not in roles:
        raise HTTPException(status_code=403, detail="Your role cannot perform this action")
