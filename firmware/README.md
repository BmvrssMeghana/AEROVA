# Device integration contract

The Wokwi ESP32 sketch referenced by the SRS remains an external hardware reference. It currently emits legacy serial JSON and has HTTP disabled. No live device is connected by this repository.

The AEROVA ingestion endpoint accepts authenticated `POST /api/v1/ingest/telemetry` requests with the provisioned device credential in `X-Device-Credential`. The JSON body must include:

```json
{
  "schema_version": "1.0",
  "event_id": "unique-event-id",
  "device_uid": "provisioned-device-id",
  "boot_id": "unique-boot-id",
  "sequence_no": 1,
  "device_uptime_ms": 1000,
  "source_type": "PHYSICAL",
  "metrics": {
    "pm25_ug_m3": 18.2,
    "pm10_ug_m3": 42.1,
    "temperature_c": 27.5,
    "humidity_pct": 62,
    "wind_speed_kmh": 8.4,
    "wind_direction_deg": 210,
    "soil_moisture_pct": 31,
    "tank_level_pct": 70,
    "water_flow_lpm": 0
  },
  "states": {"activity_type": "idle"}
}
```

The service binds site, organization, zone, and source type from the provisioned device. A device must not choose its own zone in telemetry. Configure the device URL and credential only after provisioning; use HTTPS with certificate validation and bounded retries. Preserve the local emergency stop, low-water interlock, and equipment safety controls on the device. A successful HTTP response confirms ingestion only; it does not confirm an intervention or actuator state.
