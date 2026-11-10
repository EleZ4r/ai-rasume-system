import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createManagedJob, getApiErrorMessage, listManagedJobs } from '../../services/api';
import { ActionButton, Header, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';

type JobListing = {
  id: number;
  title: string;
  company: string;
  location: string;
  employment_type: string;
  description: string;
  required_skills: string[];
};

const emptyForm = {
  title: '',
  company: '',
  location: 'Remote',
  employment_type: 'Full-time',
  description: '',
  skills: '',
};

export default function JobManagement({ navigation }: any) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listManagedJobs();
      setJobs(Array.isArray(result) ? result : []);
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (field: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    const requiredSkills = [...new Set(form.skills.split(',').map((skill) => skill.trim()).filter(Boolean))];
    if (!form.title.trim() || !form.company.trim() || !form.description.trim() || requiredSkills.length === 0) {
      setError('Enter a title, company, description, and at least one required skill.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createManagedJob({
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || 'Remote',
        employment_type: form.employment_type.trim() || 'Full-time',
        description: form.description.trim(),
        required_skills: requiredSkills,
      });
      setForm(emptyForm);
      setMessage('Job listing added. It is now available for applicant matching.');
      await load();
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Header eyebrow="PEOPLE & TALENT" title="Job listings" subtitle="Create openings that applicants can discover through their verified skills." />

      <View style={styles.section}>
        <View style={styles.formHeading}>
          <View style={styles.formIcon}><Ionicons name="briefcase-outline" size={20} color="#1677ff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Create a job listing</Text>
            <Text style={styles.formHint}>Add the role details and skills applicants should have.</Text>
          </View>
        </View>
        <Text style={styles.label}>Job title</Text>
        <TextInput accessibilityLabel="Job title" value={form.title} onChangeText={(value) => update('title', value)} placeholder="e.g. Junior Laravel Developer" placeholderTextColor="#8795a8" style={styles.input} returnKeyType="next" />
        <Text style={styles.label}>Company</Text>
        <TextInput accessibilityLabel="Company" value={form.company} onChangeText={(value) => update('company', value)} placeholder="e.g. Northstar Digital" placeholderTextColor="#8795a8" style={styles.input} returnKeyType="next" />
        <View style={styles.row}>
          <View style={styles.half}><Text style={styles.label}>Location</Text><TextInput accessibilityLabel="Location" value={form.location} onChangeText={(value) => update('location', value)} placeholder="Remote" placeholderTextColor="#8795a8" style={styles.input} /></View>
          <View style={styles.half}><Text style={styles.label}>Employment type</Text><TextInput accessibilityLabel="Employment type" value={form.employment_type} onChangeText={(value) => update('employment_type', value)} placeholder="Full-time" placeholderTextColor="#8795a8" style={styles.input} /></View>
        </View>
        <Text style={styles.label}>Description</Text>
        <TextInput accessibilityLabel="Description" multiline value={form.description} onChangeText={(value) => update('description', value)} placeholder="Describe the role, responsibilities, and expectations" placeholderTextColor="#8795a8" style={[styles.input, styles.multiline]} />
        <Text style={styles.label}>Required skills</Text>
        <TextInput accessibilityLabel="Required skills" value={form.skills} onChangeText={(value) => update('skills', value)} placeholder="Separate skills with commas, e.g. Laravel, PHP, MySQL" placeholderTextColor="#8795a8" style={styles.input} />
        <Text style={styles.fieldHint}>Applicants are matched to these skills after verification.</Text>
        {error ? <View accessibilityRole="alert" style={styles.notice}><Ionicons name="alert-circle-outline" size={18} color="#b42318" /><Text style={styles.error}>{error}</Text></View> : null}
        {message ? <View accessibilityRole="alert" style={[styles.notice, styles.successNotice]}><Ionicons name="checkmark-circle-outline" size={18} color="#147443" /><Text style={styles.success}>{message}</Text></View> : null}
        <View style={{ marginTop: 16 }}>
          {saving ? <View style={styles.saving}><ActivityIndicator color="#1677ff" /><Text style={styles.savingText}>Adding job listing...</Text></View> : <ActionButton title="Publish job listing" disabled={saving} icon="add-circle-outline" onPress={submit} />}
        </View>
      </View>

      <View style={styles.listHeader}>
        <View><Text style={styles.sectionTitle}>Published roles</Text><Text style={styles.listHint}>{jobs.length} {jobs.length === 1 ? 'listing' : 'listings'} available</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh job listings" onPress={load} style={styles.refreshButton}><Ionicons name="refresh-outline" size={15} color="#1677ff" /><Text style={styles.refresh}>Refresh</Text></Pressable>
      </View>
      {loading ? <View style={styles.loading}><ActivityIndicator color="#1677ff" /><Text style={styles.listHint}>Loading job listings...</Text></View> : jobs.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="briefcase-outline" size={22} color="#1677ff" /></View>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptyHint}>Publish your first role and it will be available for applicant matching.</Text>
        </View>
      ) : jobs.map((job) => (
        <View key={job.id} style={styles.job}>
          <View style={styles.jobHeading}>
            <View style={styles.jobIcon}><Ionicons name="briefcase-outline" size={18} color="#1677ff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.company}>{job.company} · {job.location}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#147443" />
          </View>
          <View style={styles.employment}><Text style={styles.employmentText}>{job.employment_type}</Text></View>
          <Text style={styles.description}>{job.description}</Text>
          <Text style={styles.skillsLabel}>REQUIRED SKILLS</Text>
          <View style={styles.skillList}>{job.required_skills.map((skill) => <View key={skill} style={styles.skill}><Text style={styles.skills}>{skill}</Text></View>)}</View>
        </View>
      ))}
    </Screen>
  );
}

const styles: Record<string, any> = {
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 20, marginTop: 0, shadowColor: colors.ink, shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  formIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#12233f', fontSize: 16, fontWeight: '800' },
  formHint: { color: '#71819a', fontSize: 11, lineHeight: 16, marginTop: 3 },
  label: { color: '#29415f', fontSize: 12, fontWeight: '800', marginTop: 15, marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, backgroundColor: '#fbfcfe', fontSize: 14 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  fieldHint: { color: '#8795a8', fontSize: 11, lineHeight: 16, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 10, backgroundColor: '#fff5f4', marginTop: 12 },
  successNotice: { backgroundColor: '#f0faf4' },
  error: { color: '#a22b24', fontSize: 12, lineHeight: 18, flex: 1 },
  success: { color: '#167044', fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '700' },
  saving: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  savingText: { color: '#52627a', fontSize: 13, fontWeight: '700' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 9 },
  listHint: { color: '#71819a', fontSize: 11, marginTop: 4 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  refresh: { color: '#1677ff', fontSize: 11, fontWeight: '800' },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 22 },
  empty: { alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 24, marginTop: 6 },
  emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#e7f1ff', marginBottom: 11 },
  emptyTitle: { color: '#12233f', fontSize: 14, fontWeight: '800' },
  emptyHint: { color: '#71819a', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  job: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 17, marginTop: 9 },
  jobHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  jobTitle: { color: '#12233f', fontSize: 14, fontWeight: '800' },
  company: { color: '#71819a', fontSize: 11, marginTop: 4 },
  employment: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, marginTop: 12 },
  employmentText: { color: '#40536c', fontSize: 10, fontWeight: '700' },
  description: { color: '#52627a', fontSize: 12, lineHeight: 18, marginTop: 11 },
  skillsLabel: { color: '#8795a8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 14 },
  skillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  skill: { backgroundColor: '#e5f5eb', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  skills: { color: '#167044', fontSize: 10, fontWeight: '700' },
};
