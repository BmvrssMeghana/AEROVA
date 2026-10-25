const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const MAX_HISTORY = 100;
let latestTelemetry = null;
const telemetryHistory = [];
const startTime = Date.now();

// --- Validation Helper ---
function validateTelemetryPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Payload must be a JSON object' };
  }

  const deviceId = typeof body.device_id === 'string' && body.device_id.trim().length > 0 
    ? body.device_id.trim().slice(0, 64) 
    : 'ESP32-NODE-DEFAULT';

  const clean = {
    device_id: deviceId,
    source: body.source === 'simulation' ? 'simulation' : 'hardware',
  };

  // PM10 validation (0 to 5000 ug/m3)
  if (body.pm10_ugm3 !== undefined) {
    const val = Number(body.pm10_ugm3);
    if (!Number.isFinite(val) || val < 0 || val > 5000) {
      return { valid: false, error: 'pm10_ugm3 must be a finite number between 0 and 5000' };
    }
    clean.pm10_ugm3 = Math.round(val * 10) / 10;
  } else {
    clean.pm10_ugm3 = 20.0;
  }

  // PM2.5 validation (0 to 2500 ug/m3)
  if (body.pm25_ugm3 !== undefined) {
    const val = Number(body.pm25_ugm3);
    if (!Number.isFinite(val) || val < 0 || val > 2500) {
      return { valid: false, error: 'pm25_ugm3 must be a finite number between 0 and 2500' };
    }
    clean.pm25_ugm3 = Math.round(val * 10) / 10;
  } else {
    clean.pm25_ugm3 = Math.round(clean.pm10_ugm3 * 0.5 * 10) / 10;
  }

  // Temperature validation (-50 to 80 C)
  if (body.temperature_c !== undefined) {
    const val = Number(body.temperature_c);
    if (Number.isFinite(val) && val >= -50 && val <= 80) {
      clean.temperature_c = Math.round(val * 10) / 10;
    }
  }

  // Humidity validation (0 to 100%)
  if (body.humidity_pct !== undefined) {
    const val = Number(body.humidity_pct);
    if (Number.isFinite(val) && val >= 0 && val <= 100) {
      clean.humidity_pct = Math.round(val * 10) / 10;
    }
  }

  // Wind speed validation (0 to 250 km/h)
  if (body.wind_speed_kmh !== undefined) {
    const val = Number(body.wind_speed_kmh);
    if (Number.isFinite(val) && val >= 0 && val <= 250) {
      clean.wind_speed_kmh = Math.round(val * 10) / 10;
    }
  }

  // Wind direction (0 to 360 deg)
  if (body.wind_dir_deg !== undefined) {
    const val = Number(body.wind_dir_deg);
    if (Number.isFinite(val) && val >= 0 && val <= 360) {
      clean.wind_dir_deg = Math.round(val);
    }
  }

  // Water tank level (0 to 100%)
  if (body.tank_level_pct !== undefined) {
    const val = Number(body.tank_level_pct);
    if (Number.isFinite(val) && val >= 0 && val <= 100) {
      clean.tank_level_pct = Math.round(val * 10) / 10;
    }
  }

  // Activity note
  if (typeof body.activity === 'string') {
    clean.activity = body.activity.slice(0, 64);
  }

  return { valid: true, data: clean };
}

// --- Endpoints ---

app.get('/api/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const telemetryAgeMs = latestTelemetry 
    ? Date.now() - new Date(latestTelemetry.received_at).getTime() 
    : null;

  res.json({
    status: 'ok',
    uptime_seconds: uptimeSeconds,
    telemetry_connected: latestTelemetry !== null && telemetryAgeMs < 15000,
    telemetry_age_seconds: telemetryAgeMs !== null ? Math.round(telemetryAgeMs / 1000) : null,
    history_count: telemetryHistory.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/telemetry', (req, res) => {
  const validation = validateTelemetryPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const record = {
    ...validation.data,
    received_at: new Date().toISOString()
  };

  latestTelemetry = record;
  telemetryHistory.push(record);
  if (telemetryHistory.length > MAX_HISTORY) {
    telemetryHistory.shift();
  }

  console.log(`[${record.received_at}] Received telemetry from ${record.device_id} (PM10: ${record.pm10_ugm3} µg/m³)`);
  res.json({ status: 'success', received_at: record.received_at, data: record });
});

app.get('/api/telemetry', (req, res) => {
  if (!latestTelemetry) {
    return res.status(202).json({ status: 'waiting', message: 'No telemetry received yet' });
  }
  
  const ageMs = Date.now() - new Date(latestTelemetry.received_at).getTime();
  const isStale = ageMs > 10000;

  res.json({ 
    status: 'ok', 
    stale: isStale,
    age_ms: ageMs,
    data: latestTelemetry 
  });
});

app.get('/api/telemetry/history', (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
  const recent = telemetryHistory.slice(-limit);
  res.json({ status: 'ok', count: recent.length, data: recent });
});

// Mock telemetry endpoint for simulation and testing verification
app.post('/api/telemetry/mock', (req, res) => {
  const pm10 = Math.round(20 + Math.random() * 120);
  const mockPayload = {
    device_id: 'ESP32-MOCK-SIMULATOR',
    source: 'simulation',
    pm10_ugm3: pm10,
    pm25_ugm3: Math.round(pm10 * 0.5),
    temperature_c: 21.5,
    humidity_pct: 58.0,
    wind_speed_kmh: 14.5,
    wind_dir_deg: 225,
    tank_level_pct: 78.5,
    activity: 'excavation'
  };

  const validation = validateTelemetryPayload(mockPayload);
  const record = {
    ...validation.data,
    received_at: new Date().toISOString()
  };

  latestTelemetry = record;
  telemetryHistory.push(record);
  if (telemetryHistory.length > MAX_HISTORY) telemetryHistory.shift();

  res.json({ status: 'success', mock: true, data: record });
});

// Reset endpoint for automated tests
app.post('/api/telemetry/reset', (req, res) => {
  latestTelemetry = null;
  telemetryHistory.length = 0;
  res.json({ status: 'ok', message: 'Telemetry buffer cleared' });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AEROVA Telemetry API server running on port ${PORT}`);
  });
}

module.exports = { app, validateTelemetryPayload };

