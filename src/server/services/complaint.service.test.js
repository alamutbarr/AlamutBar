const test = require('node:test');
const assert = require('node:assert/strict');
const { presentComplaint } = require('./complaint.service');

test('a complaint presents up to ten photo urls and an empty thread', () => {
  const urls = Array.from({ length: 10 }, (_, index) => `/uploads/${index + 1}.jpg`);
  const view = presentComplaint({
    id: 3,
    type: 'delay',
    description: 'تأخیر در بارگیری',
    status: 'reviewed',
    evidence_url: urls,
    messages: [{ id: 1, sender_role: 'operator', body: 'بررسی شد', createdAt: '2026-11-06T12:00:00.000Z' }],
  });
  assert.deepEqual(view.evidence_urls, urls);
  assert.equal(view.messages.length, 1);
  assert.equal(view.messages[0].body, 'بررسی شد');
});

test('a legacy single evidence url still appears in the photo list', () => {
  const view = presentComplaint({ evidence_url: '/uploads/old.jpg', description: 'قدیمی' });
  assert.deepEqual(view.evidence_urls, ['/uploads/old.jpg']);
});
