import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, getAccessToken, getApiUrl } from '../api';
import { reportLocationPlaceholder } from '../location';
import { Button, Card, Header } from '../ui';
import { colors } from '../theme';
import { FLOW, Mission, STATUS_LABEL, nextStatus } from '../types';

export function MissionDetailScreen({ id, onBack }: { id: number; onBack: () => void }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError('');
    try {
      setMission(await api<Mission>(`/api/v1/driver/missions/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  };

  useEffect(() => {
    load();
    reportLocationPlaceholder(id);
  }, [id]);

  const act = async (path: string, body?: object) => {
    setBusy(true);
    setError('');
    try {
      await api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('اجازهٔ دوربین یا عکس داده نشد.');
      return;
    }
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const body = new FormData();
    if (asset.file) body.append('file', asset.file);
    else {
      body.append('file', {
        uri: asset.uri,
        name: 'cargo.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);
    }
    setBusy(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${await getApiUrl()}/api/v1/driver/missions/${id}/photos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'بارگذاری نشد');
      Alert.alert('عکس ثبت شد');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };

  if (!mission) {
    return (
      <View style={styles.page}>
        <Header title="مأموریت" />
        <Text style={styles.error}>{error || 'در حال خواندن...'}</Text>
        <Button label="بازگشت" tone="ghost" onPress={onBack} />
      </View>
    );
  }

  const upcoming = mission.mine ? nextStatus(mission.status) : null;

  return (
    <View style={styles.page}>
      <Header title={mission.trackingCode} subtitle={STATUS_LABEL[mission.status] || mission.status} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Text style={styles.route}>{mission.origin.city} ← {mission.destination.city}</Text>
          <Text style={styles.meta}>{mission.origin.address || mission.origin.zone || 'آدرس مبدأ پس از قبول'}</Text>
          <Text style={styles.meta}>
            مقصد: {mission.destination.exactVisible ? (mission.destination.address || mission.destination.zone || mission.destination.city) : 'نشانی دقیق بعد از بارنامه'}
          </Text>
          <Text style={styles.meta}>{mission.cargo.type}{mission.cargo.weightKg ? ` · ${mission.cargo.weightKg} کیلو` : ''}</Text>
          {mission.waybillNumber ? <Text style={styles.meta}>بارنامه {mission.waybillNumber}</Text> : null}
        </Card>
        {mission.mine ? (
          <Card>
            {FLOW.map((step) => {
              const reached = FLOW.indexOf(step) <= FLOW.indexOf(mission.status as typeof step);
              return <Text key={step} style={[styles.step, reached && styles.stepOn]}>{STATUS_LABEL[step]}</Text>;
            })}
          </Card>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!mission.mine && mission.status === 'Offered' ? (
          <View style={styles.actions}>
            <Button label="قبول" disabled={busy} onPress={() => act(`/api/v1/driver/missions/${id}/accept`)} />
            <Button label="رد" tone="danger" disabled={busy} onPress={() => act(`/api/v1/driver/missions/${id}/decline`)} />
          </View>
        ) : null}
        {upcoming && upcoming !== 'Completed' ? (
          <Button label={STATUS_LABEL[upcoming]} disabled={busy} onPress={() => act(`/api/v1/driver/missions/${id}/status`, { status: upcoming })} />
        ) : null}
        {upcoming === 'Completed' ? (
          <Card>
            <Text style={styles.meta}>کد تحویل گیرنده</Text>
            <TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" textAlign="center" />
            <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="اگر کد نیست، دلیل را بنویسید" textAlign="right" />
            <Button
              label="ثبت تحویل"
              disabled={busy}
              onPress={() => act(`/api/v1/driver/missions/${id}/delivery/verify`, { otp, exceptionReason: reason })}
            />
          </Card>
        ) : null}
        {mission.mine && mission.status !== 'Completed' ? (
          <View style={styles.actions}>
            <Button label="عکس با دوربین" tone="ghost" disabled={busy} onPress={() => upload(true)} />
            <Button label="انتخاب از گالری" tone="ghost" disabled={busy} onPress={() => upload(false)} />
          </View>
        ) : null}
        <Button label="بازگشت" tone="ghost" onPress={onBack} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  body: { padding: 16, gap: 12, paddingBottom: 32 },
  route: { fontFamily: 'Vazirmatn_700Bold', fontSize: 18, color: colors.ink, textAlign: 'right' },
  meta: { fontFamily: 'Vazirmatn_400Regular', color: colors.muted, textAlign: 'right', lineHeight: 24 },
  step: { fontFamily: 'Vazirmatn_400Regular', color: colors.muted, textAlign: 'right', paddingVertical: 4 },
  stepOn: { color: colors.primary, fontFamily: 'Vazirmatn_700Bold' },
  actions: { gap: 8 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, minHeight: 48, paddingHorizontal: 12, backgroundColor: colors.cream, fontFamily: 'Vazirmatn_700Bold', color: colors.ink },
  error: { color: colors.crit, fontFamily: 'Vazirmatn_400Regular', textAlign: 'right' },
});
