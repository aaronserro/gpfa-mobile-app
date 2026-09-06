import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ForumModerationQueueItem } from '../../api/types';
import { Flag, ShieldWarning, Trash } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../../ds/tokens';

export default function ForumModerationPanel({
  reports,
  loading,
  error,
  pendingReportId,
  onRefresh,
  onOpen,
  onDismiss,
  onRemove,
}: {
  reports: ForumModerationQueueItem[];
  loading: boolean;
  error: Error | null;
  pendingReportId: string | null;
  onRefresh: () => void;
  onOpen: (report: ForumModerationQueueItem) => void;
  onDismiss: (reportId: string) => Promise<boolean>;
  onRemove: (reportId: string) => Promise<boolean>;
}) {
  const { t } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={[styles.heading, { color: t.inkStrong }]}>Reported content</Text>
          <Text style={[styles.subheading, { color: t.inkMuted }]}>Private reports from members of this working group.</Text>
        </View>
        <View style={[styles.count, { backgroundColor: t.surfaceSoft }]}>
          <Text style={[styles.countText, { color: t.inkMuted }]}>{reports.length}</Text>
        </View>
      </View>

      {loading ? (
        <StateCard title="Loading reports" body="Fetching the moderation queue." />
      ) : error ? (
        <StateCard title="Reports unavailable" body={error.message} actionLabel="Try again" onAction={onRefresh} />
      ) : reports.length === 0 ? (
        <StateCard title="No pending reports" body="New member reports will appear here." />
      ) : (
        <View style={styles.cards}>
          {reports.map((report) => {
            const pending = pendingReportId === report.id;
            return (
              <View
                key={report.id}
                style={[styles.card, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.category, { borderColor: alpha(t.brandAmber, 0.4), backgroundColor: alpha(t.brandAmber, 0.1) }]}>
                    <Flag size={12} color={t.brandAmber} />
                    <Text style={[styles.categoryText, { color: t.brandAmber }]}>{categoryLabel(report.category)}</Text>
                  </View>
                  <Text style={[styles.date, { color: t.inkFaint }]}>{formatDate(report.createdAt)}</Text>
                </View>

                {!!report.targetTitle && (
                  <Text numberOfLines={2} style={[styles.title, { color: t.inkStrong }]}>{report.targetTitle}</Text>
                )}
                <Text numberOfLines={4} style={[styles.snapshot, { color: t.inkBody }]}>
                  {report.targetBody || 'No content remained when this report was captured.'}
                </Text>
                <Text style={[styles.meta, { color: t.inkMuted }]}>
                  {report.targetType === 'thread' ? 'Post' : 'Reply'} by {report.author.name}
                </Text>
                <Text style={[styles.meta, { color: t.inkMuted }]}>Reported by {report.reporter.name}</Text>
                {!!report.details && (
                  <View style={[styles.details, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
                    <Text style={[styles.detailsLabel, { color: t.inkFaint }]}>Member details</Text>
                    <Text style={[styles.detailsText, { color: t.inkBody }]}>{report.details}</Text>
                  </View>
                )}

                <View style={[styles.actions, { borderTopColor: t.ruleHairline }]}>
                  <ActionButton
                    label="Open"
                    disabled={pending}
                    onPress={() => onOpen(report)}
                  />
                  <ActionButton
                    label="Dismiss"
                    disabled={pending}
                    onPress={() => {
                      Alert.alert('Dismiss report?', 'The content will remain available and this report will be closed.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Dismiss', onPress: () => void onDismiss(report.id) },
                      ]);
                    }}
                  />
                  <ActionButton
                    label={pending ? 'Working…' : 'Remove'}
                    destructive
                    disabled={pending}
                    onPress={() => {
                      Alert.alert(
                        'Remove reported content?',
                        report.targetType === 'thread'
                          ? 'The post will be removed from member views and all pending reports for it will be resolved.'
                          : 'The reply will become an empty moderator tombstone and all pending reports for it will be resolved.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => void onRemove(report.id) },
                        ]
                      );
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function StateCard({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.state, { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) }]}>
      <ShieldWarning size={20} color={t.inkMuted} />
      <View style={styles.flex}>
        <Text style={[styles.stateTitle, { color: t.inkStrong }]}>{title}</Text>
        <Text style={[styles.stateBody, { color: t.inkMuted }]}>{body}</Text>
        {!!actionLabel && !!onAction && (
          <Pressable onPress={onAction} accessibilityRole="button">
            <Text style={[styles.retry, { color: t.surfaceAnchor }]}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  disabled,
  destructive = false,
  onPress,
}: {
  label: string;
  disabled: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.action,
        {
          borderColor: destructive ? t.brandBrick : t.ruleHairline,
          backgroundColor: destructive ? alpha(t.brandBrick, 0.08) : t.surfacePaper,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      {destructive && <Trash size={13} color={t.brandBrickInk} />}
      <Text style={[styles.actionText, { color: destructive ? t.brandBrickInk : t.inkMuted }]}>{label}</Text>
    </Pressable>
  );
}

function categoryLabel(value: ForumModerationQueueItem['category']): string {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heading: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  subheading: { marginTop: 3, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  count: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: sans(600), fontSize: 11 },
  cards: { gap: 10 },
  card: { overflow: 'hidden', borderWidth: 1, borderRadius: 9, paddingTop: 13, paddingHorizontal: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  category: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 13, paddingHorizontal: 8 },
  categoryText: { fontFamily: sans(600), fontSize: 10.5 },
  date: { fontFamily: sans(400), fontSize: 10 },
  title: { marginTop: 10, fontFamily: sans(600), fontSize: 14.5, lineHeight: 20 },
  snapshot: { marginTop: 8, fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  meta: { marginTop: 5, fontFamily: sans(400), fontSize: 11.5 },
  details: { marginTop: 10, borderWidth: 1, borderRadius: 7, padding: 10 },
  detailsLabel: { fontFamily: sans(600), fontSize: 10.5 },
  detailsText: { marginTop: 4, fontFamily: sans(400), fontSize: 12, lineHeight: 18 },
  actions: { marginTop: 13, marginHorizontal: -13, flexDirection: 'row', gap: 7, borderTopWidth: 1, padding: 10 },
  action: { minHeight: 38, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8 },
  actionText: { fontFamily: sans(600), fontSize: 11.5 },
  state: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 9, padding: 15 },
  stateTitle: { fontFamily: sans(600), fontSize: 14 },
  stateBody: { marginTop: 3, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  retry: { marginTop: 8, fontFamily: sans(600), fontSize: 12.5 },
});
