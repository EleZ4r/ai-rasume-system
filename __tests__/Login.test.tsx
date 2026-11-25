import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Home from '../src/screens/auth/Home';
import Login from '../src/screens/auth/Login';
import Register from '../src/screens/auth/Register';
import ResumeAnalysis from '../src/screens/applicant/ResumeAnalysis';
import MockInterview from '../src/screens/applicant/MockInterview';
import JobRecommendations from '../src/screens/applicant/JobRecommendations';
import ApplicationUpdates from '../src/screens/applicant/ApplicationUpdates';
import Dashboard from '../src/screens/applicant/Dashboard';
import ResumeUpload from '../src/screens/applicant/ResumeUpload';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';
import * as api from '../src/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    uri: 'blob:mock-recording',
    getStatus: jest.fn(() => ({ url: 'blob:mock-recording' })),
  })),
  useAudioRecorderState: jest.fn(() => ({ isRecording: false, durationMillis: 0 })),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../src/services/api', () => ({
  analyzeResume: jest.fn(),
  generateReviewer: jest.fn(),
  getJobRecommendations: jest.fn(),
  getApiErrorMessage: jest.fn((error) => error?.message || 'Error'),
  getMockInterview: jest.fn(),
  getResume: jest.fn(),
  applyToJob: jest.fn(),
  uploadResume: jest.fn(),
  listApplicationUpdates: jest.fn(),
  listUserResumes: jest.fn(),
  startMockInterview: jest.fn(),
  submitMockInterviewAnswer: jest.fn(),
  submitVerification: jest.fn(),
}));

test('renders login form', () => {
  const { getByText, getByPlaceholderText } = render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );

  expect(getByText('Email')).toBeTruthy();
  expect(getByText('Galila')).toBeTruthy();
});

test('homepage routes visitors to sign-in and applicant registration', () => {
  const navigate = jest.fn();
  const { getByLabelText, getByRole, getAllByRole, getByText } = render(
    <Home navigation={{ navigate }} />
  );

  expect(getByLabelText('Galila logo')).toBeTruthy();
  expect(getByText('Make your next career move with confidence.')).toBeTruthy();

  fireEvent.press(getByRole('button', { name: 'Create applicant account' }));
  expect(navigate).toHaveBeenCalledWith('Register');

  const signInButtons = getAllByRole('button', { name: 'Sign in' });
  expect(signInButtons).toHaveLength(1);
  fireEvent.press(signInButtons[0]);
  expect(navigate).toHaveBeenCalledWith('Login');
});

test('feature carousel supports manual navigation, autoplay, and pause', () => {
  jest.useFakeTimers();
  const { getByTestId, getByText, getByRole } = render(
    <Home navigation={{ navigate: jest.fn() }} />
  );

  try {
    fireEvent(getByTestId('feature-carousel'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } },
    });

    expect(getByText('Slide 1 of 3')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Next feature' }));
    expect(getByText('Slide 2 of 3')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Resume automatic carousel' }));
    act(() => jest.advanceTimersByTime(5000));
    expect(getByText('Slide 3 of 3')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Pause automatic carousel' }));
    act(() => jest.advanceTimersByTime(10000));
    expect(getByText('Slide 3 of 3')).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});

test('lets visitors return to the homepage from sign-in', () => {
  const navigation = { navigate: jest.fn() };
  const { getByRole } = render(<Login navigation={navigation} />);

  fireEvent.press(getByRole('button', { name: 'Back to home' }));

  expect(navigation.navigate).toHaveBeenCalledWith('Home');
});

test('passes the picked browser file directly to the upload service', async () => {
  const webFile = new File(['resume contents'], 'resume.pdf', { type: 'application/pdf' });
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{
      uri: 'blob:http://localhost/resume',
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      size: webFile.size,
      file: webFile,
    }],
  });
  (api.listUserResumes as jest.Mock).mockResolvedValue([]);
  (api.uploadResume as jest.Mock).mockResolvedValue({ id: 12 });
  (api.analyzeResume as jest.Mock).mockResolvedValue({ message: 'Analysis queued' });
  const navigation = { navigate: jest.fn() };

  const { getByRole } = render(
    <AuthContext.Provider value={{ user: { id: 1, name: 'Test Applicant' }, token: 'token', loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeUpload navigation={navigation} />
    </AuthContext.Provider>
  );

  await waitFor(() => expect(
    getByRole('button', { name: 'Choose a PDF resume' }).props.accessibilityState?.disabled
  ).toBe(false));
  fireEvent.press(getByRole('button', { name: 'Choose a PDF resume' }));

  await waitFor(() => expect(api.uploadResume).toHaveBeenCalledWith(
    'blob:http://localhost/resume',
    'resume.pdf',
    'application/pdf',
    undefined,
    webFile,
  ));
  expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    base64: false,
  });
  await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('ResumeAnalysis', { resumeId: 12 }));
});

