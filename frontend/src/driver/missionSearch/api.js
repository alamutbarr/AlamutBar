// frontend/src/driver/missionSearch/api.js
//
// فراخوانی‌های API مربوط به جست‌وجوی مکانی بارها (مشترک بین صفحه‌ی
// مأموریت‌ها و تب پیشنهادها). هیچ داده‌ی ساختگی اینجا تولید نمی‌شود؛ همه چیز
// از بک‌اند واقعی گرفته می‌شود.

import { api } from '@/services/api';

export async function fetchProvinces() {
  const res = await api.get('/location/provinces');
  return res.data?.provinces ?? [];
}

export async function searchLocationsApi(query) {
  const res = await api.get('/location/search', { params: { q: query } });
  return {
    provinces: res.data?.provinces ?? [],
    cities: res.data?.cities ?? [],
  };
}

export async function reverseGeocodeApi(lat, lng) {
  const res = await api.get('/location/reverse', { params: { lat, lng } });
  return res.data; // { province, source, accuracy, nearestCity?, distanceKm? }
}

export async function fetchNearbyMissions({ lat, lng, destProvince }) {
  const res = await api.get('/driver/missions/nearby', {
    params: {
      lat,
      lng,
      ...(destProvince ? { destProvince } : {}),
    },
  });
  return res.data; // { missions, radiusKm }
}

export async function fetchMissionsByRoute({ originCityId, originProvinceId, destCityId, destProvinceId }) {
  const res = await api.get('/driver/missions/search', {
    params: {
      ...(originCityId ? { originCityId } : {}),
      ...(originProvinceId ? { originProvinceId } : {}),
      ...(destCityId ? { destCityId } : {}),
      ...(destProvinceId ? { destProvinceId } : {}),
    },
  });
  return res.data; // { missions }
}
