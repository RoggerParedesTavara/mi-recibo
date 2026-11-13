import React, { type PropsWithChildren } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';

export function Page({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppText({
  children,
  size = 16,
  weight = 'regular',
  color = colors.text,
  style,
}: PropsWithChildren<{ size?: number; weight?: 'regular' | 'medium' | 'bold'; color?: string; style?: object }>) {
  return <Text style={[{ color, fontSize: size }, textWeightStyles[weight], style]}>{children}</Text>;
}

const textWeightStyles = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  bold: { fontWeight: '700' as const },
};

export function Header({
  title,
  subtitle,
  backLabel,
  onBack,
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
          <AppText size={14} color={colors.primary} weight="medium">‹ {backLabel ?? 'Volver'}</AppText>
        </Pressable>
      ) : null}
      <AppText size={27} weight="bold" style={styles.headerTitle}>{title}</AppText>
      {subtitle ? <AppText color={colors.muted}>{subtitle}</AppText> : null}
    </View>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <AppText size={19} weight="bold" style={styles.sectionTitle}>{children}</AppText>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <AppText color={colors.surface} weight="bold">{title}</AppText>
    </Pressable>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <AppText size={13} weight="medium" color={colors.muted}>{label}</AppText>
      <TextInput
        placeholderTextColor="#A8958C"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function StatusPill({ title, paid = false }: { title: string; paid?: boolean }) {
  return (
    <View style={[styles.pill, paid ? styles.paid : styles.pending]}>
      <AppText size={12} weight="bold" color={paid ? colors.surface : '#715C52'}>{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36, gap: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 },
  header: { gap: 5, marginTop: 10, marginBottom: 8 },
  headerTitle: { marginTop: 9 },
  sectionTitle: { marginTop: 6, marginBottom: 2 },
  button: { minHeight: 50, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  fieldWrap: { gap: 7 },
  input: { minHeight: 48, borderColor: colors.border, borderWidth: 1, borderRadius: 12, backgroundColor: colors.background, paddingHorizontal: 13, color: colors.text, fontSize: 16 },
  pill: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, alignSelf: 'flex-start' },
  paid: { backgroundColor: colors.primary },
  pending: { backgroundColor: colors.soft },
});
