import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { applyToJob, getApiErrorMessage, getJobRecommendations, startMockInterview } from '../../services/api';
import { colors } from '../../constants/theme';

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  employment_type: string;
  description: string;
  required_skills: string[];
  matched_skills: string[];
  match_score: number;
  application?: { id: number; status: string; mock_interviews?: Array<{ id: number; status: string }> } | null;
};

const modernStyles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { maxWidth: 1040, paddingHorizontal: 22, paddingTop: 30 },
  skillBand: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 8 },
  skill: { backgroundColor: colors.accentSoft, borderRadius: 6 },
  skillText: { color: colors.accent },
  job: { borderColor: colors.line, borderRadius: 8, padding: 20, marginTop: 12, shadowColor: colors.ink, shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  jobTitle: { color: colors.ink, fontSize: 19 },
  company: { color: colors.muted },
  match: { backgroundColor: colors.accentSoft, minWidth: 68, borderRadius: 8 },
  matchNumber: { color: colors.accent },
  matchLabel: { color: colors.accent },
  refresh: { borderRadius: 8, minHeight: 40, justifyContent: 'center' },
  apply: { borderRadius: 8, minHeight: 48, justifyContent: 'center' },
  back: { borderRadius: 8 },
});

export default function JobRecommendations({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const { resumeId } = route.params;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [verifiedSkills, setVerifiedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyJobId, setBusyJobId] = useState<number | null>(null);
  const [busyPhase, setBusyPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getJobRecommendations(resumeId);
      setJobs(Array.isArray(result.jobs) ? result.jobs : []);
      setVerifiedSkills(Array.isArray(result.verified_skills) ? result.verified_skills : []);
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [resumeId]);

  const beginInterview = async (job: Job) => {
    setBusyJobId(job.id);
    setBusyPhase(job.application ? 'Generating interview questions...' : 'Submitting application...');
    setError(null);
    try {
      let application = job.application;
      if (!application) {
        application = await applyToJob(resumeId, job.id);
        setBusyPhase('Generating interview questions...');
      }
      if (!application?.id) {
        throw new Error('The application could not be confirmed. Please try again.');
      }
      const interview = await startMockInterview(application.id);
      setBusyPhase('Opening your interview...');
      navigation.navigate('MockInterview', { interviewId: interview.id });
    } catch (requestError: any) {
      await load();
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyJobId(null);
      setBusyPhase(null);
    }
  };

  if (loading) {
    return <View style={[styles.centered, modernStyles.page]}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Finding jobs that match your verified skills...</Text></View>;
  }

  return (
    <ScrollView
      style={[styles.page, modernStyles.page]}
      contentContainerStyle={[styles.content, modernStyles.content, { paddingHorizontal: width < 420 ? 16 : 22, paddingTop: width < 600 ? 22 : 30, paddingBottom: width < 600 ? 32 : 48 }]}
    >
      <View style={styles.topBar}>
        <View style={styles.headingCopy}><Text style={styles.eyebrow}>VERIFIED SKILL MATCHES</Text><Text style={[styles.title, width < 420 && styles.compactTitle]}>Recommended jobs</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh recommendations" onPress={load} style={[styles.refresh, modernStyles.refresh]}><Ionicons name="refresh-outline" size={16} color={colors.primary} /><Text style={styles.refreshText}>Refresh</Text></Pressable>
      </View>
      <Text style={styles.intro}>Recommendations are matched to skills confirmed in your assessment.</Text>

      <View style={[styles.skillBand, modernStyles.skillBand]}>
        <Text style={styles.label}>VERIFIED SKILLS</Text>
        <View style={styles.skills}>{verifiedSkills.map((skill) => <View key={skill} style={[styles.skill, modernStyles.skill]}><Text style={[styles.skillText, modernStyles.skillText]}>{skill}</Text></View>)}</View>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      {jobs.length === 0 ? <View style={styles.empty}><Text style={styles.jobTitle}>No close matches yet</Text><Text style={styles.muted}>Your verified skills did not match the current openings. More listings may be added later.</Text></View> : jobs.map((job) => (
          <View key={job.id} style={[styles.job, modernStyles.job]}>
          <View style={styles.jobHeader}>
            <View style={styles.jobHeading}><Text style={styles.jobTitle}>{job.title}</Text><Text style={styles.company}>{job.company} · {job.location}</Text></View>
            <View style={[styles.match, modernStyles.match]}><Text style={[styles.matchNumber, modernStyles.matchNumber]}>{job.match_score}%</Text><Text style={[styles.matchLabel, modernStyles.matchLabel]}>match</Text></View>
          </View>
          <Text style={styles.meta}>{job.employment_type}</Text>
          <Text style={styles.description}>{job.description}</Text>
          <Text style={styles.label}>MATCHED SKILLS</Text>
          <View style={styles.skills}>{job.matched_skills.map((skill) => <View key={skill} style={[styles.matchedSkill, modernStyles.skill]}><Text style={[styles.matchedSkillText, modernStyles.skillText]}>{skill}</Text></View>)}</View>
          <Text style={styles.required}>Also requested: {job.required_skills.filter((skill) => !job.matched_skills.includes(skill)).join(', ') || 'All required skills verified'}</Text>
          <Pressable accessibilityRole="button" style={[styles.apply, modernStyles.apply]} disabled={busyJobId !== null} onPress={() => beginInterview(job)}>
            <Text style={styles.applyText}>{busyJobId === job.id ? busyPhase : job.application ? job.application.mock_interviews?.some((interview) => interview.status === 'in_progress') ? 'Continue mock interview' : 'Retry mock interview' : 'Apply and start mock interview'}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable accessibilityRole="button" style={[styles.back, modernStyles.back]} onPress={() => navigation.goBack()}><Text style={styles.backText}>Back to resume analysis</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f7fb' }, content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 22, paddingBottom: 48 }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f4f7fb' },     topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }, headingCopy: { flex: 1, minWidth: 0 }, eyebrow: { color: '#1677ff', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { color: '#12233f', fontSize: 28, fontWeight: '800', marginTop: 5 }, compactTitle: { fontSize: 24 }, intro: { color: '#52627a', fontSize: 14, lineHeight: 21, marginTop: 8 }, refresh: { borderWidth: 1, borderColor: '#ccd6e5', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 13, paddingVertical: 9 }, refreshText: { color: '#29415f', fontWeight: '700' }, skillBand: { backgroundColor: '#12233f', padding: 16, borderRadius: 8, marginTop: 18 }, label: { color: '#8499b4', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 12, marginBottom: 7 }, skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }, skill: { backgroundColor: '#243d5e', borderRadius: 4, paddingHorizontal: 9, paddingVertical: 5 }, skillText: { color: '#e6effb', fontSize: 12, fontWeight: '700' }, job: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e7ef', borderRadius: 8, padding: 17, marginTop: 12 }, jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }, jobHeading: { flex: 1, minWidth: 0 }, jobTitle: { color: '#12233f', fontSize: 18, lineHeight: 24, fontWeight: '800' }, company: { color: '#52627a', fontSize: 13, marginTop: 4 }, match: { minWidth: 58, alignItems: 'center', backgroundColor: '#e5f5eb', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 }, matchNumber: { color: '#167044', fontSize: 18, fontWeight: '800' }, matchLabel: { color: '#167044', fontSize: 10, fontWeight: '700' }, meta: { color: '#1677ff', fontSize: 12, fontWeight: '700', marginTop: 12 }, description: { color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 7 }, matchedSkill: { backgroundColor: '#e5f5eb', borderRadius: 4, paddingHorizontal: 9, paddingVertical: 5 }, matchedSkillText: { color: '#167044', fontSize: 12, fontWeight: '700' }, required: { color: '#8795a8', fontSize: 11, lineHeight: 17, marginTop: 9 }, apply: { alignItems: 'center', backgroundColor: '#1677ff', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 14, marginTop: 15 }, applyText: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' }, error: { borderWidth: 1, borderColor: '#f3c6c4', backgroundColor: '#fff5f4', borderRadius: 6, padding: 12, marginTop: 14 }, errorText: { color: '#a22b24', fontSize: 13 }, empty: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e7ef', borderRadius: 8, padding: 18, marginTop: 14 }, muted: { color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 8 }, back: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 10, paddingHorizontal: 4 }, backText: { color: '#29415f', fontSize: 13, fontWeight: '700' },
});
