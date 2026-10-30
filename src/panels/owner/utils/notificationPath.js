export function notificationPath(notification) {
  const title = String(notification?.title || "");
  if (/مدرک|هویت|احراز/.test(title)) return "/owner/profile";
  if (/شکایت/.test(title)) return "/owner/complaints";
  if (notification?.shipment_id) return `/owner/shipments/${notification.shipment_id}`;
  return "/owner/shipments";
}
