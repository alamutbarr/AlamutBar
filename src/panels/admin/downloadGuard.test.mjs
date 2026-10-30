import test from 'node:test';
import assert from 'node:assert/strict';
import { failureMessage, pdfMagic, savePlan } from './downloadGuard.mjs';

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const html = new TextEncoder().encode('<!doctype html><html></html>');

test('a real PDF body is accepted and an HTML page is rejected', () => {
  assert.equal(pdfMagic(pdf), true);
  assert.equal(failureMessage({
    ok: true,
    contentType: 'application/pdf',
    bytes: pdf,
    wantPdf: true,
  }), null);
  assert.equal(failureMessage({
    ok: true,
    contentType: 'text/html; charset=utf-8',
    bytes: html,
    wantPdf: true,
  }), 'به‌جای پرونده، صفحهٔ سایت برگشت. درخواست دانلود به API نرسید.');
  assert.equal(failureMessage({
    ok: false,
    bodyText: '{"success":false,"message":"لطفاً وارد شوید."}',
    contentType: 'application/json',
    bytes: new Uint8Array(),
    wantPdf: true,
  }), 'لطفاً وارد شوید.');
});

test('a slow PDF falls back to a second click because the browser drops the first one', () => {
  assert.equal(savePlan({ hasHandle: true, elapsedMs: 9000, wantPdf: true }), 'picker');
  assert.equal(savePlan({ hasHandle: false, elapsedMs: 2600, wantPdf: true }), 'anchor');
  assert.equal(savePlan({ hasHandle: false, elapsedMs: 4000, wantPdf: true }), 'manual');
  assert.equal(savePlan({ hasHandle: false, elapsedMs: 9000, wantPdf: false }), 'anchor');
});
