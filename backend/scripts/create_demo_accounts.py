"""Create local-only accounts for previewing each AEROVA role."""
import getpass
import os
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal
from app.models import (
    DriverProfile,
    DriverSiteAssignment,
    Membership,
    Organization,
    PlatformAdminMembership,
    Site,
    SiteMapConfig,
    SiteMembership,
    WaterTask,
    WaterTaskEvent,
    WaterTaskOffer,
    User,
    Zone,
    now,
)
from app.security import hash_password


DEMO_ACCOUNTS = (
    ("aerova.admin@example.com", "AEROVA Demo Admin", "AEROVA_ADMIN"),
    ("aerova.customer@example.com", "AEROVA Demo Customer Manager", "CUSTOMER_MANAGER"),
    ("aerova.site@example.com", "AEROVA Demo Site Manager", "SITE_MANAGER"),
    ("aerova.driver@example.com", "AEROVA Demo Water Driver", "WATER_DRIVER"),
)


def main():
    if os.getenv("AEROVA_ENV", "development").lower() == "production":
        raise SystemExit("Demo accounts are disabled when AEROVA_ENV=production")

    password = os.getenv("AEROVA_DEMO_PASSWORD") or getpass.getpass("Set shared demo password (minimum 12 characters): ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")

    with SessionLocal() as db:
        emails = [email for email, _, _ in DEMO_ACCOUNTS]
        existing = db.query(User.email).filter(User.email.in_(emails)).all()
        if existing:
            found = ", ".join(email for (email,) in existing)
            raise SystemExit(f"Demo account(s) already exist: {found}. No changes were made.")

        accounts = {
            role: User(
                full_name=name,
                email=email,
                designation=role.replace("_", " ").title(),
                password_hash=hash_password(password),
                status="ACTIVE",
                is_active=True,
            )
            for email, name, role in DEMO_ACCOUNTS
        }
        db.add_all(accounts.values())
        db.flush()

        admin = accounts["AEROVA_ADMIN"]
        manager = accounts["CUSTOMER_MANAGER"]
        site_manager = accounts["SITE_MANAGER"]
        driver = accounts["WATER_DRIVER"]

        db.add(PlatformAdminMembership(user_id=admin.id, status="ACTIVE"))
        organization = Organization(
            name="AEROVA Demo Construction",
            industry="Infrastructure",
            organization_type="Contractor",
            operating_location="Pune, Maharashtra",
            contact_name=manager.full_name,
            contact_email=manager.email,
        )
        db.add(organization)
        db.flush()

        db.add_all([
            Membership(organization_id=organization.id, user_id=manager.id, role="CUSTOMER_MANAGER"),
            Membership(organization_id=organization.id, user_id=site_manager.id, role="SITE_MANAGER"),
            Membership(organization_id=organization.id, user_id=driver.id, role="WATER_DRIVER"),
        ])
        site = Site(
            organization_id=organization.id,
            name="AEROVA Demo Site",
            code="AEROVA-DEMO-01",
            address="Pune, Maharashtra",
            latitude=18.5204,
            longitude=73.8567,
            timezone="Asia/Kolkata",
            project_type="Infrastructure",
            area=25000,
            status="ACTIVE",
            thresholds={
                "pm25_warning": 35,
                "pm25_critical": 55,
                "pm10_warning": 100,
                "pm10_critical": 150,
                "source": "CUSTOMER_CONFIGURED",
                "persistence_seconds": 60,
                "recovery_seconds": 120,
            },
        )
        db.add(site)
        db.flush()

        zones = [
            Zone(site_id=site.id, code="Z1", name="Excavation", zone_type="EXCAVATION"),
            Zone(site_id=site.id, code="Z2", name="Haul road", zone_type="HAUL_ROAD"),
            Zone(site_id=site.id, code="Z3", name="Main monitoring", zone_type="MONITORING"),
            Zone(site_id=site.id, code="Z4", name="Downwind boundary", zone_type="BOUNDARY"),
            Zone(site_id=site.id, code="Z5", name="Worker exposure", zone_type="EXPOSURE"),
        ]
        db.add_all([
            *zones,
            SiteMembership(site_id=site.id, user_id=site_manager.id, role="SITE_MANAGER"),
            SiteMapConfig(site_id=site.id, basemap="satellite"),
            DriverProfile(user_id=driver.id, availability="ACTIVE"),
            DriverSiteAssignment(
                organization_id=organization.id,
                site_id=site.id,
                user_id=driver.id,
                assigned_by=manager.id,
                status="ACTIVE",
            ),
        ])
        db.flush()

        task = WaterTask(
            organization_id=organization.id,
            site_id=site.id,
            zone_id=zones[0].id,
            title="Demo water delivery",
            instructions="Review this sample offer to explore the Water Driver workflow.",
            destination="Excavation zone (Z1)",
            requested_litres=5000,
            duration_minutes=30,
            status="OFFERED",
            created_by=manager.id,
        )
        db.add(task)
        db.flush()
        offer = WaterTaskOffer(
            task_id=task.id,
            driver_id=driver.id,
            status="OFFERED",
            expires_at=now() + timedelta(days=30),
        )
        db.add_all([
            offer,
            WaterTaskEvent(
                task_id=task.id,
                actor_id=manager.id,
                event_type="OFFERED",
                details={"driver_id": driver.id, "demo": True},
            ),
        ])
        db.commit()

    print("Created local demo accounts and one sample organization/site/task:")
    for email, _, role in DEMO_ACCOUNTS:
        print(f"{role}: {email}")


if __name__ == "__main__":
    main()
