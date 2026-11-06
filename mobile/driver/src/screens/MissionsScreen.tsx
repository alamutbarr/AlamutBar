import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Card, Header } from '../ui';
import { colors, radius } from '../theme';
import { Mission, STATUS_LABEL } from '../types';

type Props = { onOpen: (id: number) => void };

export function MissionsScreen({ onOpen }: Props) {
  const [rows, setRows] = useState<Mission[]>([]);
  const [tab, setTab] = useState<'offers' | 'active' | 'done'>('offers');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<{ missions: Mission[] }>('/api/v1/driver/missions?scope=open');
      setRows(data.missions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = rows.filter((row) => {
    if (tab === 'offers') return !row.mine && row.status === 'Offered';
    if (tab === 'done') return row.mine && (row.status === 'Completed' || row.status === 'Cancelled');
    return row.mine && row.status !== 'Completed' && row.status !== 'Cancelled';
  });

  return (
    <View style={styles.page}>
      <Header title="مأموریت‌ها" subtitle="پنل راننده" />
      <View style={styles.tabs}>
        {([['offers', 'پیشنهادها'], ['active', 'فعال'], ['done', 'سوابق']] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<Text style={styles.empty}>مأموریتی در این فهرست نیست.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.id)}>
            <Card>
              <View style={styles.row}>
                <Text style={styles.code}>{item.trackingCode}</Text>
                <Text style={styles.badge}>{STATUS_LABEL[item.status] || item.status}</Text>
              </View>
              <Text style={styles.route}>{item.origin.city || '—'} ← {item.destination.city || '—'}</Text>
              <Text style={styles.meta}>{item.cargo.type || 'بار'}{item.cargo.weightKg ? ` · ${item.cargo.weightKg} کیلو` : ''}</Text>
              {item.price != null ? <Text style={styles.price}>{item.price.toLocaleString('fa-IR')} ریال</Text> : null}
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { flex: 1, borderRadius: radius.control, backgroundColor: colors.white, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.mist },
  tabText: { fontFamily: 'Vazirmatn_700Bold', color: colors.muted, fontSize: 13 },
  tabTextOn: { color: colors.primary },
  list: { padding: 12, gap: 10, paddingBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontFamily: 'Vazirmatn_700Bold', color: colors.ink },
  badge: { backgroundColor: colors.mist, color: colors.primary, overflow: 'hidden', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, fontFamily: 'Vazirmatn_700Bold', fontSize: 12 },
  route: { fontFamily: 'Vazirmatn_700Bold', fontSize: 16, color: colors.ink, textAlign: 'right' },
  meta: { fontFamily: 'Vazirmatn_400Regular', color: colors.muted, textAlign: 'right' },
  price: { fontFamily: 'Vazirmatn_700Bold', color: colors.secondary, textAlign: 'right' },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: 'Vazirmatn_400Regular', marginTop: 32 },
  error: { color: colors.crit, textAlign: 'right', paddingHorizontal: 16, fontFamily: 'Vazirmatn_400Regular' },
});
