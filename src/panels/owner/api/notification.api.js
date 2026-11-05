import api from './axios.config';

export const getMyNotifications = async () => {
  const res = await api.get('/notifications');
  return res.data.data;
};

export const markNotificationAsRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`);
  window.dispatchEvent(new Event('alamut:notifications'));
  return res.data.data;
};

export const markAllNotificationsAsRead = async () => {
  const res = await api.patch('/notifications/read-all');
  window.dispatchEvent(new Event('alamut:notifications'));
  return res.data.data;
};

export const markAllNotificationsRead = markAllNotificationsAsRead;
