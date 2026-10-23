const { Op } = require('sequelize');
const { Shipment } = require('../models');
const notificationService = require('./notification.service');

const OPEN_STATUSES = [
  'pending_review', 'price_proposed', 'searching_driver',
  'driver_assigned', 'at_pickup',
];

function toDateTime(loadingDate, timeFrom) {
  const [h, m] = (timeFrom || '00:00').split(':').map(Number);
  const d = new Date(loadingDate);
  d.setHours(h, m, 0, 0);
  return d;
}

// بارهایی که بین ۲۳ تا ۲۵ ساعت دیگر باید بارگیری شوند و هنوز یادآوری برایشان ارسال نشده را پیدا و اعلان می‌کند
async function sendDueReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const candidates = await Shipment.findAll({
    where: {
      status: { [Op.in]: OPEN_STATUSES },
      reminder_sent_at: null,
      loading_date: {
        [Op.between]: [
          windowStart.toISOString().slice(0, 10),
          windowEnd.toISOString().slice(0, 10),
        ],
      },
    },
  });

  for (const shipment of candidates) {
    const loadingDateTime = toDateTime(shipment.loading_date, shipment.loading_time_from);
    if (loadingDateTime < windowStart || loadingDateTime > windowEnd) continue;

    await notificationService.notify(shipment.owner_id, {
      title: 'یادآوری بارگیری',
      message: `فردا ساعت ${shipment.loading_time_from} زمان بارگیری محموله‌ی ${shipment.tracking_code} است.`,
      shipmentId: shipment.id,
    });

    shipment.reminder_sent_at = now;
    await shipment.save();
  }

  return candidates.length;
}

module.exports = { sendDueReminders };
