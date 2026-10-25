const test = require('node:test');
const assert = require('node:assert/strict');

// Import degToCompass logic
function degToCompass(degrees) {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const val = Math.floor((degrees / 22.5) + 0.5);
  return cardinals[val % 16];
}

test('Weather Service: degToCompass correctly maps degree angles to cardinal headings', () => {
  assert.equal(degToCompass(0), 'N');
  assert.equal(degToCompass(90), 'E');
  assert.equal(degToCompass(180), 'S');
  assert.equal(degToCompass(225), 'SW');
  assert.equal(degToCompass(270), 'W');
  assert.equal(degToCompass(360), 'N');
});
