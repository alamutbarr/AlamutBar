import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, bundledApiUrl, getApiUrl, saveSession, setApiUrl } from '../api';
import { BrandMark } from '../ui';
import { colors, radius } from '../theme';

type Props = { onLoggedIn: () => void };

export function LoginScreen({ onLoggedIn }: Props) {
  const [phone, setPhone] = useState('09123000001');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [apiUrl, setUrl] = useState(bundledApiUrl());
  const [showUrl, setShowUrl] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    setBusy(true);
    setError('');
    try {
      await setApiUrl(apiUrl.trim());
      const data = await api<{ devOtpCode?: string }>('/api/v1/driver/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      if (data.devOtpCode) {
        setCode(data.devOtpCode);
        setHint(`کد آزمایشی: ${data.devOtpCode}`);
      }
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api<{ token: string; refreshToken: string }>('/api/v1/driver/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      await saveSession(data.token, data.refreshToken);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <BrandMark />
        <Text style={styles.word}>ALAMUT</Text>
        <Text style={styles.sub}>پنل راننده</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{step === 'phone' ? 'ورود با موبایل' : 'کد تأیید'}</Text>
          {step === 'phone' ? (
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0912..."
              textAlign="left"
            />
          ) : (
            <>
              <TextInput style={styles.input} value={code} onChangeText={setCode} keyboardType="number-pad" textAlign="center" />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.button} disabled={busy} onPress={step === 'phone' ? requestCode : verify}>
            <Text style={styles.buttonText}>{busy ? '...' : step === 'phone' ? 'دریافت کد' : 'ورود'}</Text>
          </Pressable>
          {step === 'code' ? (
            <Pressable onPress={() => setStep('phone')}>
              <Text style={styles.link}>تغییر شماره</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={async () => { setUrl(await getApiUrl()); setShowUrl((v) => !v); }}>
          <Text style={styles.link}>آدرس سرور</Text>
        </Pressable>
        {showUrl ? (
          <TextInput style={styles.input} value={apiUrl} onChangeText={setUrl} autoCapitalize="none" textAlign="left" />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  header: { backgroundColor: colors.primary, alignItems: 'center', paddingTop: 48, paddingBottom: 28, gap: 6 },
  word: { color: colors.cream, fontFamily: 'Vazirmatn_700Bold', letterSpacing: 2, fontSize: 22 },
  sub: { color: 'rgba(247,246,240,0.85)', fontFamily: 'Vazirmatn_400Regular' },
  body: { padding: 20, gap: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.line },
  title: { fontFamily: 'Vazirmatn_700Bold', fontSize: 18, color: colors.ink, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    backgroundColor: colors.cream,
    paddingHorizontal: 14,
    minHeight: 52,
    fontFamily: 'Vazirmatn_700Bold',
    fontSize: 18,
    color: colors.ink,
  },
  button: { backgroundColor: colors.primary, borderRadius: radius.control, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.cream, fontFamily: 'Vazirmatn_700Bold', fontSize: 16 },
  hint: { color: colors.primary, fontFamily: 'Vazirmatn_700Bold', textAlign: 'center' },
  error: { color: colors.crit, fontFamily: 'Vazirmatn_400Regular', textAlign: 'right' },
  link: { color: colors.primary, fontFamily: 'Vazirmatn_700Bold', textAlign: 'center' },
});
