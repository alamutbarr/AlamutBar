import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from './theme';

export function BrandMark() {
  return (
    <Svg width={36} height={36} viewBox="0 0 40 40" fill="none">
      <Path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" stroke="#F7F6F0" strokeWidth={1.6} strokeLinejoin="bevel" />
      <Path d="M5 28.5h30M12 21l4.6 7.5M24.4 20l5.6 8.5" stroke="#F7F6F0" strokeWidth={1.6} />
    </Svg>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <BrandMark />
      <View style={styles.headerText}>
        <Text style={styles.word}>ALAMUT</Text>
        <Text style={styles.sub}>{subtitle || title}</Text>
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'gold' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, styles[tone], disabled && styles.disabled]}>
      <Text style={[styles.buttonText, tone === 'ghost' && styles.ghostText, tone === 'gold' && styles.goldText, tone === 'danger' && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: { flex: 1 },
  word: { color: colors.cream, fontFamily: 'Vazirmatn_700Bold', letterSpacing: 1.4, fontSize: 15, textAlign: 'right' },
  sub: { color: 'rgba(247,246,240,0.82)', fontFamily: 'Vazirmatn_400Regular', fontSize: 12, textAlign: 'right' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6,
  },
  button: { minHeight: 48, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.primary },
  gold: { backgroundColor: colors.gold },
  ghost: { backgroundColor: colors.mist },
  danger: { backgroundColor: '#FDECEB' },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.cream, fontFamily: 'Vazirmatn_700Bold', fontSize: 15 },
  ghostText: { color: colors.primary },
  goldText: { color: colors.ink },
  dangerText: { color: colors.crit },
});
