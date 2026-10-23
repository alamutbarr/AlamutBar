import api from './axios.config';

export const createComplaint = async (payload) => {
  const res = await api.post('/complaints', payload);
  return res.data.data;
};

export const getMyComplaints = async () => {
  const res = await api.get('/complaints');
  return res.data.data;
};
