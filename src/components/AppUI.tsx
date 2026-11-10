import React, { ReactNode } from 'react';
import { KeyboardTypeOptions, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const contentStyle = [
    styles.content,
    {
      paddingHorizontal: compact ? 16 : width < 600 ? 20 : 28,
      paddingTop: width < 600 ? 22 : 30,
      paddingBottom: width < 600 ? 32 : 48,
    },
  ];

  if (scroll) {
    return <ScrollView style={styles.screen} contentContainerStyle={[contentStyle, styles.scrollContent]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>;
  }
  return <View style={styles.screen}><View style={[contentStyle, styles.flexContent]}>{children}</View></View>;
}

export function Header({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 420;

  return (
    <View style={styles.header}>
      {eyebrow ? <View style={styles.eyebrowRow}><View style={styles.eyebrowMark} /><Text style={styles.eyebrow}>{eyebrow}</Text></View> : null}
      <Text style={[styles.title, compact && styles.compactTitle]} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: any }) {
  const { width } = useWindowDimensions();
  return <View style={[styles.card, width < 420 && styles.compactCard, style]}>{children}</View>;
}

export function ActionButton({ title, onPress, secondary = false, disabled = false, icon }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const { width } = useWindowDimensions();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        pressed && !disabled && styles.pressedButton,
        disabled && styles.disabledButton,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={secondary ? colors.ink : '#fff'} style={styles.buttonIcon} /> : null}
      <Text style={[styles.buttonText, width < 420 && styles.compactButtonText, secondary && styles.secondaryButtonText]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  icon,
  rightElement,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  rightElement?: ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'name' | 'password' | 'off';
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: 'done' | 'next' | 'go' | 'send' | 'search';
  onSubmitEditing?: () => void;
  textContentType?: 'emailAddress' | 'password' | 'username' | 'name';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        {icon ? <Ionicons name={icon} size={18} color="#8795a8" style={styles.inputIcon} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8795a8"
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textContentType={textContentType}
          style={styles.input}
        />
        {rightElement}
      </View>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusPresentation: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
    processed: { label: 'Ready', tone: 'success' },
    completed: { label: 'Complete', tone: 'success' },
    uploaded: { label: 'Uploaded', tone: 'info' },
    processing: { label: 'In progress', tone: 'info' },
    in_progress: { label: 'In progress', tone: 'info' },
    submitted: { label: 'Submitted', tone: 'info' },
    under_review: { label: 'Under review', tone: 'warning' },
    pending: { label: 'Pending', tone: 'warning' },
    passed: { label: 'Passed', tone: 'success' },
    rejected: { label: 'Not selected', tone: 'danger' },
    analysis_failed: { label: 'Needs attention', tone: 'danger' },
    evaluation_failed: { label: 'Needs attention', tone: 'danger' },
  };
  const presentation = statusPresentation[status] || {
    label: status.replace(/_/g, ' '),
    tone: 'info' as const,
  };
  let badgeStyle = styles.pendingBadge;
  let textStyle = styles.pendingText;
  if (presentation.tone === 'success') {
    badgeStyle = styles.successBadge;
    textStyle = styles.successText;
  } else if (presentation.tone === 'warning') {
    badgeStyle = styles.warningBadge;
    textStyle = styles.warningText;
  } else if (presentation.tone === 'danger') {
    badgeStyle = styles.dangerBadge;
    textStyle = styles.dangerText;
  }

  return <View style={[styles.badge, badgeStyle]}><Text style={[styles.badgeText, textStyle]}>{presentation.label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center' },
  scrollContent: { flexGrow: 1 },
  flexContent: { flex: 1 },
  header: { marginBottom: 24 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowMark: { width: 18, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 8 },
  compactTitle: { fontSize: 26, lineHeight: 32, marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 620 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 20, marginTop: 14, shadowColor: colors.ink, shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  compactCard: { padding: 16 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 13, paddingHorizontal: 18, minHeight: 48 },
  buttonIcon: { marginRight: 8 },
  primaryButton: { backgroundColor: colors.primary },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pressedButton: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabledButton: { opacity: 0.48 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  compactButtonText: { fontSize: 13, flexShrink: 1, textAlign: 'center' },
  secondaryButtonText: { color: colors.ink },
  fieldWrap: { marginTop: 16 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  inputShell: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbfcfe', borderWidth: 1, borderColor: colors.line, borderRadius: 8, minHeight: 48 },
  inputIcon: { marginLeft: 13 },
  input: { flex: 1, color: colors.ink, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, minHeight: 46 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  badgeText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  successBadge: { backgroundColor: colors.successSoft },
  pendingBadge: { backgroundColor: colors.primarySoft },
  warningBadge: { backgroundColor: colors.warningSoft },
  dangerBadge: { backgroundColor: '#fff0ef' },
  successText: { color: colors.success },
  pendingText: { color: colors.primary },
  warningText: { color: colors.warning },
  dangerText: { color: colors.danger },
});
