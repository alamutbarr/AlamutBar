import test from 'node:test';
import assert from 'node:assert/strict';
import { countUnread } from './notificationBadge.js';

test('countUnread counts only unread notifications', () => {
  assert.equal(countUnread(null), 0);
  assert.equal(countUnread([]), 0);
  assert.equal(countUnread([{ is_read: true }, { is_read: false }, { is_read: false }]), 2);
  assert.equal(countUnread([{ is_read: true }]), 0);
});
