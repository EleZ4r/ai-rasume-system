import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { analyzeResume, getApiErrorMessage, listUserResumes, uploadResume } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ActionButton, Card, Header, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';

export default function ResumeUpload({ navigation }: any) {
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingResume, setLoadingResume] = useState(true);
  const [resume, setResume] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { user, logout } = useContext(AuthContext);

  const loadResume = async () => {
    setLoadingResume(true);
    try {
      const resumes = await listUserResumes();
      const currentResume = Array.isArray(resumes) ? resumes[0] ?? null : null;
      setResume(currentResume);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setLoadingResume(false);
    }
  };

  useEffect(() => {
    loadResume();
  }, []);

  if (user?.is_admin || user?.is_hr) {
    return (
      <Screen scroll>
        <Header eyebrow={user?.is_admin ? 'ADMINISTRATOR' : 'HR REVIEWER'} title="Upload unavailable" subtitle="Review staff accounts cannot upload applicant resumes." />
        <Card>
          <Text>Use the review workspace to inspect applicants and their interviews.</Text>
        </Card>
        <View style={{ height: 12 }} />
        <ActionButton title={user?.is_admin ? 'Admin Dashboard' : 'Mock interview reviews'} onPress={() => navigation.navigate(user?.is_admin ? 'AdminResumes' : 'AdminMockInterviews')} />
        <View style={{ height: 8 }} />
        <ActionButton title="My Resumes" secondary onPress={() => navigation.navigate('Dashboard')} />
        <View style={{ height: 8 }} />
        <ActionButton title="Log out" secondary onPress={() => logout()} />
      </Screen>
    );
  }

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      setStatus('Checking and uploading your PDF...');
      setUploading(true);
      const file = res.assets[0];
      const upload = await uploadResume(file.uri, file.name ?? 'resume.pdf', file.mimeType ?? 'application/pdf', resume?.id);
      await analyzeResume(upload.id);
      setStatus('Resume accepted. Analysis queued.');
      setResume(upload);
      navigation.navigate('ResumeAnalysis', { resumeId: upload.id });
    } catch (e: any) {
      setStatus(`Upload failed: ${getApiErrorMessage(e)}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <Header eyebrow="APPLICANT WORKSPACE" title="Upload a resume" subtitle={`Signed in as ${user?.name || 'Applicant'}`} />
      <Card>
        <View style={styles.introIcon}><Ionicons name="cloud-upload-outline" size={24} color="#1677ff" /></View>
        <Text style={styles.cardTitle}>{resume ? 'Refresh your application' : 'Share your experience'}</Text>
        <Text style={styles.description}>Submit one PDF resume. You can replace it any time; we will review the latest version.</Text>
        <View style={styles.requirementList}>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle" size={17} color="#147443" />
            <Text style={styles.requirementText}>PDF file, up to 10 MB</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle" size={17} color="#147443" />
            <Text style={styles.requirementText}>Readable text, not a scanned image</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons name="checkmark-circle" size={17} color="#147443" />
            <Text style={styles.requirementText}>Contact details and resume sections</Text>
          </View>
        </View>
        {loadingResume ? <ActivityIndicator style={{ marginVertical: 18 }} color="#1677ff" /> : null}
        {!loadingResume && resume ? (
          <View style={styles.currentResume}>
            <View style={styles.pdfIcon}><Ionicons name="document-text" size={19} color="#1677ff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLabel}>CURRENT RESUME</Text>
              <Text style={styles.currentFilename} numberOfLines={1}>{resume.filename}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#147443" />
          </View>
        ) : null}
        {loadError ? <View style={styles.errorNotice}><Ionicons name="alert-circle-outline" size={18} color="#b42318" /><Text style={styles.errorText}>Could not check your current resume: {loadError}</Text></View> : null}
      {uploading ? (
        <View style={styles.uploading}><ActivityIndicator color="#1677ff" /><Text style={styles.uploadingText}>Checking and uploading your PDF...</Text></View>
      ) : (
        <View style={{ marginTop: 18 }}><ActionButton title={resume ? 'Replace current resume' : 'Choose a PDF resume'} icon={resume ? 'sync-outline' : 'cloud-upload-outline'} onPress={pick} disabled={!user || loadingResume || Boolean(loadError)} /></View>
      )}
      {status ? (
        <View style={[styles.statusNotice, status.startsWith('Upload failed') ? styles.failureNotice : styles.successNotice]}>
          <Ionicons name={status.startsWith('Upload failed') ? 'alert-circle-outline' : 'information-circle-outline'} size={18} color={status.startsWith('Upload failed') ? '#b42318' : '#147443'} />
          <Text style={[styles.statusText, { color: status.startsWith('Upload failed') ? '#b42318' : '#147443' }]}>{status}</Text>
        </View>
      ) : null}
      {!user ? <Text style={{ color: '#b42318', marginTop: 8 }}>You must be logged in to upload</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = {
  introIcon: { width: 50, height: 50, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 8, backgroundColor: colors.primarySoft, marginBottom: 14 },
  cardTitle: { color: '#12233f', fontSize: 19, lineHeight: 25, fontWeight: '800' as const },
  description: { color: '#52627a', fontSize: 14, lineHeight: 21, marginTop: 6 },
  requirementList: { backgroundColor: '#f7f9fc', borderRadius: 8, padding: 14, marginTop: 17, gap: 11 },
  requirement: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 9 },
  requirementText: { color: '#40536c', fontSize: 13, lineHeight: 18, flexShrink: 1 },
  currentResume: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, marginTop: 16 },
  pdfIcon: { width: 38, height: 38, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 8, backgroundColor: colors.primarySoft },
  currentLabel: { color: '#8795a8', fontSize: 9, fontWeight: '800' as const, letterSpacing: 0.8 },
  currentFilename: { color: '#12233f', fontSize: 13, fontWeight: '700' as const, marginTop: 3 },
  errorNotice: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, backgroundColor: '#fff5f4', borderRadius: 8, padding: 11, marginTop: 14 },
  errorText: { color: '#b42318', fontSize: 12, lineHeight: 18, flex: 1 },
  uploading: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 10, marginTop: 20 },
  uploadingText: { color: '#52627a', fontSize: 13, fontWeight: '600' as const },
  statusNotice: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, padding: 12, borderRadius: 8, marginTop: 13 },
  successNotice: { backgroundColor: '#f0faf4' },
  failureNotice: { backgroundColor: '#fff5f4' },
  statusText: { fontSize: 13, lineHeight: 19, fontWeight: '600' as const, flex: 1 },
};
