"""Create or grant the first AEROVA Admin from a trusted local CLI."""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db import SessionLocal
from app.models import PlatformAdminMembership, User
from app.security import hash_password

def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python scripts/create_platform_admin.py admin@example.com [Full Name]")
    email = sys.argv[1].strip().lower()
    name = " ".join(sys.argv[2:]).strip() or input("AEROVA Admin name: ").strip()
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if not user:
            password = getpass.getpass("Set admin password (minimum 12 characters): ")
            if len(password) < 12:
                raise SystemExit("Password must contain at least 12 characters")
            user = User(full_name=name, email=email, designation="AEROVA Admin", password_hash=hash_password(password), status="ACTIVE", is_active=True)
            db.add(user)
            db.flush()
        elif user.status != "ACTIVE":
            raise SystemExit("Existing account is disabled; reactivate it through the trusted database administrator first")
        grant = db.query(PlatformAdminMembership).filter_by(user_id=user.id).first()
        if grant:
            grant.status = "ACTIVE"
        else:
            db.add(PlatformAdminMembership(user_id=user.id, status="ACTIVE"))
        db.commit()
        print(f"AEROVA Admin access granted to {email}. Sign in through the app.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
