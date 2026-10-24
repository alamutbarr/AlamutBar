import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function inExpoGo(): boolean {
  return Constants.expoGoConfig != null;
}

export async function registerPush(): Promise<string> {
  if (Platform.OS === 'web' || inExpoGo()) {
    await api('/api/v1/driver/push-token', {
      method: 'POST',
      body: JSON.stringify({ stub: true, platform: Platform.OS === 'web' ? 'web' : 'expo-go' }),
    });
    if (inExpoGo()) {
      return 'در Expo Go فقط ثبت محلی انجام شد. پوش از سرور بیلد توسعه می‌خواهد.';
    }
    return 'روی وب اعلان دستگاه نیست. ثبت محلی انجام شد.';
  }
  const existing = await Notifications.getPermissionsAsync();
  const next = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (next.status !== 'granted') return 'اجازهٔ اعلان داده نشد.';
  const projectId = Constants.expoConfig?.extra && (Constants.expoConfig.extra as { eas?: { projectId?: string } }).eas?.projectId;
  if (!projectId) {
    await api('/api/v1/driver/push-token', {
      method: 'POST',
      body: JSON.stringify({ stub: true, platform: Platform.OS }),
    });
    return 'کلید پروژهٔ اکسپو تنظیم نشده. اعلان فقط محلی ثبت شد.';
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api('/api/v1/driver/push-token', {
    method: 'POST',
    body: JSON.stringify({ token: token.data, platform: Platform.OS }),
  });
  return 'اعلان به سرور وصل شد.';
}
