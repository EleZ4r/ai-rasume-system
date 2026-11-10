import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Speech from 'expo-speech';
import { generateMockInterviewReport, getApiErrorMessage, getMockInterview, submitMockInterviewAnswer, transcribeMockInterviewAudio } from '../../services/api';
import { colors } from '../../constants/theme';

type Interview = {
  id: number;
  status: string;
  questions: Array<{ type: string; question: string; focus: string; follow_up?: string | null }>;
  answers: string[];
  application?: { job?: { title: string; company: string } };
};

const modernStyles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { maxWidth: 920, paddingHorizontal: 22, paddingTop: 30 },
  questionCard: { borderColor: colors.line, borderRadius: 8, padding: 22, shadowColor: colors.ink, shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  answer: { borderColor: colors.line, borderRadius: 8, minHeight: 190 },
  button: { borderRadius: 8, minHeight: 48, justifyContent: 'center' },
  voicePanel: { borderColor: colors.line, borderRadius: 8, backgroundColor: '#f8fafc' },
});

export default function MockInterview({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const { interviewId } = route.params;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [answer, setAnswer] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const [nextQuestionIndex, setNextQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getMockInterview(interviewId);
      const current = result as Interview;
      setInterview(current);
      setQuestionIndex(current.answers?.length || 0);
      setAnswer(current.answers?.[current.answers.length - 1] || '');
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [interviewId]);
  useEffect(() => () => { Speech.stop(); }, []);

  const currentQuestion = interview?.questions?.[questionIndex];

  const speakQuestion = () => {
    if (!currentQuestion) return;
    Speech.stop();
    setSpeaking(true);
    const spokenQuestion = currentQuestion.follow_up
      ? `${currentQuestion.question}. Follow-up: ${currentQuestion.follow_up}`
      : currentQuestion.question;
    Speech.speak(spokenQuestion, {
      language: 'en-US',
      rate: 0.94,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        setError('Question audio could not be played on this device.');
      },
    });
  };

  const startVoiceAnswer = async () => {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is required for a spoken answer. You can still type your answer below.');
        return;
      }
      await Speech.stop();
      setSpeaking(false);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const stopAndTranscribe = async () => {
    setTranscribing(true);
    setError(null);
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const audioUri = audioRecorder.uri || audioRecorder.getStatus().url;
      if (!audioUri) throw new Error('The recording could not be read. Please record your answer again.');
      const result = await transcribeMockInterviewAudio(interviewId, questionIndex, audioUri);
      setAnswer(result.transcript);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setTranscribing(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) {
      setError('Write an answer before continuing.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setCanContinue(false);
    try {
      const result = await submitMockInterviewAnswer(interviewId, questionIndex, answer.trim());
      if (result.interview?.status === 'completed') {
        setInterview(result.interview);
        setQuestionIndex(result.interview.questions.length);
        return;
      }
      setInterview(result.interview);
      setNextQuestionIndex(result.next_question_index);
      setCanContinue(true);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
      if (requestError?.response?.data?.report_pending) {
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const continueInterview = () => {
    if (!canContinue) return;
    setQuestionIndex(nextQuestionIndex);
    setAnswer('');
    setCanContinue(false);
  };

  const retryReport = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await generateMockInterviewReport(interviewId);
      await load();
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !interview) {
    return <View style={styles.centered}><ActivityIndicator color="#1677ff" /><Text style={styles.muted}>Preparing your mock interview...</Text></View>;
  }

  if (!interview) {
    return <View style={styles.centered}><Text style={styles.title}>Interview unavailable</Text><Text style={styles.errorText}>{error || 'Unable to load this interview.'}</Text><Pressable style={styles.button} onPress={load}><Text style={styles.buttonText}>Try again</Text></Pressable></View>;
  }

  if (interview.status === 'completed') {
    return (
      <ScrollView style={[styles.page, modernStyles.page]} contentContainerStyle={[styles.content, modernStyles.content, { paddingHorizontal: width < 420 ? 16 : 22, paddingTop: width < 600 ? 22 : 30, paddingBottom: width < 600 ? 32 : 48 }]}>
        <Text style={styles.eyebrow}>INTERVIEW COMPLETE</Text>
        <Text style={styles.title}>{interview.application?.job?.title || 'Mock interview submitted'}</Text>
        <Text style={styles.muted}>Your responses have been submitted to HR for review. Interview feedback and the hiring decision will be shared by the review team.</Text>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Workspace')}><Text style={styles.secondaryText}>Return to workspace</Text></Pressable>
      </ScrollView>
    );
  }

  if (questionIndex >= interview.questions.length || !currentQuestion) {
    return <View style={styles.centered}><Text style={styles.title}>Interview answers submitted</Text><Text style={styles.muted}>Your responses are saved for HR review. You can retry finalizing the submission if the connection was interrupted.</Text>{error ? <Text style={styles.errorText}>{error}</Text> : null}<Pressable style={styles.button} disabled={submitting} onPress={retryReport}><Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Retry submission'}</Text></Pressable></View>;
  }

  return (
    <ScrollView style={[styles.page, modernStyles.page]} contentContainerStyle={[styles.content, modernStyles.content, { paddingHorizontal: width < 420 ? 16 : 22, paddingTop: width < 600 ? 22 : 30, paddingBottom: width < 600 ? 32 : 48 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>MOCK INTERVIEW</Text><Text style={[styles.title, width < 420 && styles.compactTitle]}>{interview.application?.job?.title || 'Practice interview'}</Text><Text style={styles.muted}>{interview.application?.job?.company}</Text></View><Text style={styles.counter}>{questionIndex + 1}/{interview.questions.length}</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${questionIndex / interview.questions.length * 100}%` as any }]} /></View>
      <View style={[styles.questionCard, modernStyles.questionCard]}>
        <Text style={styles.questionType}>{currentQuestion.type.toUpperCase()} · {currentQuestion.focus}</Text>
        <Text style={styles.question}>{currentQuestion.question}</Text>
        {currentQuestion.follow_up ? <Text style={styles.followUp}>Follow-up: {currentQuestion.follow_up}</Text> : null}
        <View style={[voiceStyles.panel, modernStyles.voicePanel]}>
          <Text style={voiceStyles.heading}>VOICE INTERVIEW</Text>
          <View style={voiceStyles.actions}>
            <Pressable style={voiceStyles.secondaryButton} onPress={speaking ? () => { Speech.stop(); setSpeaking(false); } : speakQuestion} disabled={recorderState.isRecording || transcribing}>
              <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color="#29415f" />
              <Text style={voiceStyles.secondaryText}>{speaking ? 'Stop question' : 'Listen to question'}</Text>
            </Pressable>
            {recorderState.isRecording ? (
              <Pressable style={voiceStyles.stopButton} onPress={stopAndTranscribe}>
                <Ionicons name="stop-circle-outline" size={18} color="#fff" />
                <Text style={voiceStyles.recordText}>Stop and transcribe · {Math.floor(recorderState.durationMillis / 1000)}s</Text>
              </Pressable>
            ) : (
              <Pressable style={voiceStyles.recordButton} onPress={startVoiceAnswer} disabled={submitting || transcribing}>
                <Ionicons name="mic-outline" size={18} color="#fff" />
                <Text style={voiceStyles.recordText}>Record answer</Text>
              </Pressable>
            )}
          </View>
          {transcribing ? <View style={voiceStyles.transcribing}><ActivityIndicator size="small" color="#1677ff" /><Text style={voiceStyles.hint}>Transcribing your answer...</Text></View> : <Text style={voiceStyles.hint}>Your recording is transcribed into the answer field. Review or edit it before AI scoring.</Text>}
        </View>
        <TextInput multiline value={answer} onChangeText={setAnswer} placeholder="Type your response or record it above..." placeholderTextColor="#8795a8" style={[styles.answer, modernStyles.answer]} editable={!submitting && !recorderState.isRecording} />
      </View>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <Pressable accessibilityRole="button" style={[styles.button, modernStyles.button]} disabled={submitting || transcribing || recorderState.isRecording} onPress={canContinue ? continueInterview : submitAnswer}><Text style={styles.buttonText}>{submitting ? 'Submitting answer...' : canContinue ? 'Continue to next question' : questionIndex === interview.questions.length - 1 ? 'Submit final answer' : 'Submit answer'}</Text></Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function ReportList({ title, items }: { title: string; items?: string[] }) {
  return <View style={styles.reportSection}><Text style={styles.sectionTitle}>{title}</Text>{items?.length ? items.map((item, index) => <Text key={`${title}-${index}`} style={styles.reportText}>• {item}</Text>) : <Text style={styles.reportText}>No items reported.</Text>}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f7fb' }, content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: 22, paddingBottom: 48 }, centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f7fb' }, header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }, headerCopy: { flex: 1, minWidth: 0 }, eyebrow: { color: '#1677ff', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { color: '#12233f', fontSize: 26, lineHeight: 32, fontWeight: '800', marginTop: 5 }, compactTitle: { fontSize: 23, lineHeight: 29 }, muted: { color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 6 }, counter: { color: '#1677ff', fontSize: 16, fontWeight: '800' }, progressTrack: { height: 5, backgroundColor: '#dce4ee', borderRadius: 4, marginTop: 18 }, progressFill: { height: 5, backgroundColor: '#1677ff', borderRadius: 4 }, questionCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e7ef', borderRadius: 8, padding: 19, marginTop: 16 }, questionType: { color: '#1677ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }, question: { color: '#12233f', fontSize: 19, lineHeight: 27, fontWeight: '700', marginTop: 12 }, followUp: { color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 10 }, answer: { minHeight: 180, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ccd6e5', borderRadius: 6, padding: 13, marginTop: 18, color: '#12233f', fontSize: 14, lineHeight: 21 }, button: { backgroundColor: '#1677ff', borderRadius: 6, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', marginTop: 14 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 }, secondary: { borderWidth: 1, borderColor: '#ccd6e5', borderRadius: 6, padding: 12, alignItems: 'center', marginTop: 20 }, secondaryText: { color: '#29415f', fontWeight: '700' }, errorBox: { backgroundColor: '#fff5f4', borderColor: '#f3c6c4', borderWidth: 1, borderRadius: 6, padding: 12, marginTop: 12 }, errorText: { color: '#a22b24', lineHeight: 20, marginTop: 8 }, feedback: { borderTopWidth: 1, borderTopColor: '#edf1f6', marginTop: 16, paddingTop: 13 }, feedbackText: { color: '#52627a', fontSize: 13, lineHeight: 20 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, metric: { minWidth: 100, backgroundColor: '#eef4fb', borderRadius: 6, padding: 10 }, metricValue: { color: '#1677ff', fontSize: 20, fontWeight: '800' }, metricLabel: { color: '#52627a', fontSize: 10, textTransform: 'capitalize', marginTop: 2 }, scoreBand: { backgroundColor: '#12233f', borderRadius: 8, padding: 20, marginTop: 18 }, scoreLabel: { color: '#b6c9e0', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }, score: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: 5 }, readiness: { color: '#d4e4f6', fontSize: 14, fontWeight: '700', marginTop: 2 }, recommendation: { backgroundColor: '#e5f5eb', padding: 16, borderRadius: 8, marginTop: 12 }, recommendationText: { color: '#167044', fontSize: 18, fontWeight: '800' }, reportSection: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e7ef', borderRadius: 8, padding: 16, marginTop: 12 }, sectionTitle: { color: '#12233f', fontSize: 15, fontWeight: '800', marginBottom: 6 }, reportText: { color: '#52627a', fontSize: 13, lineHeight: 20, marginTop: 6 },
});

const voiceStyles = StyleSheet.create({
  panel: { backgroundColor: '#f3f7fc', borderWidth: 1, borderColor: '#dce4ee', borderRadius: 6, padding: 13, marginTop: 16 },
  heading: { color: '#29415f', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#ccd6e5', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 11, paddingVertical: 9 },
  secondaryText: { color: '#29415f', fontSize: 12, fontWeight: '700' },
  recordButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#1677ff', borderRadius: 6, paddingHorizontal: 11, paddingVertical: 9 },
  stopButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#b42318', borderRadius: 6, paddingHorizontal: 11, paddingVertical: 9 },
  recordText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  hint: { color: '#52627a', fontSize: 11, lineHeight: 16, marginTop: 9 },
  transcribing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
});
