const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

let latestTelemetry = null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/telemetry', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Invalid or missing JSON payload' });
  }

  // Store the latest reading with a server-generated timestamp
  latestTelemetry = {
    ...req.body,
    received_at: new Date().toISOString()
  };

  console.log(`[${latestTelemetry.received_at}] Received telemetry from ${req.body.device_id || 'unknown'} (PM10: ${req.body.pm10_ugm3 || 0})`);
  res.json({ status: 'success', received_at: latestTelemetry.received_at });
});

app.get('/api/telemetry', (req, res) => {
  if (!latestTelemetry) {
    return res.status(202).json({ status: 'waiting', message: 'No telemetry received yet' });
  }
  res.json({ status: 'ok', data: latestTelemetry });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`AEROVA Telemetry API server running on port ${PORT}`);
});
