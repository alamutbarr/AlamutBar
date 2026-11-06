import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Vazirmatn_400Regular, Vazirmatn_700Bold } from '@expo-google-fonts/vazirmatn';
import { Ionicons } from '@expo/vector-icons';
import { getAccessToken } from './src/api';
import { LoginScreen } from './src/screens/LoginScreen';
import { MissionsScreen } from './src/screens/MissionsScreen';
import { MissionDetailScreen } from './src/screens/MissionDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors, radius } from './src/theme';

I18nManager.allowRTL(true);
if (Platform.OS === 'web') {
  const doc = globalThis as { document?: { documentElement: { dir: string; lang: string } } };
  if (doc.document) {
    doc.document.documentElement.dir = 'rtl';
    doc.document.documentElement.lang = 'fa';
  }
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'missions' | 'profile'>('missions');
  const [missionId, setMissionId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const items = [
    { key: 'missions' as const, label: 'مأموریت‌ها', icon: 'list' as const },
    { key: 'profile' as const, label: 'پروفایل', icon: 'person' as const },
  ];
  return (
    <View style={styles.shell}>
      <View style={styles.scene}>
        {tab === 'missions' && (missionId == null
          ? <MissionsScreen onOpen={setMissionId} />
          : <MissionDetailScreen id={missionId} onBack={() => setMissionId(null)} />)}
        {tab === 'profile' && <ProfileScreen onLogout={onLogout} />}
      </View>
      <View style={[styles.tabBar, { bottom: Math.max(insets.bottom, 10) }]}>
        {items.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} style={[styles.tab, active && styles.tabOn]} onPress={() => { setMissionId(null); setTab(item.key); }}>
              <Ionicons name={item.icon} color={active ? colors.primary : colors.muted} size={20} />
              <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Vazirmatn_400Regular, Vazirmatn_700Bold });
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const refreshAuth = useCallback(async () => {
    setAuthed(Boolean(await getAccessToken()));
    setReady(true);
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  if (!fontsLoaded || !ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.frame}>
        <View style={styles.phone}>
          <StatusBar style="light" />
          {authed ? (
            <Shell onLogout={() => setAuthed(false)} />
          ) : (
            <LoginScreen onLoggedIn={() => setAuthed(true)} />
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  frame: { flex: 1, backgroundColor: colors.ink, alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.cream },
  shell: { flex: 1 },
  scene: { flex: 1, paddingBottom: 84 },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    flexDirection: 'row',
    padding: 6,
    gap: 6,
  },
  tab: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabOn: { backgroundColor: colors.mist },
  tabLabel: { fontFamily: 'Vazirmatn_700Bold', fontSize: 11, color: colors.muted },
  tabLabelOn: { color: colors.primary },
});
