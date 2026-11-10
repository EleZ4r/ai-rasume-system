import axios from 'axios';

const isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined';
const isWeb = isBrowser && typeof document !== 'undefined';

const defaultApiBase = isWeb && window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api'
  : 'http://192.168.100.228:8000/api';

const envBase = process.env.EXPO_PUBLIC_API_URL || defaultApiBase;
const API_BASE = (isWeb && envBase.includes('192.168.100.228')
  ? 'http://localhost:8000/api'
  : envBase).replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_BASE}/`,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function getApiErrorMessage(error: any) {
  const response = error?.response?.data;
  const validationErrors = response?.errors;
  if (validationErrors) {
    return Object.values(validationErrors).flat().join(' ');
  }

  return response?.message || error?.message || 'Unable to connect to the API';
}

export async function register(payload: any) {
  const res = await api.post('register', payload);
  return res.data;
}

export async function login(payload: any) {
  const res = await api.post('login', payload);
  return res.data;
}

export async function getProfile() {
  const res = await api.get('profile');
  return res.data;
}

export async function logout() {
  const res = await api.post('logout');
  return res.data;
}

export async function listUserResumes() {
  const res = await api.get('resumes');
  return res.data;
}

export async function uploadResume(fileUri: string, filename: string, mimeType = 'application/pdf', resumeId?: number) {
  const form = new FormData();

  if (typeof window !== 'undefined') {
    const file = await fetch(fileUri).then((response) => response.blob());
    form.append('file', file, filename);
  } else {
    // React Native FormData expects a URI-backed file object.
    // @ts-ignore
    form.append('file', { uri: fileUri, name: filename, type: mimeType });
  }

  const res = resumeId
    ? await api.put(`resume/${resumeId}/replace`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    : await api.post('resume/upload', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

  return res.data;
}

export async function analyzeResume(id: number) {
  const res = await api.post(`resume/${id}/analyze`, {});
  return res.data;
}

export async function submitVerification(id: number, answers: string[]) {
  const res = await api.post(`resume/${id}/verify`, { answers }, { timeout: 240000 });
  return res.data;
}

export async function generateReviewer(id: number) {
  const res = await api.post(`resume/${id}/reviewer`, {}, { timeout: 120000 });
  return res.data;
}

export async function getJobRecommendations(resumeId: number) {
  const res = await api.get('jobs/recommendations', { params: { resume_id: resumeId }, timeout: 180000 });
  return res.data;
}

export async function applyToJob(resumeId: number, jobId: number) {
  const res = await api.post('applications', { resume_id: resumeId, job_id: jobId });
  return res.data;
}

export async function listApplicationUpdates() {
  const res = await api.get('applications/updates');
  return res.data;
}

export async function startMockInterview(applicationId: number) {
  const res = await api.post(`applications/${applicationId}/mock-interview`, {}, { timeout: 180000 });
  return res.data;
}

export async function submitMockInterviewAnswer(interviewId: number, questionIndex: number, answer: string) {
  const res = await api.post(`mock-interviews/${interviewId}/answers`, { question_index: questionIndex, answer }, { timeout: 300000 });
  return res.data;
}

export async function getMockInterview(interviewId: number) {
  const res = await api.get(`mock-interviews/${interviewId}`);
  return res.data;
}

export async function transcribeMockInterviewAudio(interviewId: number, questionIndex: number, audioUri: string) {
  const form = new FormData();
  if (typeof window !== 'undefined') {
    const audio = await fetch(audioUri).then((response) => response.blob());
    form.append('audio', audio, 'interview-answer.webm');
  } else {
    // @ts-ignore React Native FormData supports URI-backed files.
    form.append('audio', { uri: audioUri, name: 'interview-answer.m4a', type: 'audio/mp4' });
  }
  form.append('question_index', String(questionIndex));

  const res = await api.post(`mock-interviews/${interviewId}/transcribe`, form, {
    timeout: 180000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function generateMockInterviewReport(interviewId: number) {
  const res = await api.post(`mock-interviews/${interviewId}/report`, {}, { timeout: 180000 });
  return res.data;
}

export async function getResume(id: number) {
  const res = await api.get(`resume/${id}`);
  return res.data;
}

export async function getAdminResume(id: number) {
  const res = await api.get(`admin/resumes/${id}`);
  return res.data;
}

export async function listAdminResumes(page = 1, q = '') {
  const params: any = { page };
  if (q) params.q = q;
  const res = await api.get('admin/resumes', { params });
  return res.data;
}

export async function listManagedJobs() {
  const res = await api.get('admin/jobs');
  return res.data;
}

export async function createManagedJob(payload: {
  title: string;
  company: string;
  location: string;
  employment_type: string;
  description: string;
  required_skills: string[];
}) {
  const res = await api.post('admin/jobs', payload);
  return res.data;
}

export async function listAdminInterviews(pendingOnly = false) {
  const res = await api.get('admin/mock-interviews', { params: pendingOnly ? { status: 'pending' } : {} });
  return res.data;
}

export async function getAdminInterview(interviewId: number) {
  const res = await api.get(`admin/mock-interviews/${interviewId}`);
  return res.data;
}

export function resolveAdminInterviewAudioUrl(path: string) {
  return new URL(path, api.defaults.baseURL).toString();
}

export async function decideAdminInterview(interviewId: number, decision: 'passed' | 'rejected', note: string) {
  const res = await api.post(`admin/mock-interviews/${interviewId}/decision`, { decision, note });
  return res.data;
}

export default api;
