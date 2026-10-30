const fs = require('fs');
const path = require('path');

const FONT = fs.readFileSync(path.join(__dirname, 'fonts', 'Vazirmatn-Regular.ttf')).toString('base64');

function escapeHtml(value) {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const LRI = '\u2066';
const PDI = '\u2069';

function money(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('fa-IR')} تومان`;
}

function ltr(value) {
  return `${LRI}${value}${PDI}`;
}

function latinDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function protectNumbers(text) {
  return latinDigits(text).replace(/[0-9][0-9,./:+-]*/g, (token) => ltr(token));
}

function pdfMoney(value) {
  if (value == null || value === '') return '—';
  return `${ltr(Number(value).toLocaleString('en-US'))} تومان`;
}

function pdfWhen(value) {
  if (!value) return '';
  return ltr(new Date(value).toLocaleString('fa-IR-u-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }));
}

function pdfPlate(value) {
  const text = shown(value);
  if (text === '—') return text;
  if (/[\u0600-\u06FF]/.test(text) && /[0-9۰-۹]/.test(text)) return text.split('').reverse().join('');
  return ltr(latinDigits(text));
}

function buildHtml(order) {
  const events = (order.events || []).map((event) => `<li><strong>${escapeHtml(event.actor)}</strong> — ${escapeHtml(event.description)} <span>${escapeHtml(event.at ? new Date(event.at).toLocaleString('fa-IR') : '')}</span></li>`).join('');
  const inspections = (order.inspections || []).map((item) => `<section><h3>بازرسی</h3><p>متصدی: ${escapeHtml(item.inspector?.fullName)}</p><p>خالی ${escapeHtml(item.weightEmpty)} / پر ${escapeHtml(item.weightFull)} / خالص ${escapeHtml(item.weightNet)} کیلوگرم</p><p>تصمیم: ${escapeHtml(item.decision)} — ${escapeHtml(item.decisionNote)}</p></section>`).join('');
  const ownerName = order.owner?.companyName || `${order.owner?.firstName || ''} ${order.owner?.lastName || ''}`.trim();
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>
    @font-face { font-family: Vazirmatn; src: url(data:font/ttf;base64,${FONT}) format('truetype'); font-weight: 400; }
    * { font-family: Vazirmatn, sans-serif; font-variant-ligatures: none; font-feature-settings: "liga" 0; }
    body { color: #17383b; background: #fff; margin: 0; direction: rtl; }
    header { background: #10282b; color: #f7f6f0; padding: 24px 28px; }
    h1 { margin: 0; font-size: 22px; }
    header p { color: #d7b56d; }
    main { padding: 24px 28px; }
    h2 { font-size: 16px; border-bottom: 2px solid #d7b56d; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { border: 1px solid #d8e1dc; border-radius: 8px; padding: 12px; }
    li { margin: 8px 0; }
    span { color: #526d70; font-size: 12px; }
  </style></head><body>
    <header><h1>پرونده پایان مأموریت الموت</h1><p>${escapeHtml(order.trackingCode)} — ${escapeHtml(order.workflowLabel)}</p></header>
    <main>
      <div class="grid">
        <div class="card"><h2>بار</h2><p>${escapeHtml(order.cargo?.type)} — ${escapeHtml(order.cargo?.weightKg)} کیلوگرم</p><p>ارزش: ${money(order.cargo?.value)}</p><p>${escapeHtml(order.loading?.city)} به ${escapeHtml(order.unloading?.city)}</p></div>
        <div class="card"><h2>مبالغ</h2><p>تخمینی: ${money(order.estimatedPrice)}</p><p>نهایی: ${money(order.finalPrice)}</p><p>جریمه: ${money(order.penaltyAmount)}</p><p>بارنامه: ${escapeHtml(order.waybillNumber)}</p></div>
        <div class="card"><h2>صاحب کالا</h2><p>${escapeHtml(ownerName)}</p><p>${escapeHtml(order.owner?.phone)}</p></div>
        <div class="card"><h2>راننده</h2><p>${escapeHtml(order.driver?.fullName)}</p><p>${escapeHtml(order.driver?.phone)} — ${escapeHtml(order.driver?.plate)}</p></div>
      </div>
      ${inspections}
      <h2>تایم‌لاین</h2>
      <ol>${events || '<li>رویدادی ثبت نشده است.</li>'}</ol>
    </main>
  </body></html>`;
}

