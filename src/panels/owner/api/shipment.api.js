import api from './axios.config';

// دریافت انواع خودروها برای مرحله ۸ فرم
export const getVehicleTypes = async () => {
  const res = await api.get('/vehicles');
  return res.data.data;
};

// ثبت نهایی بار در مرحله ۱۱ فرم
export const createShipment = async (shipmentData) => {
  const res = await api.post('/shipments', shipmentData);
  return res.data.data; // { shipment, needsManualReview }
};

// دریافت لیست بارهای ثبت‌شده صاحب کالا
export const getMyShipments = async (status) => {
  const res = await api.get('/shipments', { params: status ? { status } : {} });
  return res.data.data;
};

// دریافت جزئیات یک بار برای رهگیری
export const getShipmentById = async (id) => {
  const res = await api.get(`/shipments/${id}`);
  return res.data.data;
};

export const updateShipment = async (id, payload) => {
  const res = await api.patch(`/shipments/${id}`, payload);
  return res.data.data;
};

// پاسخ صاحب کالا به قیمت پیشنهادی اپراتور
export const respondToPrice = async (id, action) => {
  const res = await api.patch(`/shipments/${id}/respond-price`, { action });
  return res.data.data;
};

// لغو بار
export const cancelShipment = async (id, cancel_reason) => {
  const res = await api.patch(`/shipments/${id}/cancel`, { cancel_reason });
  return res.data.data;
};

// تأیید تحویل بار توسط صاحب کالا (اکشنی مجزا از امتیازدهی)
export const confirmDelivery = async (id) => {
  const res = await api.patch(`/shipments/${id}/confirm-delivery`);
  return res.data.data;
};
