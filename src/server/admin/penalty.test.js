const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePenalty } = require('./penalty');

test('penalty grows every 30 minutes and caps at 15 percent', () => {
  const open = calculatePenalty({
    delayMinutes: 75,
    stepMinutes: 30,
    perStep: 250000,
    capRatio: 0.15,
    freight: 10000000,
  });
  assert.equal(open.steps, 2);
  assert.equal(open.amount, 500000);
  assert.equal(open.capped, false);

  const capped = calculatePenalty({
    delayMinutes: 600,
    stepMinutes: 30,
    perStep: 250000,
    capRatio: 0.15,
    freight: 10000000,
  });
  assert.equal(capped.amount, 1500000);
  assert.equal(capped.capped, true);
});

test('force majeure zeroes the penalty', () => {
  const result = calculatePenalty({
    delayMinutes: 180,
    perStep: 250000,
    freight: 8000000,
    forceMajeure: true,
  });
  assert.equal(result.amount, 0);
  assert.equal(result.steps, 0);
});
