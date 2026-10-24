const { WORKFLOW_LABELS } = require('./workflow');

function escapeHtml(value) {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function money(value) {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('fa-IR')} تومان`;
}

function buildHtml(order) {
  const events = (order.events || []).map((event) => `<li><strong>${escapeHtml(event.actor)}</strong> — ${escapeHtml(event.description)} <span>${escapeHtml(event.at ? new Date(event.at).toLocaleString('fa-IR') : '')}</span></li>`).join('');
  const inspections = (order.inspections || []).map((item) => `<section><h3>بازرسی</h3><p>متصدی: ${escapeHtml(item.inspector?.fullName)}</p><p>خالی ${escapeHtml(item.weightEmpty)} / پر ${escapeHtml(item.weightFull)} / خالص ${escapeHtml(item.weightNet)} کیلوگرم</p><p>تصمیم: ${escapeHtml(item.decision)} — ${escapeHtml(item.decisionNote)}</p></section>`).join('');
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>
    body { font-family: 'Noto Naskh Arabic', 'DejaVu Sans', Tahoma, sans-serif; color: #17383b; background: #fff; margin: 0; }
    header { background: #087f8c; color: #f7f6f0; padding: 24px 28px; }
    h1 { margin: 0; font-size: 22px; }
    main { padding: 24px 28px; }
    h2 { font-size: 16px; border-bottom: 2px solid #d7b56d; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { border: 1px solid #d8e1dc; border-radius: 12px; padding: 12px; }
    li { margin: 8px 0; }
    span { color: #526d70; font-size: 12px; }
  </style></head><body>
    <header><h1>پرونده پایان مأموریت الموت</h1><p>${escapeHtml(order.trackingCode)} — ${escapeHtml(order.workflowLabel)}</p></header>
    <main>
      <div class="grid">
        <div class="card"><h2>بار</h2><p>${escapeHtml(order.cargo?.type)} — ${escapeHtml(order.cargo?.weightKg)} کیلوگرم</p><p>ارزش: ${money(order.cargo?.value)}</p><p>${escapeHtml(order.loading?.city)} به ${escapeHtml(order.unloading?.city)}</p></div>
        <div class="card"><h2>مبالغ</h2><p>تخمینی: ${money(order.estimatedPrice)}</p><p>نهایی: ${money(order.finalPrice)}</p><p>جریمه: ${money(order.penaltyAmount)}</p><p>بارنامه: ${escapeHtml(order.waybillNumber)}</p></div>
        <div class="card"><h2>صاحب کالا</h2><p>${escapeHtml(order.owner?.companyName || `${order.owner?.firstName || ''} ${order.owner?.lastName || ''}`)}</p><p>${escapeHtml(order.owner?.phone)}</p></div>
        <div class="card"><h2>راننده</h2><p>${escapeHtml(order.driver?.fullName)}</p><p>${escapeHtml(order.driver?.phone)} — ${escapeHtml(order.driver?.plate)}</p></div>
      </div>
      ${inspections}
      <h2>تایم‌لاین</h2>
      <ol>${events || '<li>رویدادی ثبت نشده است.</li>'}</ol>
    </main>
  </body></html>`;
}

async function renderDossier(order) {
  const html = buildHtml(order);
  const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
  try {
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const body = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      });
      return { body, type: 'application/pdf', ext: 'pdf' };
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('ساخت PDF ناموفق بود، پرونده HTML برمی‌گردد:', error.message);
    return { body: html, type: 'text/html; charset=utf-8', ext: 'html' };
  }
}

module.exports = { renderDossier, buildHtml };
