"""Set a password for an existing AEROVA user without creating or changing accounts."""
import getpass
import hmac
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal
from app.models import User
from app.security import hash_password


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/set_existing_user_password.py existing-user@example.com")

    email = sys.argv[1].strip().lower()
    password = getpass.getpass("New password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm new password: ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")
    if not hmac.compare_digest(password, confirmation):
        raise SystemExit("Passwords do not match")

    with SessionLocal() as db:
        user = db.query(User).filter(User.email.ilike(email)).first()
        if not user:
            raise SystemExit("No existing account matches that email; no account was created")
        user.password_hash = hash_password(password)
        db.commit()
        print(f"Password updated for existing {user.role} account {user.email}.")


if __name__ == "__main__":
    main()
