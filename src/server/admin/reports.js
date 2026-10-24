const ExcelJS = require('exceljs');

async function buildWorkbook(report, financial) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ALAMUT';
  const sheet = workbook.addWorksheet(financial ? 'مالی' : 'عملکرد', { views: [{ rightToLeft: true }] });
  const columns = financial
    ? [
      { header: 'کد پیگیری', key: 'trackingCode', width: 22 },
      { header: 'وضعیت', key: 'status', width: 22 },
      { header: 'مبدأ', key: 'origin', width: 16 },
      { header: 'مقصد', key: 'destination', width: 16 },
      { header: 'راننده', key: 'driver', width: 20 },
      { header: 'قیمت پیشنهادی', key: 'proposedPrice', width: 18 },
      { header: 'قیمت تخمینی', key: 'estimatedPrice', width: 18 },
      { header: 'قیمت نهایی', key: 'finalPrice', width: 18 },
      { header: 'جریمه', key: 'penalty', width: 16 },
      { header: 'بارنامه', key: 'waybillNumber', width: 18 },
    ]
    : [
      { header: 'کد پیگیری', key: 'trackingCode', width: 22 },
      { header: 'وضعیت', key: 'status', width: 22 },
      { header: 'مبدأ', key: 'origin', width: 16 },
      { header: 'مقصد', key: 'destination', width: 16 },
      { header: 'راننده', key: 'driver', width: 20 },
      { header: 'تاریخ', key: 'createdAt', width: 22 },
    ];
  sheet.columns = columns;
  sheet.addRows(report.items.map((item) => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('fa-IR') : '',
  })));
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

module.exports = { buildWorkbook };
