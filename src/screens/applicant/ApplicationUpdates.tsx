import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, Card, Header, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';
import { getApiErrorMessage, listApplicationUpdates } from '../../services/api';

type ApplicationUpdate = {
  id: number;
  status: string;
  created_at: string;
  job: { title: string; company: string };
  interview: {
    status: string;
    review_decision: 'passed' | 'rejected' | null;
    review_note: string | null;
    reviewed_at: string | null;
  } | null;
};

function getUpdatePresentation(update: ApplicationUpdate) {
  if (update.interview?.review_decision === 'passed') {
    return {
      title: 'You passed your interview',
      message: `Your interview for ${update.job.title} was marked as passed.`,
      icon: 'checkmark-circle-outline' as const,
      color: colors.success,
      background: colors.successSoft,
    };
  }

  if (update.interview?.review_decision === 'rejected') {
    return {
      title: 'Interview result: Not selected',
      message: `Your application for ${update.job.title} was not selected.`,
      icon: 'close-circle-outline' as const,
      color: colors.danger,
      background: '#fff0ef',
    };
  }

  if (update.interview?.status === 'completed') {
    return {
      title: 'Interview complete',
      message: `Your interview for ${update.job.title} is awaiting review.`,
      icon: 'time-outline' as const,
      color: colors.warning,
      background: colors.warningSoft,
    };
  }

  if (update.interview?.status === 'in_progress') {
    return {
      title: 'Interview in progress',
      message: `Continue your interview for ${update.job.title} when you are ready.`,
      icon: 'mic-outline' as const,
      color: colors.primary,
      background: colors.primarySoft,
    };
  }

  return {
    title: 'Application submitted',
    message: `Your application for ${update.job.title} at ${update.job.company} has been submitted.`,
    icon: 'briefcase-outline' as const,
    color: colors.primary,
    background: colors.primarySoft,
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function ApplicationUpdates() {
  const [updates, setUpdates] = useState<ApplicationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUpdates = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await listApplicationUpdates();
      setUpdates(Array.isArray(result) ? result : []);
      setError(null);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadUpdates(true);
    const interval = setInterval(() => loadUpdates(), 30000);
    return () => clearInterval(interval);
  }, [loadUpdates]));

  const refresh = () => {
    setRefreshing(true);
    loadUpdates();
  };

  return (
    <Screen scroll>
      <Header
        eyebrow="APPLICATIONS"
        title="Application updates"
        subtitle="See interview progress and decisions for the jobs you applied to."
      />
      <View style={styles.refreshButton}>
        <ActionButton
          title={refreshing ? 'Refreshing...' : 'Refresh updates'}
          icon="refresh-outline"
          secondary
          onPress={refresh}
          disabled={refreshing || loading}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Loading your application updates...</Text>
        </View>
      ) : error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.cardTitle}>Could not load updates</Text>
          <Text style={styles.muted}>{error}</Text>
          <View style={styles.retryButton}>
            <ActionButton title="Try again" onPress={() => loadUpdates(true)} />
          </View>
        </Card>
      ) : updates.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>No application updates yet</Text>
          <Text style={styles.muted}>Your applications and interview results will appear here.</Text>
        </Card>
      ) : updates.map((update) => {
        const presentation = getUpdatePresentation(update);
        const date = formatDate(update.interview?.reviewed_at || update.created_at);

        return (
          <Card key={update.id} style={styles.updateCard}>
            <View style={styles.updateHeading}>
              <View style={[styles.statusIcon, { backgroundColor: presentation.background }]}>
                <Ionicons name={presentation.icon} size={21} color={presentation.color} />
              </View>
              <View style={styles.updateCopy}>
                <Text style={styles.cardTitle}>{presentation.title}</Text>
                <Text style={styles.jobTitle}>{update.job.title}</Text>
                <Text style={styles.company}>{update.job.company}</Text>
              </View>
            </View>
            <Text style={styles.message}>{presentation.message}</Text>
            {update.interview?.review_note ? (
              <View style={styles.note}>
                <Text style={styles.noteLabel}>Reviewer note</Text>
                <Text style={styles.noteText}>{update.interview.review_note}</Text>
              </View>
            ) : null}
            {date ? <Text style={styles.date}>{date}</Text> : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = {
  refreshButton: { marginTop: -12, marginBottom: 10 },
  loading: { alignItems: 'center' as const, gap: 10, paddingVertical: 32 },
  emptyCard: { alignItems: 'flex-start' as const, marginTop: 4 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.primarySoft, marginBottom: 14 },
  updateCard: { marginTop: 10 },
  updateHeading: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  updateCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '800' as const },
  jobTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' as const, marginTop: 5 },
  company: { color: colors.muted, fontSize: 12, marginTop: 2 },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 13 },
  note: { backgroundColor: colors.background, borderRadius: 8, padding: 12, marginTop: 12 },
  noteLabel: { color: colors.ink, fontSize: 11, fontWeight: '800' as const, marginBottom: 4 },
  noteText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  date: { color: '#8795a8', fontSize: 11, marginTop: 12 },
  errorCard: { borderColor: '#f1c9c6', backgroundColor: '#fffafa' },
  retryButton: { width: '100%' as const, marginTop: 12 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
};
