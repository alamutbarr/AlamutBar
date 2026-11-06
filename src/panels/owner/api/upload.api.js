import api from './axios.config';

// آپلود حداکثر ۴ عکس از کالا (مرحله عکس فرم ثبت بار)
export const uploadShipmentPhotos = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  const res = await api.post('/uploads/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.urls;
};

// آپلود حداکثر ۴ عکس مدرک برای شکایت / گزارش تخلف
export const uploadComplaintEvidence = async (files) => {
  const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
  const formData = new FormData();
  list.forEach((file) => formData.append('evidence', file));
  const res = await api.post('/uploads/evidence', formData, {
    transformRequest: [(data, headers) => {
      if (headers) {
        if (typeof headers.delete === 'function') headers.delete('Content-Type');
        else delete headers['Content-Type'];
      }
      return data;
    }],
  });
  return res.data.data.urls || (res.data.data.url ? [res.data.data.url] : []);
};
