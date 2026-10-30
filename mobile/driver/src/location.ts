/**
 * TODO(location): گزارش موقعیت، هم در پیش‌زمینه و هم در پس‌زمینه، عمداً در این نسخه نیست.
 * وقتی برگردد، اینجا اجازهٔ مکان گرفته می‌شود و به POST /api/v1/driver/location
 * با { missionId, lat, lng, active } فرستاده می‌شود.
 * تا آن موقع expo-location را اضافه نکنید و اجازهٔ مکان نخواهید.
 * موقعیت پس‌زمینه در Expo Go پشتیبانی نمی‌شود و بیلد توسعه می‌خواهد.
 */
export function reportLocationPlaceholder(missionId: number | null): void {
  void missionId;
}