test('shows the transparent brand logo beside the applicant welcome heading', async () => {
  (api.listUserResumes as jest.Mock).mockResolvedValue([]);

  const { findByRole, getByLabelText } = render(
    <AuthContext.Provider value={{ user: { id: 1, name: 'Test User' }, token: 'abc', loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <Dashboard navigation={{ navigate: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByRole('header', { name: 'Welcome, Test' })).toBeTruthy();
  expect(getByLabelText('Galila logo')).toBeTruthy();
});

test('shows application interview outcomes and reviewer notes', async () => {
  (api.listApplicationUpdates as jest.Mock).mockResolvedValue([{
    id: 5,
    status: 'admin_passed',
    created_at: '2026-11-10T00:00:00.000Z',
    job: { title: 'PHP Developer', company: 'Northstar Digital' },
    interview: {
      status: 'completed',
      review_decision: 'passed',
      review_note: 'Strong technical answers.',
      reviewed_at: '2026-11-10T01:00:00.000Z',
    },
  }]);

  const { findByText } = render(
    <NavigationContainer>
      <ApplicationUpdates />
    </NavigationContainer>
  );

  expect(await findByText('You passed your interview')).toBeTruthy();
  expect(await findByText('PHP Developer')).toBeTruthy();
  expect(await findByText('Strong technical answers.')).toBeTruthy();
});

test('requires explicit privacy consent before registering', async () => {
  const register = jest.fn();
  const { getByPlaceholderText, getByRole, getByText, getByTestId, queryByPlaceholderText } = render(
    <AuthContext.Provider value={{ user: null, token: null, loading: false, login: jest.fn(), register, updateProfile: jest.fn(), logout: jest.fn() }}>
      <Register navigation={{}} />
    </AuthContext.Provider>
  );

  expect(queryByPlaceholderText('Your name')).toBeNull();
  fireEvent.press(getByText('Accept and continue'));
  expect(queryByPlaceholderText('Your name')).toBeNull();
  fireEvent.scroll(getByTestId('consent-scroll'), {
    nativeEvent: {
      contentOffset: { x: 0, y: 1500 },
      contentSize: { width: 300, height: 2000 },
      layoutMeasurement: { width: 300, height: 500 },
    },
  });
  fireEvent.press(getByRole('checkbox'));
  fireEvent.press(getByText('Accept and continue'));

  fireEvent.changeText(getByPlaceholderText('Your name'), 'Test Applicant');
  fireEvent.changeText(getByPlaceholderText('you@example.com'), 'applicant@example.com');
  fireEvent.changeText(getByPlaceholderText('Create a password'), 'password');
  fireEvent.press(getByText('Create account'));
  await waitFor(() => expect(register).toHaveBeenCalledWith('Test Applicant', 'applicant@example.com', 'password', true));
});

test('lets auth state switch the root navigator after successful login', async () => {
  const login = jest.fn().mockResolvedValue(undefined);
  const navigation = { replace: jest.fn(), navigate: jest.fn() };
  const { getByPlaceholderText, getByText } = render(
    <AuthContext.Provider value={{ user: null, token: null, loading: false, login, register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <Login navigation={navigation} />
    </AuthContext.Provider>
  );

  fireEvent.changeText(getByPlaceholderText('you@example.com'), 'admin@example.com');
  fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password');
  fireEvent.press(getByText('Sign in'));

  await waitFor(() => expect(login).toHaveBeenCalledWith('admin@example.com', 'password'));
  expect(navigation.replace).not.toHaveBeenCalled();
});

test('offers retry when the review summary exists but the overall score is missing', async () => {
  (api.getResume as jest.Mock).mockResolvedValue({
    id: 10,
    filename: 'resume.pdf',
    status: 'processed',
    text: 'resume text',
    resume_analyses: [{
      id: 1,
      overall_score: null,
      strengths: ['Problem solving', 'Teamwork'],
      weaknesses: ['Limited production experience'],
      suggestions: ['Add more metrics'],
      verification_questions: [],
      reviewer_basis: 'Resume evidence',
    }],
  });
  (api.analyzeResume as jest.Mock).mockResolvedValue({ message: 'Analysis queued' });

  const { findByText } = render(
    <AuthContext.Provider value={{ user: { id: 1, name: 'Test User' }, token: 'abc', loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByText('Problem solving')).toBeTruthy();
  expect(await findByText('Limited production experience')).toBeTruthy();
  expect(await findByText('Analysis incomplete')).toBeTruthy();
  expect(await findByText('Analysis failed')).toBeTruthy();
  fireEvent.press(await findByText('Retry analysis'));
  expect(api.analyzeResume).toHaveBeenCalledWith(10);
});

test('shows a clear failed state and moves into progress after retrying analysis', async () => {
  const failedResume = {
    id: 10,
    filename: 'resume.pdf',
    status: 'analysis_failed',
    text: 'resume text',
    resume_analyses: [{ id: 2, raw_response: { error: 'Provider unavailable' } }],
  };
  (api.getResume as jest.Mock)
    .mockResolvedValueOnce(failedResume)
    .mockResolvedValue({ ...failedResume, status: 'processing' });
  (api.analyzeResume as jest.Mock).mockResolvedValue({ message: 'Analysis queued' });

  const { findByText, queryByText } = render(
    <AuthContext.Provider value={{ user: null, token: null, loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByText('Analysis failed')).toBeTruthy();
  expect(queryByText('Waiting for results')).toBeNull();
  fireEvent.press(await findByText('Retry analysis'));

  expect(api.analyzeResume).toHaveBeenCalledWith(10);
  expect(await findByText('Your analysis is being prepared. This page updates automatically.')).toBeTruthy();
  expect(await findByText('Analysis in progress')).toBeTruthy();
});

test('offers retry when the API says processed but returned no review fields', async () => {
  const processedWithoutReview = {
    id: 10,
    filename: 'resume.pdf',
    status: 'processed',
    text: 'resume text',
    resume_analyses: [{
      id: 3,
      score: null,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      reviewer_basis: null,
      verification_questions: Array.from({ length: 30 }, (_, index) => ({
        question_type: 'essay',
        question: `Question ${index + 1}`,
      })),
    }],
  };
  (api.getResume as jest.Mock)
    .mockResolvedValueOnce(processedWithoutReview)
    .mockResolvedValue({ ...processedWithoutReview, status: 'processing' });
  (api.analyzeResume as jest.Mock).mockResolvedValue({ message: 'Analysis queued' });

  const { findByText, queryByText } = render(
    <AuthContext.Provider value={{ user: null, token: null, loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByText('Analysis incomplete')).toBeTruthy();
  expect(queryByText('Waiting for AI review results...')).toBeNull();
  fireEvent.press(await findByText('Retry analysis'));
  expect(api.analyzeResume).toHaveBeenCalledWith(10);
  expect(await findByText('Analysis in progress')).toBeTruthy();
});

test('shows a retry error instead of silently failing', async () => {
  (api.getResume as jest.Mock).mockResolvedValue({
    id: 10,
    filename: 'resume.pdf',
    status: 'analysis_failed',
    text: 'resume text',
    resume_analyses: [],
  });
  (api.analyzeResume as jest.Mock).mockRejectedValue(new Error('The API is unavailable.'));

  const { findByText } = render(
    <AuthContext.Provider value={{ user: null, token: null, loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  fireEvent.press(await findByText('Retry analysis'));
  expect(await findByText('The API is unavailable.')).toBeTruthy();
});

test.each([
  { score: 74, expected: 'NEEDS IMPROVEMENT' },
  { score: 75, expected: 'PASS' },
])('uses the 75-point verification gate for score $score', async ({ score, expected }) => {
  (api.getResume as jest.Mock).mockResolvedValue({
    id: 10,
    filename: 'resume.pdf',
    status: 'processed',
    text: 'resume text',
    resume_analyses: [{
      id: 1,
      score: 80,
      verification_status: 'completed',
      verification_score: score,
      verification_questions: [],
    }],
  });

  const { findByText } = render(
    <AuthContext.Provider value={{ user: { id: 1, name: 'Test User' }, token: 'abc', loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByText(expected)).toBeTruthy();
});

test('offers saved-answer retry after a rate-limited verification', async () => {
  const savedAnswers = ['Laravel routes map paths to handlers.'];
  (api.getResume as jest.Mock).mockResolvedValue({
    id: 10,
    filename: 'resume.pdf',
    status: 'processed',
    text: 'Laravel developer',
    resume_analyses: [{
      id: 1,
      score: 82,
      verification_status: 'evaluation_failed',
      verification_questions: [{ question_type: 'essay', question: 'Explain Laravel routes.', claim: 'Laravel' }],
      applicant_answers: savedAnswers,
    }],
  });
  (api.submitVerification as jest.Mock).mockResolvedValue({ verification_status: 'completed', verification_score: 82 });

  const { findByText } = render(
    <AuthContext.Provider value={{ user: { id: 1, name: 'Test User' }, token: 'abc', loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByText('The AI evaluator was busy. Your submitted answers are saved and can be retried.')).toBeTruthy();
  fireEvent.press(await findByText('Retry saved answers'));
  expect(api.submitVerification).toHaveBeenCalledWith(10, savedAnswers);
});

test('shows the personalized reviewer and lets a failed applicant retake the test', async () => {
  (api.getResume as jest.Mock).mockResolvedValue({
    id: 10,
    filename: 'resume.pdf',
    status: 'processed',
    text: 'PHP and Laravel experience.',
    resume_analyses: [{
      id: 1,
      score: 80,
      verification_status: 'completed',
      verification_score: 54,
      verification_feedback: 'Review Laravel routes.',
      verification_questions: [{ question_type: 'essay', question: 'Explain Laravel routing.', claim: 'Laravel experience' }],
      applicant_answers: ['No answer yet'],
      personalized_reviewer: { topics: [{ title: 'Laravel routing', overview: 'Routes connect request paths to handlers.' }] },
    }],
  });

  const { findByText } = render(
    <AuthContext.Provider value={{ user: { id: 1, name: 'Test User' }, token: 'abc', loading: false, login: jest.fn(), register: jest.fn(), updateProfile: jest.fn(), logout: jest.fn() }}>
      <ResumeAnalysis route={{ params: { resumeId: 10 } }} navigation={{ canGoBack: () => false, navigate: jest.fn(), goBack: jest.fn() }} />
    </AuthContext.Provider>
  );

  expect(await findByText('Laravel routing')).toBeTruthy();
  expect(await findByText('Routes connect request paths to handlers.')).toBeTruthy();
  fireEvent.press(await findByText('Retake test'));
  expect(await findByText('Question 1 of 1 · essay')).toBeTruthy();
  expect(await findByText('Explain Laravel routing.')).toBeTruthy();
});

test('keeps interview evaluation private while advancing between questions', async () => {
  (api.getMockInterview as jest.Mock).mockResolvedValue({
    id: 31,
    status: 'in_progress',
    questions: [
      { type: 'technical', question: 'Explain Laravel routes.', focus: 'Laravel' },
      { type: 'behavioral', question: 'Describe a team challenge.', focus: 'Teamwork' },
    ],
    answers: [],
    evaluations: [],
    application: { job: { title: 'Junior Laravel Developer', company: 'Northstar Digital' } },
  });
  (api.submitMockInterviewAnswer as jest.Mock).mockResolvedValue({
    interview: {
      id: 31,
      status: 'in_progress',
      questions: [
        { type: 'technical', question: 'Explain Laravel routes.', focus: 'Laravel' },
        { type: 'behavioral', question: 'Describe a team challenge.', focus: 'Teamwork' },
      ],
      answers: ['Routes map URLs to controller actions.'],
      evaluations: [],
      application: { job: { title: 'Junior Laravel Developer', company: 'Northstar Digital' } },
    },
    next_question_index: 1,
  });

  const { findByText, findByPlaceholderText, queryByText } = render(
    <MockInterview route={{ params: { interviewId: 31 } }} navigation={{ navigate: jest.fn() }} />
  );

  fireEvent.changeText(await findByPlaceholderText('Type your response or record it above...'), 'Routes map URLs to controller actions.');
  fireEvent.press(await findByText('Submit answer'));
  expect(queryByText('Clear explanation.')).toBeNull();
  expect(queryByText('Answer feedback')).toBeNull();
  expect(await findByText('Explain Laravel routes.')).toBeTruthy();
  expect(queryByText('Describe a team challenge.')).toBeNull();

  fireEvent.press(await findByText('Continue to next question'));
  expect(await findByText('Describe a team challenge.')).toBeTruthy();
});

test('offers voice controls and reads the active question aloud', async () => {
  (api.getMockInterview as jest.Mock).mockResolvedValue({
    id: 31,
    status: 'in_progress',
    questions: [{ type: 'technical', question: 'Explain Laravel routes.', focus: 'Laravel' }],
    answers: [],
    evaluations: [],
    application: { job: { title: 'Junior Laravel Developer', company: 'Northstar Digital' } },
  });

  const { findByText, findByPlaceholderText } = render(
    <MockInterview route={{ params: { interviewId: 31 } }} navigation={{ navigate: jest.fn() }} />
  );

  expect(await findByPlaceholderText('Type your response or record it above...')).toBeTruthy();
  expect(await findByText('Record answer')).toBeTruthy();
  fireEvent.press(await findByText('Listen to question'));
  expect(Speech.speak).toHaveBeenCalledWith('Explain Laravel routes.', expect.objectContaining({ language: 'en-US' }));
});

test('shows interview generation failure after reloading recommendations so applicant can retry', async () => {
  (api.getJobRecommendations as jest.Mock).mockResolvedValue({
    verified_skills: ['PHP', 'Laravel'],
    jobs: [{
      id: 3,
      title: 'Junior Laravel Developer',
      company: 'Northstar Digital',
      location: 'Remote',
      employment_type: 'Full-time',
      description: 'Build Laravel APIs.',
      required_skills: ['PHP', 'Laravel'],
      matched_skills: ['PHP', 'Laravel'],
      match_score: 100,
      application: { id: 21, status: 'submitted' },
    }],
  });
  (api.startMockInterview as jest.Mock).mockRejectedValue({ message: 'AI service busy. Retry shortly.' });
  (api.getApiErrorMessage as jest.Mock).mockImplementation((error) => error?.message || 'Error');

  const { findByText } = render(
    <JobRecommendations route={{ params: { resumeId: 10 } }} navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />
  );

  fireEvent.press(await findByText('Retry mock interview'));
  expect(await findByText('AI service busy. Retry shortly.')).toBeTruthy();
  expect(await findByText('Retry mock interview')).toBeTruthy();
});
