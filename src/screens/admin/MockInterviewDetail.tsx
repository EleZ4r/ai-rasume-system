import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { decideAdminInterview, getAdminInterview, getApiErrorMessage, resolveAdminInterviewAudioUrl } from '../../services/api';
import { ActionButton, Card, Header, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';

export default function MockInterviewDetail({ route, navigation }: any) {
  const { interviewId } = route.params;
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getAdminInterview(interviewId);
      setInterview(result);
      setNote(result.review_note || '');
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [interviewId]);

  const decide = async (decision: 'passed' | 'rejected') => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await decideAdminInterview(interviewId, decision, note);
      setMessage(decision === 'passed' ? 'Applicant marked as passed.' : 'Applicant marked as rejected.');
      await load();
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !interview) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#1677ff" /><Text>Loading interview review...</Text></View>;
  if (!interview) return <Screen><Header eyebrow="HR / ADMIN REVIEW" title="Interview unavailable" subtitle={error || 'Could not load this interview.'} /><ActionButton title="Try again" onPress={load} /></Screen>;

  const report = interview.report || {};
  return (
    <Screen scroll>
      <View style={{ alignSelf: 'flex-start', marginBottom: 4 }}><ActionButton title="Back to interview reviews" secondary icon="arrow-back-outline" onPress={() => navigation.goBack()} /></View>
      <Header eyebrow="HR / ADMIN REVIEW" title={interview.applicant?.name || 'Applicant interview'} subtitle={`${interview.job?.title || 'Position'} · ${interview.job?.company || ''}`} />
      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}><Ionicons name="briefcase-outline" size={17} color={colors.accent} /><Text style={styles.cardTitle}>Application</Text></View>
        <View style={styles.detailGrid}>
          <Detail label="Applicant" value={interview.applicant?.name} />
          <Detail label="Email" value={interview.applicant?.email} />
          <Detail label="Resume" value={interview.resume?.filename} />
          <Detail label="Interview status" value={interview.status} />
          <Detail label="Decision" value={interview.review_decision || 'Pending'} />
        </View>
      </Card>

      <Card>
        <View style={styles.summaryTop}><Ionicons name="analytics-outline" size={18} color={colors.accent} /><Text style={styles.cardTitle}>AI interview evaluation</Text></View>
        {report.overall_score == null ? <Text style={styles.body}>Final evaluation is not available yet.</Text> : <>
          <Text style={styles.overall}>{report.overall_score}/100</Text>
          <Text style={styles.body}>Readiness: {report.readiness_percentage ?? '—'}% · {report.recommendation || 'No recommendation'}</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metric}>Technical {report.technical_score ?? '—'}</Text>
              <Text style={styles.metric}>Communication {report.communication_score ?? '—'}</Text>
              <Text style={styles.metric}>Confidence {report.confidence_score ?? '—'}</Text>
          </View>
          <ReviewList title="Strengths" values={report.strengths} />
          <ReviewList title="Weak areas" values={report.weak_areas} />
          <ReviewList title="Suggested improvements" values={report.suggested_improvements} />
        </>}
      </Card>

      <Card>
        <View style={styles.summaryTop}><Ionicons name="chatbubbles-outline" size={18} color={colors.accent} /><Text style={styles.cardTitle}>Answers and recordings</Text></View>
        {(interview.questions || []).map((question: any, index: number) => {
          const evaluation = interview.evaluations?.[index];
          const audioUrl = interview.audio_urls?.[String(index)];
          return (
            <View key={`question-${index}`} style={styles.question}>
              <Text style={styles.questionLabel}>QUESTION {String(index + 1).padStart(2, '0')} · {(question.type || 'interview').toUpperCase()} · {question.focus || ''}</Text>
              <Text style={styles.questionText}>{question.question}</Text>
              {question.follow_up ? <Text style={styles.body}>Follow-up: {question.follow_up}</Text> : null}
              <Text style={styles.answerLabel}>APPLICANT ANSWER</Text>
              <Text style={styles.body}>{interview.answers?.[index] || 'No submitted answer'}</Text>
              {evaluation ? <View style={styles.evaluation}>
                <Text style={styles.answerLabel}>AI FEEDBACK</Text>
                <Text style={styles.body}>{evaluation.feedback || 'No feedback returned.'}</Text>
                <View style={styles.metricRow}>{Object.entries(evaluation.scores || {}).map(([name, value]) => <Text key={name} style={styles.metric}>{name.replace('_', ' ')} {String(value)}</Text>)}</View>
              </View> : null}
              {audioUrl ? <RecordingPlayer url={resolveAdminInterviewAudioUrl(audioUrl)} /> : <Text style={styles.noRecording}>No voice recording for this answer.</Text>}
            </View>
          );
        })}
      </Card>

      <Card>
        <View style={styles.summaryTop}><Ionicons name="checkmark-done-outline" size={18} color={colors.accent} /><Text style={styles.cardTitle}>HR decision</Text></View>
        {interview.reviewed_at ? <Text style={styles.body}>Last reviewed: {new Date(interview.reviewed_at).toLocaleString()}</Text> : <Text style={styles.body}>Review the answers and recording, then record the final decision.</Text>}
        <TextInput accessibilityLabel="Reviewer note" multiline value={note} onChangeText={setNote} placeholder="Reviewer note (optional)" placeholderTextColor="#8795a8" style={styles.noteInput} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <View style={styles.decisionRow}>
          <View style={{ flex: 1 }}><ActionButton title={saving ? 'Saving...' : 'Pass applicant'} disabled={saving || interview.status !== 'completed'} onPress={() => decide('passed')} /></View>
          <View style={{ flex: 1 }}><ActionButton title={saving ? 'Saving...' : 'Reject applicant'} secondary disabled={saving || interview.status !== 'completed'} onPress={() => decide('rejected')} /></View>
        </View>
      </Card>
    </Screen>
  );
}

