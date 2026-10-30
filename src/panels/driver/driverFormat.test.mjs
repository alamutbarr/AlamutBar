import test from 'node:test';
import assert from 'node:assert/strict';
import { missionTabFromQuery } from './driverFormat.js';

test('dashboard shortcuts open the matching missions tab', () => {
  assert.equal(missionTabFromQuery('active'), 'active');
  assert.equal(missionTabFromQuery('offered'), 'offered');
  assert.equal(missionTabFromQuery('history'), 'history');
  assert.equal(missionTabFromQuery('nope'), 'offered');
  assert.equal(missionTabFromQuery(null), 'offered');
});