const FONT_PATH = path.join(__dirname, 'fonts', 'Vazirmatn-Regular.ttf');

function shown(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

function writeLine(doc, text, raw = false) {
  doc.fillColor('#17383b').fontSize(11).text(raw ? text : protectNumbers(text), {
    align: 'right',
    width: doc.page.width - 72,
  });
}

function writeSection(doc, title) {
  doc.moveDown(0.7);
  doc.fillColor('#17383b').fontSize(14).text(title, {
    align: 'right',
    width: doc.page.width - 72,
  });
  const y = doc.y + 2;
  doc.save();
  doc.moveTo(36, y).lineTo(doc.page.width - 36, y).lineWidth(1.5).strokeColor('#d7b56d').stroke();
  doc.restore();
  doc.moveDown(0.45);
}

function renderDossier(order) {
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      info: { Title: `alamut-${order.trackingCode || 'dossier'}`, Author: 'alamut.bar' },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    try {
      doc.registerFont('Vazir', FONT_PATH);
      const width = doc.page.width;
      doc.rect(0, 0, width, 88).fill('#10282b');
      doc.fillColor('#f7f6f0').font('Vazir').fontSize(18).text('پرونده پایان مأموریت الموت', 36, 24, {
        align: 'right',
        width: width - 72,
      });
      doc.fillColor('#d7b56d').fontSize(12).text(`${ltr(shown(order.trackingCode))} — ${shown(order.workflowLabel)}`, 36, 52, {
        align: 'right',
        width: width - 72,
      });
      doc.y = 108;
      doc.x = 36;
      const ownerName = order.owner?.companyName || `${order.owner?.firstName || ''} ${order.owner?.lastName || ''}`.trim();
      writeSection(doc, 'بار');
      writeLine(doc, `${shown(order.cargo?.type)} — ${shown(order.cargo?.weightKg)} کیلوگرم`);
      writeLine(doc, `ارزش: ${pdfMoney(order.cargo?.value)}`, true);
      writeLine(doc, `${shown(order.loading?.city)} به ${shown(order.unloading?.city)}`);
      writeSection(doc, 'مبالغ');
      writeLine(doc, `تخمینی: ${pdfMoney(order.estimatedPrice)}`, true);
      writeLine(doc, `نهایی: ${pdfMoney(order.finalPrice)}`, true);
      writeLine(doc, `جریمه: ${pdfMoney(order.penaltyAmount)}`, true);
      writeLine(doc, `بارنامه: ${ltr(shown(order.waybillNumber))}`, true);
      writeSection(doc, 'طرف‌ها');
      writeLine(doc, `صاحب کالا: ${shown(ownerName)} — ${shown(order.owner?.phone)}`);
      writeLine(doc, `راننده: ${shown(order.driver?.fullName)} — ${shown(order.driver?.phone)}`);
      writeLine(doc, `پلاک: ${pdfPlate(order.driver?.plate)}`, true);
      for (const item of order.inspections || []) {
        writeSection(doc, 'بازرسی');
        writeLine(doc, `متصدی: ${shown(item.inspector?.fullName)}`);
        writeLine(doc, `خالی ${shown(item.weightEmpty)} / پر ${shown(item.weightFull)} / خالص ${shown(item.weightNet)} کیلوگرم`);
        writeLine(doc, `تصمیم: ${shown(item.decision)} — ${shown(item.decisionNote)}`);
      }
      writeSection(doc, 'تایم‌لاین');
      const events = order.events || [];
      if (!events.length) writeLine(doc, 'رویدادی ثبت نشده است.');
      events.forEach((event) => {
        const when = pdfWhen(event.at);
        writeLine(doc, `${shown(event.actor)} — ${protectNumbers(shown(event.description))}${when ? ` — ${when}` : ''}`, true);
      });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function sendPdf(res, body, filename) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    const error = new Error('پرونده PDF ساخته نشد.');
    error.statusCode = 500;
    throw error;
  }
  const asciiName = String(filename || 'alamut.pdf').replace(/[^\w.-]+/g, '-');
  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(buffer);
}

module.exports = { renderDossier, buildHtml, sendPdf };
