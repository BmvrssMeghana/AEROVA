import unittest
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import Base
from app.main import accept_water_offer, app, normalize_metrics, update_device
from app.models import (
    Device,
    DriverProfile,
    Membership,
    Organization,
    Site,
    SiteMembership,
    User,
    WaterTask,
    WaterTaskOffer,
    Zone,
    now,
)


class RoleWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def user(self, email):
        user = User(full_name=email, email=email, password_hash="test-hash")
        self.db.add(user)
        self.db.flush()
        return user

    def test_assigned_site_manager_can_update_device_metadata_and_zone(self):
        organization = Organization(name="Test organization")
        user = self.user("site-manager@example.test")
        self.db.add(organization)
        self.db.flush()
        site = Site(organization_id=organization.id, name="Test site", code="TEST")
        self.db.add_all([
            Membership(organization_id=organization.id, user_id=user.id, role="SITE_MANAGER"),
            site,
        ])
        self.db.flush()
        zone = Zone(site_id=site.id, code="Z1", name="Zone 1")
        device = Device(
            organization_id=organization.id,
            site_id=site.id,
            device_uid="DEVICE-1",
            name="Old name",
            device_type="Sensor",
            source_type="SIMULATION",
        )
        self.db.add_all([zone, device])
        self.db.flush()
        self.db.add(SiteMembership(site_id=site.id, user_id=user.id, role="SITE_MANAGER"))
        self.db.commit()

        updated = update_device(
            device.id,
            {"name": "New name", "device_type": "Air sensor", "zone_id": zone.id},
            user,
            self.db,
        )

        self.assertEqual(updated["name"], "New name")
        self.assertEqual(updated["device_type"], "Air sensor")
        self.assertEqual(updated["zone_id"], zone.id)

    def test_unassigned_site_manager_cannot_update_device(self):
        organization = Organization(name="Test organization")
        user = self.user("unassigned@example.test")
        owner = self.user("owner@example.test")
        self.db.add(organization)
        self.db.flush()
        site = Site(organization_id=organization.id, name="Test site", code="TEST")
        self.db.add_all([
            Membership(organization_id=organization.id, user_id=user.id, role="SITE_MANAGER"),
            Membership(organization_id=organization.id, user_id=owner.id, role="SITE_MANAGER"),
            site,
        ])
        self.db.flush()
        device = Device(
            organization_id=organization.id,
            site_id=site.id,
            device_uid="DEVICE-1",
            name="Sensor",
            device_type="Air sensor",
            source_type="PHYSICAL",
        )
        self.db.add_all([device, SiteMembership(site_id=site.id, user_id=owner.id, role="SITE_MANAGER")])
        self.db.commit()

        with self.assertRaises(HTTPException) as raised:
            update_device(device.id, {"name": "Changed"}, user, self.db)

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(self.db.get(Device, device.id).name, "Sensor")

    def test_inactive_driver_cannot_claim_new_offer(self):
        organization = Organization(name="Test organization")
        driver = self.user("driver@example.test")
        self.db.add(organization)
        self.db.flush()
        site = Site(organization_id=organization.id, name="Test site", code="TEST")
        self.db.add_all([
            Membership(organization_id=organization.id, user_id=driver.id, role="WATER_DRIVER"),
            DriverProfile(user_id=driver.id, availability="INACTIVE"),
            site,
        ])
        self.db.flush()
        task = WaterTask(
            organization_id=organization.id,
            site_id=site.id,
            title="Water required",
            instructions="Spray zone 1",
            status="OFFERED",
            created_by=driver.id,
        )
        self.db.add(task)
        self.db.flush()
        offer = WaterTaskOffer(
            task_id=task.id,
            driver_id=driver.id,
            expires_at=now() + timedelta(minutes=5),
        )
        self.db.add(offer)
        self.db.commit()

        with self.assertRaises(HTTPException) as raised:
            accept_water_offer(offer.id, driver, self.db)

        self.assertEqual(raised.exception.status_code, 409)
        self.assertIsNone(self.db.get(WaterTask, task.id).accepted_by)
        self.assertEqual(self.db.get(WaterTask, task.id).status, "OFFERED")

    def test_device_update_cannot_change_provisioning_credentials(self):
        organization = Organization(name="Test organization")
        user = self.user("customer-manager@example.test")
        self.db.add(organization)
        self.db.flush()
        site = Site(organization_id=organization.id, name="Test site", code="TEST")
        self.db.add(site)
        self.db.flush()
        device = Device(
            organization_id=organization.id,
            site_id=site.id,
            device_uid="DEVICE-1",
            name="Sensor",
            device_type="Air sensor",
            source_type="PHYSICAL",
        )
        self.db.add_all([
            Membership(organization_id=organization.id, user_id=user.id, role="CUSTOMER_MANAGER"),
            device,
        ])
        self.db.commit()

        with self.assertRaises(HTTPException) as raised:
            update_device(device.id, {"credential_hash": "replacement"}, user, self.db)

        self.assertEqual(raised.exception.status_code, 422)

    def test_sensor_catalog_metrics_are_preserved_with_validation(self):
        metrics, invalid = normalize_metrics({
            "rainfall_mm_h": 1.5,
            "worker_presence": True,
            "vehicle_events": 3,
            "vibration_g": 0.2,
            "gas_ppm": 14,
        })

        self.assertEqual(metrics, {
            "rain_mm_h": 1.5,
            "worker_presence": True,
            "vehicle_count": 3,
            "vibration_g": 0.2,
            "gas_ppm": 14,
        })
        self.assertEqual(invalid, [])


class CorsTests(unittest.IsolatedAsyncioTestCase):
    async def test_vite_localhost_port_preflight_is_allowed(self):
        messages = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "OPTIONS",
            "scheme": "http",
            "path": "/api/v1/auth/login",
            "raw_path": b"/api/v1/auth/login",
            "query_string": b"",
            "root_path": "",
            "headers": [
                (b"origin", b"http://localhost:5174"),
                (b"access-control-request-method", b"POST"),
                (b"access-control-request-headers", b"authorization,content-type"),
            ],
            "server": ("localhost", 8000),
            "client": ("127.0.0.1", 50061),
        }

        await app.build_middleware_stack()(scope, receive, send)

        self.assertEqual(messages[0]["status"], 200)
        headers = dict(messages[0]["headers"])
        self.assertEqual(headers[b"access-control-allow-origin"], b"http://localhost:5174")


if __name__ == "__main__":
    unittest.main()
