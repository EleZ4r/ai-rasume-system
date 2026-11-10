import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeResume, generateReviewer, getApiErrorMessage, getResume, submitVerification } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { colors } from '../../constants/theme';

export default function ResumeAnalysis({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const { resumeId } = route.params;
  const { user } = React.useContext(AuthContext);
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [retakingTest, setRetakingTest] = useState(false);
  const [generatingReviewer, setGeneratingReviewer] = useState(false);
  const [reviewerError, setReviewerError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getResume(resumeId);
      setResume(result);
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const analysis = resume?.resume_analyses?.[resume.resume_analyses.length - 1];
  const questions = Array.isArray(analysis?.verification_questions) ? analysis.verification_questions : [];
  const verificationComplete = analysis?.verification_status === 'completed';
  const evaluationFailed = analysis?.verification_status === 'evaluation_failed';
  const verificationScore = analysis?.verification_score;
  const verificationPassed = verificationComplete && verificationScore != null && Number.isFinite(Number(verificationScore)) && Number(verificationScore) >= 75;
  const personalizedReviewer = analysis?.personalized_reviewer;
  const reviewerTopics = Array.isArray(personalizedReviewer?.topics) ? personalizedReviewer.topics : [];
  const resolvedScore = analysis?.score ?? analysis?.overall_score ?? analysis?.total_score ?? null;
  const hasGeneratedAnalysis = Boolean(
    analysis && (
      resolvedScore != null ||
      (Array.isArray(analysis.strengths) && analysis.strengths.length > 0) ||
      (Array.isArray(analysis.weaknesses) && analysis.weaknesses.length > 0) ||
      (Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0) ||
      Boolean(analysis.reviewer_basis)
    )
  );
  const reviewIsCompleted = Boolean(
    analysis && (
      resolvedScore != null ||
      hasGeneratedAnalysis ||
      verificationComplete
    )
  );
  const analysisIncomplete = Boolean(
    resume?.status === 'analysis_failed' ||
    (
      resume?.status !== 'processed' &&
      analysis &&
      resolvedScore == null &&
      !hasGeneratedAnalysis &&
      !verificationComplete &&
      questions.length > 0 &&
      questions.length < 30
    )
  );
  const currentQuestion = questions[questionIndex];
  const questionType = (question: any) => question?.question_type || question?.type || (question?.options?.length ? 'multiple_choice' : question?.pairs?.length ? 'matching' : question?.course ? 'course_specific' : question?.statement ? 'modified_true_false' : 'essay');
  const needsQuestionRegeneration = questions.length > 0 && new Set(questions.map(questionType)).size === 1;
  const currentAnswer = answers[questionIndex] || '';

  const setCurrentAnswer = (value: string) => setAnswers((current) => current.map((answer, index) => index === questionIndex ? value : answer));

  const renderQuestionAnswer = () => {
    if (questionType(currentQuestion) === 'multiple_choice') {
      return <View>{(currentQuestion.options || []).map((option: string) => <Pressable key={option} style={[styles.option, currentAnswer === option && styles.selectedOption]} onPress={() => setCurrentAnswer(option)}><Text style={styles.optionText}>{option}</Text></Pressable>)}</View>;
    }

    if (questionType(currentQuestion) === 'modified_true_false') {
      return <View><Text style={styles.claimText}>{currentQuestion.statement || currentQuestion.question}</Text><TextInput value={currentAnswer} onChangeText={setCurrentAnswer} placeholder={currentQuestion.correction_prompt || 'Answer True or False and correct the statement if needed...'} placeholderTextColor="#8795a8" style={styles.answerInput} /></View>;
    }

    if (questionType(currentQuestion) === 'matching') {
      return <View>{(currentQuestion.pairs || []).map((pair: any, index: number) => <TextInput key={`${pair.left}-${index}`} value={currentAnswer.split('\n')[index] || ''} onChangeText={(value) => { const values = currentAnswer.split('\n'); values[index] = `${pair.left}: ${value}`; setCurrentAnswer(values.join('\n')); }} placeholder={`${pair.left} -> match`} placeholderTextColor="#8795a8" style={styles.matchInput} />)}</View>;
    }

    return <TextInput multiline value={currentAnswer} onChangeText={setCurrentAnswer} placeholder={questionType(currentQuestion) === 'course_specific' ? `Answer the ${currentQuestion.course || 'course'} problem...` : 'Type your answer...'} placeholderTextColor="#8795a8" style={styles.answerInput} />;
  };

  useEffect(() => {
    if (questions.length > 0 && answers.length !== questions.length) {
      setAnswers(Array.from({ length: questions.length }, (_, index) => analysis?.applicant_answers?.[index] || ''));
    }
  }, [analysis?.id, questions.length]);

  const submitTest = async () => {
    if (answers.length !== questions.length || answers.some((answer) => !answer.trim())) {
      setTestError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmittingTest(true);
    setTestError(null);
    try {
      await submitVerification(resume.id, answers);
      await load();
    } catch (requestError: any) {
      setTestError(getApiErrorMessage(requestError));
    } finally {
      setSubmittingTest(false);
    }
  };

  const retryEvaluation = async () => {
    const savedAnswers = Array.isArray(analysis?.applicant_answers) ? analysis.applicant_answers : [];
    if (savedAnswers.length !== questions.length || savedAnswers.some((answer: string) => !answer?.trim())) {
      setTestError('Saved answers are incomplete. Retake the test to submit a complete set of answers.');
      setRetakingTest(true);
      setShowQuestions(true);
      return;
    }

    setSubmittingTest(true);
    setTestError(null);
    try {
      await submitVerification(resume.id, savedAnswers);
      await load();
    } catch (requestError: any) {
      setTestError(getApiErrorMessage(requestError));
    } finally {
      setSubmittingTest(false);
    }
  };

  const startRetake = () => {
    setAnswers(Array.from({ length: questions.length }, () => ''));
    setQuestionIndex(0);
    setTestError(null);
    setRetakingTest(true);
    setShowQuestions(true);
  };

  const requestReviewer = async () => {
    setGeneratingReviewer(true);
    setReviewerError(null);
    try {
      await generateReviewer(resume.id);
      await load();
    } catch (requestError: any) {
      setReviewerError(getApiErrorMessage(requestError));
    } finally {
      setGeneratingReviewer(false);
    }
  };

  const renderItems = (items: unknown) => {
    if (!Array.isArray(items) || items.length === 0) return <Text style={styles.previewText}>None reported.</Text>;
    return items.map((item: unknown, index: number) => (
      <View key={`${index}-${String(item)}`} style={styles.bullet}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{String(item)}</Text>
      </View>
    ));
  };

  const renderReviewerSection = (title: string, items: unknown) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    return <View style={styles.reviewerSection}><Text style={styles.reviewerSectionTitle}>{title}</Text>{items.map((item: unknown, index: number) => <Text key={`${title}-${index}`} style={styles.reviewerText}>{typeof item === 'string' ? item : JSON.stringify(item)}</Text>)}</View>;
  };

  if (loading && !resume) {
    return <View style={styles.centered}><ActivityIndicator color="#1677ff" /><Text style={styles.infoText}>Loading resume analysis...</Text></View>;
  }

  if (error && !resume) {
    return <View style={styles.centered}><Text style={styles.errorTitle}>Could not load the analysis</Text><Text style={styles.errorText}>{error}</Text><Pressable style={styles.primaryButton} onPress={load}><Text style={styles.primaryButtonText}>Try again</Text></Pressable></View>;
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Upload');
  };

  return (
    <ScrollView
      style={[styles.page, modernStyles.page]}
      contentContainerStyle={[styles.content, modernStyles.content, { paddingHorizontal: width < 420 ? 16 : 22, paddingTop: width < 600 ? 22 : 30, paddingBottom: width < 600 ? 32 : 48 }]}
    >
      <View style={styles.topBar}><View style={styles.headingCopy}><Text style={styles.eyebrow}>RESUME REVIEW</Text><Text style={[styles.title, width < 420 && styles.compactTitle]}>Analysis report</Text></View>{user ? <Text style={styles.userName} numberOfLines={1}>{user.name}</Text> : null}</View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={[styles.secondaryButton, modernStyles.secondaryButton]} onPress={handleBack}><Ionicons name="arrow-back-outline" size={16} color={colors.ink} /><Text style={styles.secondaryButtonText}>Back</Text></Pressable>
        <Pressable accessibilityRole="button" style={[styles.secondaryButton, modernStyles.secondaryButton]} onPress={() => navigation.navigate('Workspace')}><Ionicons name="documents-outline" size={16} color={colors.ink} /><Text style={styles.secondaryButtonText}>My resumes</Text></Pressable>
      </View>

      <View style={[styles.fileCard, modernStyles.fileCard]}><View style={modernStyles.fileIcon}><Ionicons name="document-text-outline" size={20} color="#bcd8ff" /></View><View style={modernStyles.fileDetails}><Text style={styles.fileLabel}>UPLOADED RESUME</Text><Text style={styles.fileName} numberOfLines={2}>{resume.filename}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{resume.status.replace('_', ' ')}</Text></View></View>

      {resume.status === 'analysis_failed' || analysisIncomplete ? <View style={styles.warningCard}><Text style={styles.warningTitle}>Analysis incomplete</Text><Text style={styles.warningText}>The resume was uploaded, but the structured AI review did not finish.</Text><Pressable style={styles.primaryButton} onPress={async () => { await analyzeResume(resume.id); await load(); }}><Text style={styles.primaryButtonText}>Retry analysis</Text></Pressable></View> : resume.status !== 'processed' ? <View style={styles.infoCard}><ActivityIndicator color="#1677ff" /><Text style={styles.infoText}>Your analysis is being prepared. This page updates automatically.</Text></View> : null}

      {resume.status === 'processed' && !reviewIsCompleted ? <View style={styles.infoCard}><ActivityIndicator color="#1677ff" /><Text style={styles.infoText}>Waiting for AI review results...</Text></View> : null}

      <View style={[styles.scoreCard, modernStyles.scoreCard]}><View style={modernStyles.scoreCopy}><Text style={styles.cardLabel}>OVERALL SCORE</Text><Text style={styles.score}>{resolvedScore == null ? '--' : resolvedScore}</Text><Text style={styles.scoreCaption}>out of 100</Text></View><View style={modernStyles.scoreState}><Ionicons name={reviewIsCompleted ? 'checkmark-circle-outline' : 'time-outline'} size={18} color="#fff" /><Text style={styles.scoreHint}>{reviewIsCompleted ? 'AI review complete' : 'Waiting for results'}</Text></View></View>

      {analysis ? <>
        <View style={[styles.sectionCard, modernStyles.sectionCard]}><Text style={styles.sectionTitle}>Strengths</Text>{renderItems(analysis.strengths)}</View>
        <View style={[styles.sectionCard, modernStyles.sectionCard]}><Text style={styles.sectionTitle}>Areas to improve</Text>{renderItems(analysis.weaknesses)}</View>
        <View style={[styles.sectionCard, modernStyles.sectionCard]}><Text style={styles.sectionTitle}>Recommended next steps</Text>{renderItems(analysis.suggestions)}</View>
        <View style={[styles.reviewerCard, modernStyles.reviewerCard]}><Text style={styles.sectionTitle}>Reviewer basis</Text><Text style={styles.previewText}>{analysis.reviewer_basis || 'No reviewer basis was returned.'}</Text></View>
        <View style={[styles.questionCard, modernStyles.questionCard]}>
          <View style={styles.questionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Verification test</Text>
              <Text style={styles.previewText}>{verificationComplete && !retakingTest ? 'Completed' : `${questions.length || 0} questions based on this resume`}</Text>
            </View>
            {verificationComplete && !retakingTest ? (
              <View style={styles.resultActions}>
                {verificationScore == null || !Number.isFinite(Number(verificationScore)) ? <Pressable style={styles.questionToggle} disabled={submittingTest} onPress={retryEvaluation}><Text style={styles.questionToggleText}>{submittingTest ? 'Retrying...' : 'Retry evaluation'}</Text></Pressable> : !verificationPassed ? <Pressable style={styles.questionToggle} onPress={startRetake}><Text style={styles.questionToggleText}>Retake test</Text></Pressable> : null}
              </View>
            ) : evaluationFailed && !retakingTest ? (
              <View style={styles.resultActions}>
                <Pressable style={styles.questionToggle} disabled={submittingTest} onPress={retryEvaluation}><Text style={styles.questionToggleText}>{submittingTest ? 'Retrying...' : 'Retry saved answers'}</Text></Pressable>
              </View>
            ) : (
              <Pressable style={styles.questionToggle} onPress={async () => { if (needsQuestionRegeneration) { await analyzeResume(resume.id); await load(); } else if (retakingTest) { setRetakingTest(false); setShowQuestions(false); setTestError(null); } else { setShowQuestions((visible) => !visible); } }}>
                <Text style={styles.questionToggleText}>{needsQuestionRegeneration ? 'Regenerate types' : retakingTest ? 'Cancel retake' : showQuestions ? 'Close' : 'Start test'}</Text>
              </Pressable>
            )}
          </View>
          {verificationComplete && !retakingTest ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultStatus}>{verificationScore == null || !Number.isFinite(Number(verificationScore)) ? 'RESULT INCOMPLETE' : verificationPassed ? 'PASS' : 'NEEDS IMPROVEMENT'}</Text>
              <Text style={styles.resultScore}>{verificationScore ?? '--'}/100</Text>
              <Text style={styles.previewText}>{analysis.verification_feedback || 'Verification completed.'}</Text>
              {testError ? <Text style={styles.testError}>{testError}</Text> : null}
              <Text style={styles.gateText}>{verificationPassed ? 'You passed the skill verification and are eligible for job recommendations.' : 'Job recommendations remain locked until you score at least 75.'}</Text>
              {verificationPassed ? <Pressable style={[styles.primaryButton, { marginTop: 12 }]} onPress={() => navigation.navigate('JobRecommendations', { resumeId: resume.id })}><Text style={styles.primaryButtonText}>View recommended jobs</Text></Pressable> : null}
            </View>
          ) : evaluationFailed && !retakingTest ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultStatus}>EVALUATION PAUSED</Text>
              <Text style={styles.previewText}>{testError || 'The AI evaluator was busy. Your submitted answers are saved and can be retried.'}</Text>
              <Text style={styles.gateText}>Retry the saved answers when the evaluator is available, or reopen them to make edits.</Text>
              <Pressable style={[styles.secondaryButton, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={() => { setRetakingTest(true); setShowQuestions(true); setTestError(null); }}><Text style={styles.secondaryButtonText}>Review saved answers</Text></Pressable>
            </View>
          ) : showQuestions && currentQuestion ? (
            <View style={styles.testPanel}>
              <Text style={styles.progressText}>Question {questionIndex + 1} of {questions.length} · {questionType(currentQuestion).replace('_', ' ')}</Text>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
              {currentQuestion.course ? <Text style={styles.claimText}>Course focus: {currentQuestion.course}</Text> : null}
              {currentQuestion.claim ? <Text style={styles.claimText}>Resume claim: {currentQuestion.claim}</Text> : null}
              {renderQuestionAnswer()}
              {testError ? <Text style={styles.testError}>{testError}</Text> : null}
              <View style={styles.testActions}>
                <Pressable style={styles.secondaryButton} disabled={questionIndex === 0} onPress={() => setQuestionIndex((index) => index - 1)}><Text style={styles.secondaryButtonText}>Previous</Text></Pressable>
                {questionIndex < questions.length - 1 ? <Pressable style={styles.primaryButton} onPress={() => setQuestionIndex((index) => index + 1)}><Text style={styles.primaryButtonText}>Next</Text></Pressable> : <Pressable style={styles.primaryButton} disabled={submittingTest} onPress={submitTest}><Text style={styles.primaryButtonText}>{submittingTest ? 'Checking...' : 'Submit answers'}</Text></Pressable>}
              </View>
            </View>
          ) : null}
        </View>
        {verificationComplete && verificationScore != null && Number.isFinite(Number(verificationScore)) && !verificationPassed ? (
          <View style={styles.reviewerCard}>
            <Text style={styles.sectionTitle}>Personalized reviewer</Text>
            {reviewerTopics.length ? reviewerTopics.map((topic: any, index: number) => (
              <View key={`${topic.title || 'topic'}-${index}`} style={styles.reviewerTopic}>
                <Text style={styles.reviewerTopicTitle}>{topic.title || `Weak topic ${index + 1}`}</Text>
                {topic.overview ? <Text style={styles.reviewerText}>{topic.overview}</Text> : null}
                {topic.why_it_matters ? <Text style={styles.reviewerText}>Why it matters: {topic.why_it_matters}</Text> : null}
                {renderReviewerSection('Core concepts', topic.core_concepts)}
                {renderReviewerSection('Examples', topic.examples)}
                {renderReviewerSection('Best practices', topic.best_practices)}
                {renderReviewerSection('Common mistakes', topic.common_mistakes)}
                {renderReviewerSection('Practice questions', topic.practice_questions)}
                {topic.coding_exercise ? <View style={styles.reviewerSection}><Text style={styles.reviewerSectionTitle}>Coding exercise</Text><Text style={styles.reviewerText}>{topic.coding_exercise}</Text></View> : null}
                {renderReviewerSection('Interview tips', topic.interview_tips)}
                {renderReviewerSection('Cheat sheet', topic.cheat_sheet)}
              </View>
            )) : <>
              <Text style={styles.previewText}>A personalized reviewer has not been generated yet.</Text>
              {reviewerError ? <Text style={styles.testError}>{reviewerError}</Text> : null}
              <Pressable style={[styles.primaryButton, { marginTop: 12 }]} disabled={generatingReviewer} onPress={requestReviewer}><Text style={styles.primaryButtonText}>{generatingReviewer ? 'Generating...' : 'Generate reviewer'}</Text></Pressable>
            </>}
          </View>
        ) : null}
      </> : null}

      <View style={[styles.textCard, modernStyles.textCard]}><View style={modernStyles.previewHeading}><Ionicons name="reader-outline" size={18} color={colors.accent} /><Text style={styles.sectionTitle}>Resume preview</Text></View><Text style={styles.previewText}>{resume.text ? resume.text.substring(0, 600) : 'Text extraction is not available yet.'}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f7fb' }, content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: 24, paddingBottom: 48 }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f4f7fb' }, topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, headingCopy: { flex: 1, minWidth: 0 }, eyebrow: { color: '#1677ff', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, title: { color: '#12233f', fontSize: 28, fontWeight: '800', marginTop: 4 }, compactTitle: { fontSize: 25 }, userName: { color: '#52627a', fontSize: 13, marginTop: 4, flexShrink: 1, textAlign: 'right' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }, secondaryButton: { borderWidth: 1, borderColor: '#ccd6e5', borderRadius: 6, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: '#fff' }, secondaryButtonText: { color: '#29415f', fontWeight: '700', fontSize: 13 }, fileCard: { backgroundColor: '#12233f', borderRadius: 10, padding: 20, marginTop: 22 }, fileLabel: { color: '#9db5d3', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, fileName: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 7 }, statusPill: { alignSelf: 'flex-start', backgroundColor: '#d7f5e5', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, marginTop: 14 }, statusText: { color: '#147443', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, scoreCard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1677ff', borderRadius: 10, padding: 20, marginTop: 14 }, cardLabel: { color: '#dceaff', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, score: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 2 }, scoreCaption: { color: '#dceaff', fontSize: 12 }, scoreHint: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 }, sectionCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginTop: 14, borderWidth: 1, borderColor: '#e1e7ef' }, reviewerCard: { backgroundColor: '#eef5ff', borderRadius: 10, padding: 18, marginTop: 14, borderWidth: 1, borderColor: '#cfe1ff' }, reviewerTopic: { borderTopWidth: 1, borderTopColor: '#cfe1ff', marginTop: 12, paddingTop: 12 }, reviewerTopicTitle: { color: '#12233f', fontSize: 15, fontWeight: '800', marginBottom: 6 }, reviewerSection: { marginTop: 10 }, reviewerSectionTitle: { color: '#29415f', fontSize: 13, fontWeight: '800', marginBottom: 4 }, reviewerText: { color: '#52627a', fontSize: 13, lineHeight: 19, marginTop: 3 }, questionCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginTop: 14, borderWidth: 1, borderColor: '#e1e7ef' }, questionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, questionToggle: { backgroundColor: '#1677ff', borderRadius: 6, paddingVertical: 9, paddingHorizontal: 13 }, questionToggleText: { color: '#fff', fontWeight: '800', fontSize: 13 }, questionText: { color: '#12233f', fontSize: 14, lineHeight: 20 }, claimText: { color: '#52627a', fontSize: 12, lineHeight: 18, marginTop: 4 }, testPanel: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#edf1f6', paddingTop: 16 }, progressText: { color: '#1677ff', fontSize: 12, fontWeight: '800', marginBottom: 12 }, answerInput: { minHeight: 120, borderWidth: 1, borderColor: '#ccd6e5', borderRadius: 6, padding: 12, marginTop: 14, color: '#12233f', textAlignVertical: 'top' }, matchInput: { borderWidth: 1, borderColor: '#ccd6e5', borderRadius: 6, padding: 12, marginTop: 10, color: '#12233f' }, option: { borderWidth: 1, borderColor: '#ccd6e5', borderRadius: 6, padding: 12, marginTop: 10, backgroundColor: '#fff' }, selectedOption: { borderColor: '#1677ff', backgroundColor: '#e7f1ff' }, optionText: { color: '#12233f', fontSize: 14 }, testActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, testError: { color: '#b42318', marginTop: 8 }, resultCard: { backgroundColor: '#e7f1ff', borderRadius: 8, padding: 14, marginTop: 14 }, resultStatus: { color: '#12233f', fontSize: 12, fontWeight: '800', marginBottom: 6 }, gateText: { color: '#31557f', fontSize: 13, lineHeight: 19, marginTop: 10, fontWeight: '700' }, resultScore: { color: '#1677ff', fontSize: 32, fontWeight: '800', marginBottom: 8 }, sectionTitle: { color: '#12233f', fontSize: 16, fontWeight: '800', marginBottom: 8 }, bullet: { flexDirection: 'row', marginTop: 8 }, bulletDot: { color: '#1677ff', fontSize: 17, marginRight: 8 }, bulletText: { flex: 1, color: '#52627a', fontSize: 14, lineHeight: 21 }, textCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginTop: 14, borderWidth: 1, borderColor: '#e1e7ef' }, previewText: { color: '#52627a', fontSize: 13, lineHeight: 20 }, infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e7f1ff', borderRadius: 8, padding: 14, marginTop: 14 }, infoText: { color: '#31557f', fontSize: 13, marginLeft: 10 }, warningCard: { backgroundColor: '#fff4e5', borderRadius: 8, padding: 16, marginTop: 14 }, warningTitle: { color: '#8a4b08', fontWeight: '800', fontSize: 16 }, warningText: { color: '#8a4b08', marginTop: 5, marginBottom: 12 }, primaryButton: { alignSelf: 'flex-start', backgroundColor: '#1677ff', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16 }, primaryButtonText: { color: '#fff', fontWeight: '700' }, errorTitle: { color: '#12233f', fontSize: 20, fontWeight: '800' }, errorText: { color: '#52627a', marginVertical: 12, textAlign: 'center' }
});

const modernStyles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { maxWidth: 1040, paddingHorizontal: 22, paddingTop: 30 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderColor: colors.line, borderRadius: 8, minHeight: 40 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.ink, borderRadius: 8, padding: 18, marginTop: 20 },
  fileIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#203c62' },
  fileDetails: { flex: 1 },
  scoreCard: { alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: 8, marginTop: 12 },
  scoreCopy: { flex: 1 },
  scoreState: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionCard: { borderColor: colors.line, borderRadius: 8, shadowColor: colors.ink, shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  reviewerCard: { backgroundColor: colors.accentSoft, borderColor: '#c6e6e1', borderRadius: 8 },
  questionCard: { borderColor: colors.line, borderRadius: 8 },
  textCard: { borderColor: colors.line, borderRadius: 8 },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
