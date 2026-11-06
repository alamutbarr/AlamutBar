const test = require('node:test');
const assert = require('node:assert/strict');
const { presentComplaint } = require('./complaint.service');

test('a complaint presents up to four photo urls for both panels', () => {
  const view = presentComplaint({
    id: 3,
    type: 'delay',
    description: 'تأخیر در بارگیری',
    status: 'pending',
    evidence_url: ['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg', '/uploads/d.jpg'],
  });
  assert.deepEqual(view.evidence_urls, ['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg', '/uploads/d.jpg']);
});

test('a legacy single evidence url still appears in the photo list', () => {
  const view = presentComplaint({ evidence_url: '/uploads/old.jpg', description: 'قدیمی' });
  assert.deepEqual(view.evidence_urls, ['/uploads/old.jpg']);
});
