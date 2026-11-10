import React, { useContext, useState } from 'react';
import { View, Text, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/api';
import { ActionButton, Card, Field, Screen } from '../../components/AppUI';

export default function Login({ navigation }: any) {
  const compact = useWindowDimensions().width < 420;
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.layout, compact && styles.compactLayout]}>
        <View style={[styles.brandRow, compact && styles.compactBrandRow]}>
          <View style={styles.brandIcon}><Ionicons name="sparkles" size={24} color="#a8ccff" /></View>
          <View>
            <Text style={styles.brandName}>GAlila</Text>
            <Text style={styles.brandCaption}>AI RESUME WORKSPACE</Text>
          </View>
        </View>

        <View style={[styles.hero, compact && styles.compactHero]}>
          <Text style={styles.eyebrow}>YOUR NEXT STEP STARTS HERE</Text>
          <Text style={[styles.title, compact && styles.compactTitle]}>Welcome back.</Text>
          <Text style={styles.subtitle}>Sign in to continue building confidence in your career journey.</Text>
        </View>

        <Card style={[styles.formCard, compact && styles.compactFormCard]}>
          <View style={styles.formHeading}>
            <View style={styles.formIcon}><Ionicons name="lock-closed-outline" size={19} color="#1677ff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Sign in to your account</Text>
              <Text style={styles.formSubtitle}>Your progress is right where you left it.</Text>
            </View>
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={(value) => { setEmail(value); setError(null); }}
            placeholder="you@example.com"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="next"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(value) => { setPassword(value); setError(null); }}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            icon="lock-closed-outline"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            rightElement={(
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityState={{ expanded: showPassword }}
                onPress={() => setShowPassword((visible) => !visible)}
                hitSlop={10}
                style={styles.passwordToggle}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#52627a" />
              </Pressable>
            )}
          />
          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <Ionicons name="alert-circle-outline" size={19} color="#b42318" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <View style={styles.submit}>
            {submitting ? (
              <View accessibilityRole="progressbar" style={styles.loading}>
                <ActivityIndicator color="#1677ff" />
                <Text style={styles.loadingText}>Signing you in...</Text>
              </View>
            ) : (
              <ActionButton title="Sign in" icon="arrow-forward-outline" onPress={submit} disabled={!email.trim() || !password} />
            )}
          </View>

          <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>NEW HERE?</Text><View style={styles.dividerLine} /></View>
          <ActionButton title="Create an applicant account" icon="person-add-outline" secondary onPress={() => navigation.navigate('Register')} />
          <Text style={styles.accountNote}>Staff accounts use the same secure sign-in.</Text>
        </Card>

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#71829a" />
          <Text style={styles.trustText}>Your account and career information stay private.</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles: Record<string, any> = {
  layout: { width: '100%', maxWidth: 480, alignSelf: 'center', marginVertical: 22 },
  compactLayout: { marginVertical: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 30 },
  compactBrandRow: { marginBottom: 20 },
  brandIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#12233f', alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#12233f', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  brandCaption: { color: '#8795a8', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  hero: { marginBottom: 22 },
  compactHero: { marginBottom: 18 },
  eyebrow: { color: '#1677ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.15 },
  title: { color: '#12233f', fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, marginTop: 7 },
  compactTitle: { fontSize: 30, lineHeight: 36 },
  subtitle: { color: '#52627a', fontSize: 15, lineHeight: 22, marginTop: 8 },
  formCard: { marginTop: 0, borderRadius: 19, padding: 22 },
  compactFormCard: { padding: 16 },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  formIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#e7f1ff', alignItems: 'center', justifyContent: 'center' },
  formTitle: { color: '#12233f', fontSize: 17, fontWeight: '800' },
  formSubtitle: { color: '#71819a', fontSize: 12, marginTop: 3 },
  passwordToggle: { padding: 12 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#fff3f2', borderWidth: 1, borderColor: '#f4cfcc', borderRadius: 10, padding: 12, marginTop: 16 },
  errorText: { flex: 1, color: '#a22b24', fontSize: 13, lineHeight: 19 },
  submit: { marginTop: 22 },
  loading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#52627a', fontSize: 13, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 23, marginBottom: 15 },
  dividerLine: { height: 1, backgroundColor: '#edf1f6', flex: 1 },
  dividerText: { color: '#9aa7b8', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  accountNote: { color: '#8795a8', fontSize: 11, textAlign: 'center', marginTop: 12 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 17 },
  trustText: { color: '#71819a', fontSize: 11 },
};
