import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { getApiErrorMessage, listUserResumes } from '../../services/api';
import { ActionButton, Card, Header, Screen, StatusBadge } from '../../components/AppUI';
import { colors } from '../../constants/theme';

export default function Dashboard({ navigation }: any) {
  const { user, logout } = useContext(AuthContext);
  const isReviewer = Boolean(user?.is_admin || user?.is_hr);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await listUserResumes();
      setResumes(Array.isArray(result) ? result : []);
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isReviewer) {
      setLoading(false);
      return;
    }
    load();
  }, [load, isReviewer]);

  const latestAnalysis = (resume: any) => {
    const analyses = resume.resume_analyses;
    return Array.isArray(analyses) ? analyses[analyses.length - 1] : null;
  };

  const resumeProgress = (status: string) => {
    if (status === 'processed') return 'Your review is ready. Open it to see your feedback and next steps.';
    if (status === 'analysis_failed') return 'We could not finish this review. Open the analysis page to retry.';
    if (status === 'processing') return 'We are reviewing your resume now. Your results will appear here.';
    return 'Your file is saved. We are getting your review ready.';
  };

  if (isReviewer) {
    return (
      <Screen scroll>
        <Header eyebrow={user?.is_admin ? 'ADMINISTRATOR' : 'HUMAN RESOURCES'} title="Review workspace" subtitle={`Signed in as ${user?.name || 'Reviewer'}`} />
        <Card style={{ marginTop: 0 }}>
          <Text style={{ color: '#12233f', fontSize: 18, fontWeight: '800' }}>Mock interviews</Text>
          <Text style={{ color: '#52627a', lineHeight: 20, marginTop: 5 }}>Listen to applicant recordings, review evaluations, and record pass/reject decisions.</Text>
          <View style={{ marginTop: 14 }}><ActionButton title="Open interview reviews" icon="mic-outline" onPress={() => navigation.navigate('AdminMockInterviews')} /></View>
        </Card>
        <Card>
          <Text style={{ color: '#12233f', fontSize: 18, fontWeight: '800' }}>Applicant resumes</Text>
          <Text style={{ color: '#52627a', lineHeight: 20, marginTop: 5 }}>Review uploaded resumes and AI resume analysis.</Text>
          <View style={{ marginTop: 14 }}><ActionButton title="Open resume reviews" icon="documents-outline" secondary onPress={() => navigation.navigate('AdminResumes')} /></View>
        </Card>
        <Card>
          <Text style={{ color: '#12233f', fontSize: 18, fontWeight: '800' }}>Job listings</Text>
          <Text style={{ color: '#52627a', lineHeight: 20, marginTop: 5 }}>Add positions and the skills used to match applicants.</Text>
          <View style={{ marginTop: 14 }}><ActionButton title="Manage job listings" icon="briefcase-outline" secondary onPress={() => navigation.navigate('AdminJobs')} /></View>
        </Card>
        <View style={{ marginTop: 14 }}><ActionButton title="Sign out" icon="log-out-outline" secondary onPress={() => logout()} /></View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fb', padding: 24 }}>
        <ActivityIndicator color="#1677ff" />
        <Text style={{ marginTop: 12, color: '#52627a' }}>Loading your resumes...</Text>
      </View>
    );
  }

  return (
    <Screen>
      <Header eyebrow="YOUR CAREER WORKSPACE" title={`Welcome${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`} subtitle="Build confidence in your next career move, one step at a time." />
      <Card style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name={resumes.length ? 'sparkles-outline' : 'document-text-outline'} size={22} color="#bcd8ff" /></View>
        <Text style={styles.heroEyebrow}>{resumes.length ? 'YOUR RESUME JOURNEY' : 'A GOOD PLACE TO START'}</Text>
        <Text style={styles.heroTitle}>{resumes.length ? 'Make your next application count.' : 'Get more from your resume.'}</Text>
        <Text style={styles.heroDescription}>
          {resumes.length
            ? 'Get a focused review, verify your skills, and discover roles that fit your experience.'
            : 'Upload one PDF resume to get personalized feedback, skill verification, and job recommendations.'}
        </Text>
        <View style={styles.heroButton}>
          <ActionButton
            title={resumes.length ? 'View my resume progress' : 'Get started'}
            icon={resumes.length ? 'arrow-down-outline' : 'arrow-forward-outline'}
            onPress={() => resumes.length
              ? navigation.navigate('ResumeAnalysis', { resumeId: resumes[0].id })
              : navigation.navigate('Upload')}
          />
        </View>
      </Card>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Your resume</Text>
        <Text style={styles.sectionHint}>{resumes.length ? '1 submitted' : 'One resume per applicant'}</Text>
      </View>
      {isReviewer ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Reviewer workspace</Text>
          <Text style={styles.emptyDescription}>Applicant resume tools are available in the review workspace.</Text>
          <View style={{ marginTop: 14 }}><ActionButton title={user?.is_admin ? 'Open admin dashboard' : 'Review mock interviews'} icon="shield-checkmark-outline" secondary onPress={() => navigation.navigate(user?.is_admin ? 'AdminResumes' : 'AdminMockInterviews')} /></View>
        </Card>
      ) : null}

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.emptyTitle}>Could not load your resume</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <ActionButton title="Try again" onPress={() => load()} />
        </Card>
      ) : resumes.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="cloud-upload-outline" size={23} color="#1677ff" /></View>
          <Text style={styles.emptyTitle}>Your next step starts here</Text>
          <Text style={styles.emptyDescription}>Submit a PDF resume to receive your personalized review and skill verification.</Text>
          <View style={{ marginTop: 16 }}><ActionButton title="Upload your resume" icon="cloud-upload-outline" onPress={() => navigation.navigate('Upload')} /></View>
        </Card>
      ) : (
        <FlatList
          style={styles.resumeList}
          contentContainerStyle={{ paddingBottom: 24 }}
          data={resumes.slice(0, 1)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1677ff" colors={['#1677ff']} />}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const analysis = latestAnalysis(item);
            return (
              <Card style={styles.resumeCard}>
                <View style={styles.fileIcon}><Ionicons name="document-text-outline" size={22} color="#1677ff" /></View>
                <View style={styles.resumeDetails}>
                  <Text style={styles.resumeLabel}>CURRENT SUBMISSION</Text>
                  <Text style={styles.resumeName} numberOfLines={2}>{item.filename}</Text>
                  <StatusBadge status={item.status} />
                  <Text style={styles.resumeProgress}>{resumeProgress(item.status)}</Text>
                  {analysis?.score != null ? (
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Resume score</Text>
                      <Text style={styles.score}>{analysis.score}<Text style={styles.scoreOutOf}> / 100</Text></Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.resumeActions}>
                  <ActionButton title="View review" icon="arrow-forward-outline" onPress={() => navigation.navigate('ResumeAnalysis', { resumeId: item.id })} />
                  <View style={{ marginTop: 9 }}><ActionButton title="Replace PDF" icon="sync-outline" secondary onPress={() => navigation.navigate('Upload')} /></View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles: Record<string, any> = {
  hero: { marginTop: 0, padding: 24, backgroundColor: colors.ink, borderColor: colors.ink, borderRadius: 8 },
  heroIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#203c62', alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { color: '#9db5d3', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 17 },
  heroTitle: { color: '#fff', fontSize: 23, lineHeight: 29, fontWeight: '800', marginTop: 6 },
  heroDescription: { color: '#d7e4f5', fontSize: 14, lineHeight: 21, marginTop: 7 },
  heroButton: { marginTop: 17 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 1 },
  sectionTitle: { color: '#12233f', fontSize: 18, fontWeight: '800' },
  sectionHint: { color: '#70819a', fontSize: 12, fontWeight: '600' },
  emptyCard: { alignItems: 'flex-start' },
  emptyIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: '#12233f', fontSize: 17, lineHeight: 23, fontWeight: '800' },
  emptyDescription: { color: '#52627a', fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 12 },
  errorCard: { borderColor: '#f1c9c6', backgroundColor: '#fffafa' },
  resumeList: { marginTop: 12 },
  resumeCard: { marginTop: 0, padding: 18, borderRadius: 8 },
  fileIcon: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  resumeDetails: { width: '100%' },
  resumeLabel: { color: '#8795a8', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  resumeName: { color: '#12233f', fontSize: 17, lineHeight: 23, fontWeight: '800', marginTop: 5 },
  resumeProgress: { color: '#52627a', fontSize: 13, lineHeight: 19, marginTop: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#edf1f6', marginTop: 16, paddingTop: 13 },
  scoreLabel: { color: '#52627a', fontSize: 13, fontWeight: '600' },
  score: { color: '#167044', fontSize: 20, fontWeight: '800' },
  scoreOutOf: { color: '#8795a8', fontSize: 12, fontWeight: '600' },
  resumeActions: { width: '100%', marginTop: 16 },
};
