const test = require('node:test');
const assert = require('node:assert/strict');

// Dispersion calculation formula mirror from App.jsx
function getPollutionAt(px, py, sources, wind) {
  let pm10 = 20; 
  const windRad = wind.angle * Math.PI / 180;
  const wx = Math.cos(windRad);
  const wy = Math.sin(windRad);

  sources.forEach(s => {
    const dx = px - s.x;
    const dy = py - s.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const dot = (dx * wx + dy * wy) / dist; 
    const windMult = dot > 0 ? (1 + dot * 2) : (1 / (1 - dot * 1.5));
    pm10 += (s.intensity * windMult) / (1 + Math.pow(dist / 8, 2));
  });
  return pm10;
}

test('Dispersion Physics: baseline air quality without dust plumes returns ambient default (20 µg/m³)', () => {
  const result = getPollutionAt(50, 50, [], { angle: 0, speed: 10 });
  assert.equal(result, 20);
});

test('Dispersion Physics: particulate plume is higher near emission source', () => {
  const sources = [{ x: 50, y: 50, intensity: 300 }];
  const near = getPollutionAt(51, 50, sources, { angle: 0, speed: 10 });
  const far = getPollutionAt(90, 50, sources, { angle: 0, speed: 10 });
  
  assert.ok(near > far, `Expected near reading (${near}) to exceed far reading (${far})`);
  assert.ok(near > 100, `Expected near reading (${near}) to be elevated (>100)`);
});

test('Dispersion Physics: wind increases particulate concentration downwind vs upwind', () => {
  // Source at 50, 50. Wind blowing East (angle = 0 deg, dx > 0 is downwind)
  const sources = [{ x: 50, y: 50, intensity: 300 }];
  const wind = { angle: 0, speed: 20 };

  const downwind = getPollutionAt(65, 50, sources, wind); // 15 units East
  const upwind = getPollutionAt(35, 50, sources, wind);   // 15 units West

  assert.ok(downwind > upwind, `Expected downwind (${downwind}) to exceed upwind (${upwind})`);
});
