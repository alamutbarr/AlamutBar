const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildHtml, renderDossier } = require('./dossier');

const sample = {
  trackingCode: 'AB-2048',
  workflowLabel: 'تکمیل‌شده',
  cargo: { type: 'فولاد', weightKg: 12000, value: 250000000 },
  loading: { city: 'تهران' },
  unloading: { city: 'اصفهان' },
  estimatedPrice: 18000000,
  finalPrice: 17500000,
  penaltyAmount: 0,
  waybillNumber: 'WB-77',
  owner: { companyName: 'فولاد خیام', phone: '09121111111' },
  driver: { fullName: 'رضا محمدی', phone: '09123000001', plate: '12-ب-345-11' },
  events: [{ actor: 'اپراتور', description: 'بارنامه صادر شد', at: '2026-10-25T10:00:00.000Z' }],
  inspections: [],
};

test('dossier html embeds Vazirmatn and the Persian case title', () => {
  const html = buildHtml(sample);
  assert.match(html, /font-family: Vazirmatn/);
  assert.match(html, /data:font\/ttf;base64,/);
  assert.match(html, /پرونده پایان مأموریت الموت/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /فولاد خیام/);
});

test('renderDossier returns a PDF that opens', { timeout: 60000 }, async () => {
  const body = await renderDossier(sample);
  assert.ok(Buffer.isBuffer(body));
  assert.equal(body.subarray(0, 5).toString('latin1'), '%PDF-');
  const file = path.join(os.tmpdir(), `alamut-dossier-${process.pid}.pdf`);
  fs.writeFileSync(file, body);
  const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  assert.match(info, /Pages:\s+1/);
  const text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', file, '-'], { encoding: 'utf8' });
  assert.match(text, /پرونده/);
  assert.match(text, /AB-2048/);
  assert.match(text, /رضا محمدی/);
  assert.match(text, /تهران/);
  assert.match(text, /اصفهان/);
  assert.match(text, /خیام/);
});
