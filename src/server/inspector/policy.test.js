const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('./policy');

const settings = {
  inspector_required_mode: 'flagged_or_value',
  sensitive_cargo_value: 500000000,
  weight_discrepancy_kg: 200,
  value_discrepancy_ratio: 0.05,
  inspector_grace_minutes: 30,
  inspector_required_items: policy.DEFAULT_REQUIRED,
  inspector_checklist: policy.DEFAULT_CHECKLIST,
};

test('only flagged, assigned, or high-value loads need an inspector', () => {
  assert.equal(policy.needsInspector({ cargo_value: 1000 }, settings), false);
  assert.equal(policy.needsInspector({ cargo_value: 500000000 }, settings), true);
  assert.equal(policy.needsInspector({ requires_inspector: true, cargo_value: 1 }, settings), true);
  assert.equal(policy.needsInspector({ assigned_inspector_id: 4, cargo_value: 1 }, { ...settings, inspector_required_mode: 'assigned_only' }), true);
  assert.equal(policy.needsInspector({ cargo_value: 900000000 }, { ...settings, inspector_required_mode: 'assigned_only' }), false);
  assert.equal(policy.needsInspector({ cargo_value: 1 }, { ...settings, inspector_required_mode: 'all' }), true);
});

test('a visit stays hidden from another inspector and from early orders', () => {
  assert.equal(policy.missionVisible({
    workflowStatus: 'AT_LOADING_INSPECTION', assignedInspectorId: null, inspectorId: 2, needs: true,
  }), true);
  assert.equal(policy.missionVisible({
    workflowStatus: 'IN_TRANSIT', assignedInspectorId: 1, inspectorId: 2, needs: true,
  }), false);
  assert.equal(policy.missionVisible({
    workflowStatus: 'PRICE_ESTIMATED', assignedInspectorId: null, inspectorId: 2, needs: true,
  }), false);
  assert.equal(policy.missionVisible({
    workflowStatus: 'COMPLETED', assignedInspectorId: 2, inspectorId: 2, needs: true,
  }), false);
});

test('weight, value, and an unchecked item become discrepancies', () => {
  const items = policy.buildDiscrepancies({
    declaredWeight: 9000,
    actualNet: 9400,
    weightToleranceKg: 200,
    declaredValue: 100000000,
    actualValue: 130000000,
    valueRatio: 0.05,
    declaredCargo: 'ورق',
    actualCargo: 'میلگرد',
    checklist: [{ key: 'seal', label: 'پلمب سالم است', checked: false, note: 'پلمب باز بود' }],
    manual: [{ field: 'weight', expected: 'old', actual: 'old', note: 'stale' }],
  });
  const fields = items.map((item) => item.field);
  assert.deepEqual(fields, ['weight', 'cargo_value', 'cargo_type', 'checklist:seal']);
});

test('required photos, weights, and the insured value gate completion', () => {
  const open = policy.completeness({
    required: policy.DEFAULT_REQUIRED,
    photos: [{ kind: 'seal' }],
    weightEmpty: 14000,
    weightFull: null,
    cargoValue: null,
  });
  assert.equal(open.complete, false);
  assert.deepEqual(open.missing.map((item) => item.key), ['lashing_photo', 'weight_full', 'cargo_value']);
  const done = policy.completeness({
    required: policy.DEFAULT_REQUIRED,
    photos: [{ kind: 'seal' }, { kind: 'lashing' }],
    weightEmpty: 14000,
    weightFull: 23000,
    cargoValue: 800000000,
  });
  assert.equal(done.complete, true);
});

test('no-show waits until the Tehran loading window plus the grace period', () => {
  const base = {
    needs: true,
    workflowStatus: 'AT_LOADING_INSPECTION',
    loadingDate: '2026-10-24',
    loadingTimeTo: '14:00',
    graceMinutes: 30,
    report: null,
  };
  assert.equal(policy.inspectorNoShow({ ...base, now: new Date('2026-10-24T10:45:00Z') }), null);
  const late = policy.inspectorNoShow({ ...base, now: new Date('2026-10-24T11:01:00Z') });
  assert.equal(late.type, 'INSPECTOR_ABSENT');
  assert.equal(policy.inspectorNoShow({
    ...base,
    now: new Date('2026-10-24T12:00:00Z'),
    report: { photos: [{ kind: 'seal' }] },
  }), null);
});

test('the inspector can close only a complete visit with no discrepancy', () => {
  assert.equal(policy.approvalDecision({ finalApproval: 'supervisor', complete: true, discrepancies: [] }), 'PENDING');
  assert.equal(policy.approvalDecision({ finalApproval: 'inspector', complete: true, discrepancies: [] }), 'APPROVED');
  assert.equal(policy.approvalDecision({ finalApproval: 'inspector', complete: true, discrepancies: [{}] }), 'PENDING');
  assert.equal(policy.approvalDecision({ finalApproval: 'inspector', complete: false, discrepancies: [] }), 'PENDING');
});
