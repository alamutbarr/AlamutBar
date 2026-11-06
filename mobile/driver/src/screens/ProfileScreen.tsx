import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, clearSession, getAccessToken, getApiUrl } from '../api';
import { registerPush } from '../notifications';
import { Button, Card, Header } from '../ui';
import { colors } from '../theme';
import { DocItem, DriverProfile } from '../types';

const GROUPS: { key: 'personal' | 'vehicle' | 'insurance'; label: string }[] = [
  { key: 'personal', label: 'مدارک فردی' },
  { key: 'vehicle', label: 'مدارک خودرو' },
  { key: 'insurance', label: 'بیمه' },
];

export function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setProfile(await api<DriverProfile>('/api/v1/driver/me'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = async (group: 'personal' | 'vehicle' | 'insurance') => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('اجازهٔ دوربین داده نشد.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const body = new FormData();
    if (asset.file) body.append('file', asset.file);
    else body.append('file', { uri: asset.uri, name: 'document.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
    body.append('group', group);
    body.append('title', GROUPS.find((item) => item.key === group)?.label || 'مدرک');
    try {
      const token = await getAccessToken();
      const response = await fetch(`${await getApiUrl()}/api/v1/driver/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'بارگذاری نشد');
      setNote('مدرک برای بررسی ثبت شد.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  };

  const enablePush = async () => {
    try {
      setNote(await registerPush());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  };

  return (
    <View style={styles.page}>
      <Header title="پروفایل" subtitle={profile?.fullName || 'راننده'} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Text style={styles.name}>{profile?.fullName || '...'}</Text>
          <Text style={styles.meta}>{profile?.phone}</Text>
          <Text style={styles.meta}>{profile?.plate || 'پلاک ثبت نشده'}</Text>
          <Text style={styles.meta}>{[profile?.tractorType, profile?.trailerType].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.meta}>وضعیت مدارک: {profile?.verificationStatus || '—'}</Text>
        </Card>
        {GROUPS.map((group) => (
          <Card key={group.key}>
            <Text style={styles.name}>{group.label}</Text>
            {(profile?.documents?.[group.key] || []).map((doc: DocItem) => (
              <Text key={doc.key} style={styles.meta}>{doc.title} · {doc.status}</Text>
            ))}
            {(profile?.documents?.[group.key] || []).length === 0 ? <Text style={styles.meta}>هنوز عکسی نیست.</Text> : null}
            <Button label="عکس با دوربین" tone="ghost" onPress={() => upload(group.key)} />
          </Card>
        ))}
        <Card>
          <Text style={styles.name}>اعلان</Text>
          <Text style={styles.meta}>
            {profile?.push.registered ? (profile.push.stub ? 'ثبت محلی، بدون کلید اکسپو' : 'به سرور وصل است') : 'هنوز ثبت نشده'}
          </Text>
          <Button label="فعال کردن اعلان" tone="gold" onPress={enablePush} />
        </Card>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="خروج" tone="danger" onPress={async () => { await clearSession(); onLogout(); }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  body: { padding: 16, gap: 12, paddingBottom: 28 },
  name: { fontFamily: 'Vazirmatn_700Bold', fontSize: 16, color: colors.ink, textAlign: 'right' },
  meta: { fontFamily: 'Vazirmatn_400Regular', color: colors.muted, textAlign: 'right', lineHeight: 24 },
  note: { color: colors.primary, fontFamily: 'Vazirmatn_700Bold', textAlign: 'right' },
  error: { color: colors.crit, fontFamily: 'Vazirmatn_400Regular', textAlign: 'right' },
});
