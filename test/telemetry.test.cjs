const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTelemetryPayload } = require('../server.cjs');

test('Telemetry Validation: accepts standard ESP32 payload', () => {
  const payload = {
    device_id: 'ESP32-DEV-01',
    pm10_ugm3: 85.4,
    pm25_ugm3: 42.7,
    temperature_c: 24.1,
    humidity_pct: 61.2,
    wind_speed_kmh: 18.0,
    wind_dir_deg: 220,
    tank_level_pct: 75.0,
    activity: 'excavation'
  };

  const result = validateTelemetryPayload(payload);
  assert.equal(result.valid, true);
  assert.equal(result.data.device_id, 'ESP32-DEV-01');
  assert.equal(result.data.pm10_ugm3, 85.4);
  assert.equal(result.data.pm25_ugm3, 42.7);
  assert.equal(result.data.temperature_c, 24.1);
  assert.equal(result.data.humidity_pct, 61.2);
  assert.equal(result.data.wind_speed_kmh, 18.0);
  assert.equal(result.data.wind_dir_deg, 220);
  assert.equal(result.data.tank_level_pct, 75.0);
  assert.equal(result.data.activity, 'excavation');
  assert.equal(result.data.source, 'hardware');
});

test('Telemetry Validation: rejects non-object or null payloads', () => {
  assert.equal(validateTelemetryPayload(null).valid, false);
  assert.equal(validateTelemetryPayload([]).valid, false);
  assert.equal(validateTelemetryPayload('corrupt-string').valid, false);
  assert.equal(validateTelemetryPayload(12345).valid, false);
});

test('Telemetry Validation: rejects out-of-range or NaN PM10 values', () => {
  assert.equal(validateTelemetryPayload({ pm10_ugm3: -10 }).valid, false);
  assert.equal(validateTelemetryPayload({ pm10_ugm3: 99999 }).valid, false);
  assert.equal(validateTelemetryPayload({ pm10_ugm3: 'corrupt' }).valid, false);
  assert.equal(validateTelemetryPayload({ pm10_ugm3: NaN }).valid, false);
  assert.equal(validateTelemetryPayload({ pm10_ugm3: Infinity }).valid, false);
});

test('Telemetry Validation: defaults and sanitizes missing optional fields safely', () => {
  const result = validateTelemetryPayload({});
  assert.equal(result.valid, true);
  assert.equal(result.data.device_id, 'ESP32-NODE-DEFAULT');
  assert.equal(result.data.pm10_ugm3, 20.0);
  assert.equal(result.data.pm25_ugm3, 10.0);
});

test('Telemetry Validation: marks source as simulation when specified', () => {
  const result = validateTelemetryPayload({ source: 'simulation', pm10_ugm3: 45 });
  assert.equal(result.valid, true);
  assert.equal(result.data.source, 'simulation');
});
