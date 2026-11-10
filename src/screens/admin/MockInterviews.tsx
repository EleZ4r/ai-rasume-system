import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiErrorMessage, listAdminInterviews } from '../../services/api';
import { ActionButton, Card, Header, Screen, StatusBadge } from '../../components/AppUI';
import { colors } from '../../constants/theme';

type InterviewSummary = {
  id: number;
  status: string;
  review_decision: string | null;
  score: number | null;
  applicant: string;
  job_title: string;
  company: string;
};

export default function MockInterviews({ navigation }: any) {
  const [items, setItems] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await listAdminInterviews(pendingOnly);
      setItems(Array.isArray(result.data) ? result.data : []);
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [pendingOnly]);

  return (
    <Screen>
      <Header eyebrow="PEOPLE & TALENT" title="Interview reviews" subtitle="Review applicant interviews and record a decision when you are ready." />
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><Ionicons name="mic-outline" size={21} color="#1677ff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{pendingOnly ? 'Pending review' : 'Interview history'}</Text>
          <Text style={styles.summaryDescription}>{pendingOnly ? 'Focus on interviews awaiting a decision.' : 'Browse pending and previously reviewed interviews.'}</Text>
        </View>
        <Text style={styles.count}>{items.length}</Text>
      </View>
      <View accessibilityRole="tablist" style={styles.filters}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: pendingOnly }} style={[styles.filter, pendingOnly && styles.filterSelected]} onPress={() => setPendingOnly(true)}>
          <Text style={[styles.filterText, pendingOnly && styles.filterTextSelected]}>Needs review</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: !pendingOnly }} style={[styles.filter, !pendingOnly && styles.filterSelected]} onPress={() => setPendingOnly(false)}>
          <Text style={[styles.filterText, !pendingOnly && styles.filterTextSelected]}>All interviews</Text>
        </Pressable>
      </View>
      {error ? <Card style={styles.errorCard}><Text style={styles.errorTitle}>Could not load interviews</Text><Text style={styles.errorText}>{error}</Text><View style={{ marginTop: 12 }}><ActionButton title="Try again" onPress={() => load()} /></View></Card> : null}
      {loading && !items.length ? <View style={styles.loading}><ActivityIndicator color="#1677ff" /><Text style={styles.loadingText}>Loading interview reviews...</Text></View> : null}
      {!loading && !error && items.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="checkmark-done-outline" size={23} color="#167044" /></View>
          <Text style={styles.emptyTitle}>{pendingOnly ? 'You are all caught up' : 'No interviews yet'}</Text>
          <Text style={styles.emptyText}>{pendingOnly ? 'New completed interviews will show here when they are ready for review.' : 'Applicant interview submissions will appear here.'}</Text>
        </Card>
      ) : null}
      {items.length > 0 ? (
        <FlatList
          style={styles.list}
          data={items}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1677ff" colors={['#1677ff']} />}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Review interview for ${item.applicant}, ${item.job_title}`}
              onPress={() => navigation.navigate('AdminInterviewDetail', { interviewId: item.id })}
              style={({ pressed }) => [styles.interview, pressed && styles.interviewPressed]}
            >
              <View style={styles.applicantAvatar}><Text style={styles.avatarText}>{(item.applicant || 'A').trim().charAt(0).toUpperCase()}</Text></View>
              <View style={styles.interviewContent}>
                <View style={styles.interviewTop}>
                  <Text style={styles.applicant}>{item.applicant || 'Applicant'}</Text>
                  <StatusBadge status={item.review_decision || 'pending'} />
                </View>
                <Text style={styles.job}>{item.job_title} · {item.company}</Text>
                <View style={styles.interviewBottom}>
                  <Text style={styles.score}>AI score: {item.score == null ? 'Not available' : `${item.score}/100`}</Text>
                  <View style={styles.openReview}><Text style={styles.openReviewText}>Review</Text><Ionicons name="arrow-forward" size={14} color="#1677ff" /></View>
                </View>
              </View>
            </Pressable>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles: Record<string, any> = {
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 8, marginBottom: 14 },
  summaryIcon: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  summaryTitle: { color: '#12233f', fontSize: 14, fontWeight: '800' },
  summaryDescription: { color: '#71819a', fontSize: 11, lineHeight: 16, marginTop: 3 },
  count: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  filters: { flexDirection: 'row', padding: 4, backgroundColor: '#eaf0f7', borderRadius: 8, marginBottom: 8 },
  filter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 6 },
  filterSelected: { backgroundColor: '#fff', shadowColor: '#12233f', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  filterText: { color: '#71819a', fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: '#12233f' },
  errorCard: { borderColor: '#f1c9c6', backgroundColor: '#fffafa' },
  errorTitle: { color: '#8c241e', fontSize: 15, fontWeight: '800' },
  errorText: { color: '#a22b24', fontSize: 13, lineHeight: 19, marginTop: 5 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { color: '#71819a', fontSize: 13 },
  emptyCard: { alignItems: 'center', paddingVertical: 26 },
  emptyIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.accentSoft, marginBottom: 13 },
  emptyTitle: { color: '#12233f', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#71819a', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  list: { marginTop: 8 },
  interview: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 14, marginBottom: 10 },
  interviewPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  applicantAvatar: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  avatarText: { color: '#29415f', fontSize: 16, fontWeight: '800' },
  interviewContent: { flex: 1 },
  interviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  applicant: { color: '#12233f', fontSize: 14, fontWeight: '800', flex: 1 },
  job: { color: '#52627a', fontSize: 12, lineHeight: 18, marginTop: 5 },
  interviewBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#edf1f6', marginTop: 12, paddingTop: 10 },
  score: { color: '#71819a', fontSize: 11, fontWeight: '600' },
  openReview: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openReviewText: { color: '#1677ff', fontSize: 12, fontWeight: '800' },
};
