const test = require('node:test');
const assert = require('node:assert/strict');
const { presentInspection } = require('./summary');

test('an inspection summary keeps the decision and the reason for the other panels', () => {
  assert.equal(presentInspection(null), null);
  assert.deepEqual(presentInspection({
    decision: 'STOPPED',
    decisionNote: 'پلمب شکسته است',
    inspector: { fullName: 'متصدی بارگیری خیام' },
  }), {
    decision: 'STOPPED',
    decisionNote: 'پلمب شکسته است',
    inspectorName: 'متصدی بارگیری خیام',
  });
});
