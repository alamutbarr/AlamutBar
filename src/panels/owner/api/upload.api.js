import api from './axios.config';

// آپلود حداکثر ۵ عکس از کالا (مرحله ۵ فرم ثبت بار)
export const uploadShipmentPhotos = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  const res = await api.post('/uploads/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.urls;
};

// آپلود یک فایل مدرک برای شکایت / گزارش تخلف
export const uploadComplaintEvidence = async (file) => {
  const formData = new FormData();
  formData.append('evidence', file);
  const res = await api.post('/uploads/evidence', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.url;
};
