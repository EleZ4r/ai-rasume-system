import React, { useContext, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/api';
import { ActionButton, Card, Field, Header, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';

function ConsentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function Register({ navigation }: any) {
  const compact = useWindowDimensions().width < 420;
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!acceptedConsent || submitting) return;
    if (!name.trim() || !email.trim() || !password) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address to continue.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, acceptedConsent);
    } catch (e: any) {
      setError(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      {consentAcknowledged ? (
        <Screen scroll>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.layout, compact && styles.compactLayout]}>
            <View style={[styles.brandRow, compact && styles.compactBrandRow]}>
              <View style={styles.brandIcon}><Ionicons name="sparkles" size={23} color="#a8ccff" /></View>
              <View>
                <Text style={styles.brandName}>Galila</Text>
                <Text style={styles.brandCaption}>AI RESUME WORKSPACE</Text>
              </View>
            </View>

            <View style={[styles.hero, compact && styles.compactHero]}>
              <Text style={styles.eyebrow}>APPLICANT PROFILE</Text>
              <Text style={[styles.title, compact && styles.compactTitle]}>Create your account.</Text>
              <Text style={styles.subtitle}>Build your profile to explore resume insights and relevant job matches.</Text>
            </View>

            <Card style={[styles.card, compact && styles.compactCard]}>
              <View style={styles.formHeading}>
                <View style={styles.formIcon}><Ionicons name="person-add-outline" size={19} color={colors.primary} /></View>
                <View style={styles.formHeadingCopy}>
                  <Text style={styles.formTitle}>Your account details</Text>
                  <Text style={styles.formSubtitle}>Use an email address you can access.</Text>
                </View>
              </View>
              <Field
                label="Full name"
                value={name}
                onChangeText={(value) => { setName(value); setError(null); }}
                placeholder="Your name"
                icon="person-outline"
                autoComplete="name"
                autoCapitalize="words"
                textContentType="name"
                returnKeyType="next"
              />
              <Field
                label="Email address"
                value={email}
                onChangeText={(value) => { setEmail(value); setError(null); }}
                placeholder="you@example.com"
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={(value) => { setPassword(value); setError(null); }}
                placeholder="Create a password"
                icon="lock-closed-outline"
                secureTextEntry={!showPassword}
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
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
                  </Pressable>
                )}
              />
              {error ? (
                <View accessibilityRole="alert" style={styles.error}>
                  <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.consentSummary}>
                <Ionicons name="shield-checkmark-outline" size={17} color={colors.success} />
                <Text style={styles.consentSummaryText}>Privacy consent accepted</Text>
                <Pressable accessibilityRole="button" onPress={() => setConsentAcknowledged(false)} hitSlop={8}>
                  <Text style={styles.reviewLink}>Review</Text>
                </Pressable>
              </View>

              <View style={styles.submit}>
                {submitting ? (
                  <View accessibilityRole="progressbar" style={styles.loading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.loadingText}>Creating your account...</Text>
                  </View>
                ) : (
                  <ActionButton title="Create account" icon="arrow-forward-outline" onPress={submit} disabled={!name.trim() || !email.trim() || !password} />
                )}
              </View>
            </Card>

            <Pressable accessibilityRole="button" onPress={() => navigation.goBack?.()} style={styles.backToLogin}>
              <Text style={styles.backText}>Already have an account?</Text>
              <Text style={styles.backLink}>Sign in</Text>
            </Pressable>
            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#71829a" />
              <Text style={styles.trustText}>Your account and career information stay private.</Text>
            </View>
          </KeyboardAvoidingView>
        </Screen>
      ) : (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalBrandRow}>
                <View style={styles.modalBrandIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} /></View>
                <Text style={styles.modalBrand}>GALILA · PRIVACY</Text>
              </View>
              <Text style={styles.documentTitle}>Your data, your rights.</Text>
              <Text style={styles.compliance}>Data Privacy Consent Form · Republic Act No. 10173</Text>
            </View>

            <ScrollView
              testID="consent-scroll"
              style={styles.documentScroll}
              contentContainerStyle={styles.documentContent}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
                if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 24) {
                  setReadToEnd(true);
                }
              }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
            >
              <Text style={styles.paragraph}>
                This consent form is issued in accordance with Republic Act No. 10173, otherwise known as the Data Privacy Act 2012, and the provisions of the institution&apos;s Data Privacy Manual. By creating an account, you acknowledge your rights under the law and consent to the collection, processing, storage, and sharing of personal and sensitive personal data by the institution for purposes directly related to the AI-Based Resume Analysis and Job Matching System with Skill Extraction and Matching Scoring, including academic, research, and institutional requirements.
              </Text>

              <ConsentSection title="1. Rights of the Data Subject">
                <Text style={styles.paragraph}>
                  The institution is responsible for collecting and processing personal and sensitive personal data to support the AI-Based Resume Analysis and Job Matching System with Skill Extraction and Matching Scoring, facilitate academic and research-related activities, and comply with legal and regulatory obligations. This agreement informs you of the purposes of data processing, establishes its legal basis, and affirms the institution&apos;s commitment to data protection in accordance with applicable laws.
                </Text>
              </ConsentSection>

              <ConsentSection title="2. Scope of Data Collection and Processing">
                <Text style={styles.paragraph}>The institution collects and processes personal data necessary for applying for a job:</Text>
                <Text style={styles.listItem}>Full Name: Identify the applicant</Text>
                <Text style={styles.listItem}>Email/Phone Number: Contact the applicant for interviews or updates</Text>
                <Text style={styles.listItem}>Skills: Compare required job skills</Text>
                <Text style={styles.listItem}>Educational background: Check qualification requirements</Text>
                <Text style={styles.listItem}>Work Experience: Determine relevant experience level</Text>
                <Text style={styles.listItem}>Certification/Training: Verify additional qualification</Text>
                <Text style={styles.listItem}>Match Score: Help companies rank applicants faster</Text>
              </ConsentSection>

              <ConsentSection title="3. Legal Basis for Processing">
                <Text style={styles.paragraph}>
                  The processing of personal and sensitive personal data by the institution is conducted in accordance with the following lawful grounds.
                </Text>
                <Text style={styles.paragraph}>
                  Consent: Your explicit consent is obtained through this agreement, authorizing the collection, processing, and storage of your personal data.
                </Text>
                <Text style={styles.paragraph}>
                  Legitimate Interests: Processing supports the institution&apos;s legitimate objective, such as academic administration, while ensuring that your rights and freedoms are not overridden.
                </Text>
              </ConsentSection>

              <ConsentSection title="4. Retention and Disposal of Data">
                <Text style={styles.paragraph}>
                  The institution retains personal data only for as long as necessary to fulfill the purposes for which it was collected. Academic records are retained indefinitely to facilitate verification, alumni services, and institutional reporting. Financial records are retained indefinitely, in compliance with financial and auditing regulations. Digital data is retained in accordance with institutional policies on IT systems usage and monitoring.
                </Text>
                <Text style={styles.paragraph}>
                  Upon the expiration of these retention periods, personal data is securely disposed of in accordance with institutional procedures. Physical records are shredded or incinerated, while digital records are permanently deleted using secure methods that prevent recovery.
                </Text>
              </ConsentSection>

              <ConsentSection title="5. Rights of the Data Subject">
                <Text style={styles.paragraph}>
                  You are entitled to exercise your rights under the Data Privacy Act of 2012. These include the right to be informed of the purposes and methods of data processing, the right to access your personal data, the right to request corrections to inaccurate or incomplete data, the right to object to data processing under certain circumstances, the right to request the deletion of data no longer necessary for the purposes for which it was collected, the right to obtain your data in a portable format, and the right to file complaints regarding potential violations of your data privacy. Any exercise of these rights must be communicated in writing to the Researchers.
                </Text>
              </ConsentSection>

              <ConsentSection title="6. Data Sharing and Disclosure">
                <Text style={styles.paragraph}>
                  The institution ensures that personal and sensitive personal data is shared only in accordance with the law. Internal sharing of data occurs exclusively for legitimate purposes, such as academic administration, financial management, and IT system maintenance. External sharing is conducted only when required by law, such as compliance with regulatory reporting, or with your explicit consent. Third-party service providers, such as IT vendors or auditors, are bound by confidentiality agreements and required to adhere to data protection standards.
                </Text>
              </ConsentSection>

              <ConsentSection title="7. Security Measures">
                <Text style={styles.paragraph}>
                  The institution implements comprehensive security measures to protect the confidentiality, integrity, and availability of personal and sensitive personal data. Physical records are stored in secure, access-controlled facilities, while digital records are encrypted and safeguarded through firewalls, secure authentication systems, and regular monitoring. All personnel handling personal data receive regular training on data privacy and security, and periodic audits are conducted to ensure compliance with institutional policies and the Data Privacy Act.
                </Text>
              </ConsentSection>

              <ConsentSection title="8. Responsibilities of the Institution">
                <Text style={styles.paragraph}>
                  The institution is committed to ensuring the ethical and lawful handling of personal and sensitive personal data. This includes maintaining accurate and secure records, implementing policies to protect data from unauthorized access, and reviewing data management practices regularly to comply with evolving legal requirements and institutional standards.
                </Text>
              </ConsentSection>

              <ConsentSection title="Consent and Agreement">
                <Text style={styles.paragraph}>
                  By signing this agreement, you acknowledge that you have read and understood the terms herein and consent to the lawful collection, processing, storage, and use of your personal data.
                </Text>
              </ConsentSection>

              <ConsentSection title="For inquiries, contact:">
                <Text style={styles.paragraph}>Galileo U. Garcia</Text>
                <Text style={styles.paragraph}>garciagu.485.stud@cdd.edu.ph</Text>
                <Text style={styles.paragraph}>09614783495</Text>
              </ConsentSection>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.readStatus}>
                <View style={[styles.readStatusDot, readToEnd && styles.readStatusComplete]} />
                <Text style={styles.readStatusText}>{readToEnd ? 'You reached the end of the agreement' : 'Review the agreement before continuing'}</Text>
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedConsent, disabled: !readToEnd }}
                disabled={!readToEnd}
                onPress={() => setAcceptedConsent((current) => !current)}
                style={[styles.consentToggle, !readToEnd && styles.disabledConsent]}
              >
                <Ionicons
                  name={acceptedConsent ? 'checkbox' : 'square-outline'}
                  size={23}
                  color={acceptedConsent ? colors.primary : colors.muted}
                />
                <Text style={styles.consentLabel}>
                  I have read and understood this form, and I consent to the collection, processing, storage, and use of my personal data as described above.
                </Text>
              </Pressable>
              <View style={styles.submitButton}>
                <ActionButton title="Accept and continue" icon="arrow-forward-outline" onPress={() => setConsentAcknowledged(true)} disabled={!readToEnd || !acceptedConsent} />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  layout: { width: '100%', maxWidth: 480, alignSelf: 'center', marginVertical: 22 },
  compactLayout: { marginVertical: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 30 },
  compactBrandRow: { marginBottom: 20 },
  brandIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  brandCaption: { color: '#8795a8', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  hero: { marginBottom: 22 },
  compactHero: { marginBottom: 18 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.15 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 39, fontWeight: '800', marginTop: 7 },
  compactTitle: { fontSize: 29, lineHeight: 35 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  card: { marginTop: 0, borderRadius: 18, padding: 22 },
  compactCard: { padding: 16 },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  formIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  formHeadingCopy: { flex: 1 },
  formTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  formSubtitle: { color: '#71819a', fontSize: 12, marginTop: 3 },
  passwordToggle: { padding: 12 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#fff3f2', borderWidth: 1, borderColor: '#f4cfcc', borderRadius: 10, padding: 12, marginTop: 16 },
  errorText: { flex: 1, color: '#a22b24', fontSize: 13, lineHeight: 19 },
  consentSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  consentSummaryText: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: '700' },
  reviewLink: { color: colors.primary, fontSize: 12, fontWeight: '800', paddingVertical: 5 },
  submit: { marginTop: 20 },
  loading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  backToLogin: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 18, padding: 8 },
  backText: { color: colors.muted, fontSize: 13 },
  backLink: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 15 },
  trustText: { color: '#71819a', fontSize: 11 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(12, 22, 35, 0.72)' },
  modalPanel: { width: '100%', maxWidth: 680, height: '92%', maxHeight: 820, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', elevation: 12, shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
  modalHeader: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#fbfcfe' },
  modalBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalBrandIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  modalBrand: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  documentScroll: { flex: 1 },
  documentContent: { paddingHorizontal: 22, paddingVertical: 14 },
  modalFooter: { paddingHorizontal: 22, paddingTop: 13, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fbfcfe' },
  readStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  readStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  readStatusComplete: { backgroundColor: colors.success },
  readStatusText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  documentTitle: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800' },
  compliance: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  section: { marginTop: 16 },
  sectionTitle: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '800', marginBottom: 6 },
  paragraph: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  listItem: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, marginLeft: 8 },
  consentToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  disabledConsent: { opacity: 0.58 },
  consentLabel: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 21 },
  submitButton: { marginTop: 18 },
});