function RecordingPlayer({ url }: { url: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) await player.seekTo(0);
    player.play();
  };

  return <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause applicant recording' : 'Play applicant recording'} onPress={toggle} style={styles.playButton}>
    <Ionicons name={status.playing ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color="#fff" />
    <Text style={styles.playText}>{status.playing ? 'Pause recording' : 'Play recording'}</Text>
  </Pressable>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <View style={styles.detailItem}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || 'Not available'}</Text></View>;
}

function ReviewList({ title, values }: { title: string; values?: string[] }) {
  return <View style={{ marginTop: 12 }}><Text style={styles.answerLabel}>{title.toUpperCase()}</Text>{values?.length ? values.map((item, index) => <Text key={`${title}-${index}`} style={styles.body}>• {item}</Text>) : <Text style={styles.body}>None reported.</Text>}</View>;
}

const styles: Record<string, any> = {
  summaryCard: { marginTop: 0 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  detailItem: { minWidth: 150, flexGrow: 1 },
  detailLabel: { color: '#8795a8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  detailValue: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 4 },
  body: { color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 4 },
  overall: { color: '#1677ff', fontSize: 34, fontWeight: '800' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  metric: { backgroundColor: colors.accentSoft, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, color: colors.accent, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  question: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16, marginTop: 16 },
  questionLabel: { color: '#1677ff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  questionText: { color: '#12233f', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 7 },
  answerLabel: { color: '#8795a8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 12 },
  evaluation: { backgroundColor: '#f3f7fc', borderRadius: 6, padding: 11, marginTop: 10 },
  noRecording: { color: '#8795a8', fontSize: 12, marginTop: 10 },
  playButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 13, marginTop: 11 },
  playText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  noteInput: { minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, marginTop: 13, color: colors.ink, fontSize: 14 },
  decisionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 13 },
  error: { color: '#a22b24', marginTop: 10 },
  success: { color: '#167044', marginTop: 10, fontWeight: '700' },
};
