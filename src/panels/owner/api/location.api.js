import api from './axios.config';

export const getCities = async () => {
  const res = await api.get('/locations/cities');
  return res.data.data;
};

export const getZonesByCity = async (cityId) => {
  if (!cityId) return [];
  const res = await api.get(`/locations/cities/${cityId}/zones`);
  return res.data.data;
};
