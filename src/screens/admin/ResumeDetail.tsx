import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminResume, getApiErrorMessage } from '../../services/api';
import { ActionButton, Card, Header, Screen, StatusBadge } from '../../components/AppUI';
import { colors } from '../../constants/theme';

export default function ResumeDetail({ route, navigation }: any) {
  const { resumeId } = route.params;
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminResume(resumeId);
      setResume(res);
      setError(null);
    } catch (e: any) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !resume) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fb' }}><ActivityIndicator color="#1677ff" /><Text>Loading resume...</Text></View>
  );

  if (error && !resume) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#f4f7fb' }}>
      <Text>Could not load this resume.</Text>
      <Text style={{ marginVertical: 12 }}>{error}</Text>
      <ActionButton title="Try again" onPress={load} />
    </View>
  );

  return (
    <Screen scroll>
      <View style={styles.backButton}><ActionButton title="Back to resumes" secondary icon="arrow-back-outline" onPress={() => navigation.goBack()} /></View>
      <Header eyebrow="ADMINISTRATOR" title="Resume detail" subtitle={`Uploaded by ${resume?.user?.name || 'Unknown applicant'}`} />
      <Card style={styles.summaryCard}>
        <View style={styles.documentIcon}><Ionicons name="document-text-outline" size={21} color={colors.primary} /></View>
        <View style={styles.summaryCopy}>
          <Text style={styles.overline}>APPLICANT RESUME</Text>
          <Text style={styles.filename} numberOfLines={2}>{resume?.filename}</Text>
          <Text style={styles.applicant}>{resume?.user?.name || 'Unknown applicant'} · {resume?.user?.email || 'No email available'}</Text>
        </View>
        <StatusBadge status={resume?.status || 'unknown'} />
      </Card>
      <Card>
        <View style={styles.sectionHeading}><Ionicons name="reader-outline" size={18} color={colors.accent} /><Text style={styles.sectionTitle}>Extracted text</Text></View>
        <Text style={styles.body}>{resume?.text || 'No extracted text available'}</Text>
      </Card>
      <Card>
        <View style={styles.sectionHeading}><Ionicons name="analytics-outline" size={18} color={colors.accent} /><Text style={styles.sectionTitle}>Analysis results</Text></View>
        {resume?.resume_analyses?.length ? resume.resume_analyses.map((analysis: any, index: number) => (
          <View key={analysis.id || index} style={styles.analysis}>
            <View style={styles.analysisHeader}>
              <Text style={styles.analysisTitle}>Review {index + 1}</Text>
              <View style={styles.score}><Text style={styles.scoreValue}>{analysis.score ?? analysis.overall_score ?? '--'}</Text><Text style={styles.scoreCaption}>/ 100</Text></View>
            </View>
            <Text style={styles.body}>{analysis.reviewer_basis || 'No reviewer basis available.'}</Text>
            <AnalysisList title="Strengths" items={analysis.strengths} />
            <AnalysisList title="Areas to improve" items={analysis.weaknesses} />
            <AnalysisList title="Suggestions" items={analysis.suggestions} />
            <Text style={styles.questionCount}>{Array.isArray(analysis.verification_questions) ? analysis.verification_questions.length : 0} verification questions</Text>
          </View>
        )) : <Text style={styles.body}>No analyses are available for this resume yet.</Text>}
      </Card>
    </Screen>
  );
}

function AnalysisList({ title, items }: { title: string; items?: unknown }) {
  const values = Array.isArray(items) ? items : [];
  return (
    <View style={styles.listSection}>
      <Text style={styles.listTitle}>{title}</Text>
      {values.length ? values.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.listItem}>
          <View style={styles.bullet} />
          <Text style={styles.body}>{typeof item === 'string' ? item : JSON.stringify(item)}</Text>
        </View>
      )) : <Text style={styles.emptyText}>None reported.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: 'flex-start', marginBottom: 4 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 0 },
  documentIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primarySoft },
  summaryCopy: { flex: 1, minWidth: 0 },
  overline: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  filename: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  applicant: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  analysis: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 15, marginTop: 14 },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  analysisTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  scoreValue: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  scoreCaption: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  listSection: { marginTop: 13 },
  listTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 5 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginTop: 7 },
  emptyText: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  questionCount: { color: colors.muted, fontSize: 11, marginTop: 14 },
});
