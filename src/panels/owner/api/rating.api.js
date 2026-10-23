import api from './axios.config';

export const rateShipment = async (shipmentId, payload) => {
  const res = await api.post(`/ratings/${shipmentId}`, payload);
  return res.data.data;
};
