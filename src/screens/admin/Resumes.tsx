import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiErrorMessage, listAdminResumes } from '../../services/api';
import { ActionButton, Card, Field, Header, Screen, StatusBadge } from '../../components/AppUI';
import { colors } from '../../constants/theme';

export default function Resumes({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page, query = q, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listAdminResumes(p, query);
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(page, q); }, [page]);

  return (
    <Screen>
      <Header eyebrow="PEOPLE & TALENT" title="Applicant resumes" subtitle="Find an applicant and review their resume and AI feedback." />
      <Card style={styles.searchCard}>
        <View style={styles.searchHeading}>
          <View style={styles.searchIcon}><Ionicons name="search-outline" size={19} color="#1677ff" /></View>
          <View>
            <Text style={styles.cardTitle}>Search applicants</Text>
            <Text style={styles.cardHint}>Search by applicant name or file name.</Text>
          </View>
        </View>
        <Field
          label="Name or file"
          value={q}
          onChangeText={setQ}
          placeholder="e.g. Alex Morgan"
          icon="search-outline"
          returnKeyType="search"
          onSubmitEditing={() => { setPage(1); load(1, q); }}
        />
        <View style={{ marginTop: 13 }}><ActionButton title="Search resumes" icon="search-outline" onPress={() => { setPage(1); load(1, q); }} disabled={loading} /></View>
      </Card>
      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load resumes</Text>
          <Text style={styles.errorText}>{error}</Text>
          <ActionButton title="Try again" onPress={() => load(page, q)} />
        </Card>
      ) : null}
      <FlatList
        style={styles.list}
        data={data?.data || []}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(page, q, true)} tintColor="#1677ff" colors={['#1677ff']} />}
        ListEmptyComponent={!loading && !error ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="documents-outline" size={22} color="#1677ff" /></View>
            <Text style={styles.emptyTitle}>{q.trim() ? 'No matching resumes' : 'No resumes to review'}</Text>
            <Text style={styles.emptyText}>{q.trim() ? 'Try another name or file name.' : 'Applicant submissions will appear here when available.'}</Text>
          </Card>
        ) : null}
        ListHeaderComponent={loading && !data ? <View style={styles.loading}><ActivityIndicator color="#1677ff" /><Text style={styles.loadingText}>Loading applicant resumes...</Text></View> : (
          <View style={styles.resultsHeading}>
            <Text style={styles.resultsTitle}>Submissions</Text>
            <Text style={styles.resultsCount}>{data?.total ?? 0} {data?.total === 1 ? 'applicant' : 'applicants'}</Text>
          </View>
        )}
        renderItem={({ item }: any) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open resume for ${item.user?.name || 'applicant'}`}
            onPress={() => navigation.navigate('AdminResumeDetail', { resumeId: item.id })}
            style={({ pressed }) => [styles.resume, pressed && styles.resumePressed]}
          >
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.user?.name || 'A').trim().charAt(0).toUpperCase()}</Text></View>
            <View style={styles.resumeContent}>
              <View style={styles.resumeTop}>
                <Text style={styles.applicantName} numberOfLines={1}>{item.user?.name || 'Unknown applicant'}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9aa7b8" />
              </View>
              <Text style={styles.filename} numberOfLines={1}>{item.filename}</Text>
              <View style={styles.resumeBottom}>
                <StatusBadge status={item.status} />
                <Text style={styles.openText}>Open review</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
      {data?.last_page > 1 ? (
        <View style={styles.pagination}>
          <Pressable accessibilityRole="button" disabled={page <= 1 || loading} onPress={() => setPage((p) => Math.max(1, p - 1))} style={[styles.pageButton, (page <= 1 || loading) && styles.pageButtonDisabled]}>
            <Ionicons name="chevron-back" size={16} color="#29415f" /><Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.pageLabel}>Page {data?.current_page || page} of {data?.last_page}</Text>
          <Pressable accessibilityRole="button" disabled={!data?.next_page_url || loading} onPress={() => setPage((p) => p + 1)} style={[styles.pageButton, (!data?.next_page_url || loading) && styles.pageButtonDisabled]}>
            <Text style={styles.pageButtonText}>Next</Text><Ionicons name="chevron-forward" size={16} color="#29415f" />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles: Record<string, any> = {
  searchCard: { marginTop: 0, padding: 17 },
  searchHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  searchIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  cardTitle: { color: '#12233f', fontSize: 14, fontWeight: '800' },
  cardHint: { color: '#71819a', fontSize: 11, marginTop: 3 },
  errorCard: { borderColor: '#f1c9c6', backgroundColor: '#fffafa' },
  errorTitle: { color: '#8c241e', fontSize: 15, fontWeight: '800' },
  errorText: { color: '#a22b24', fontSize: 13, lineHeight: 19, marginVertical: 7 },
  list: { marginTop: 17 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { color: '#71819a', fontSize: 13 },
  resultsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultsTitle: { color: '#12233f', fontSize: 16, fontWeight: '800' },
  resultsCount: { color: '#71819a', fontSize: 11, fontWeight: '600' },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#e7f1ff', marginBottom: 12 },
  emptyTitle: { color: '#12233f', fontSize: 15, fontWeight: '800' },
  emptyText: { color: '#71819a', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 14, marginBottom: 9 },
  resumePressed: { opacity: 0.82 },
  avatar: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  avatarText: { color: '#29415f', fontSize: 16, fontWeight: '800' },
  resumeContent: { flex: 1 },
  resumeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  applicantName: { color: '#12233f', fontSize: 14, fontWeight: '800', flex: 1 },
  filename: { color: '#71819a', fontSize: 12, marginTop: 3 },
  resumeBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  openText: { color: '#1677ff', fontSize: 11, fontWeight: '800' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 },
  pageButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: { color: '#29415f', fontSize: 11, fontWeight: '700' },
  pageLabel: { color: '#71819a', fontSize: 11, fontWeight: '600' },
};
