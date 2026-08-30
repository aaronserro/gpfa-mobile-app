import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  WorkingGroupResourceModerationFilter,
  WorkingGroupResourceModerationSubmission,
  WorkingGroupResourceReviewInput,
} from '../../api/types';
import { CheckCircle, FileText, Link, Paperclip, X } from '../../ds/icons';
import { Input } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../../ds/tokens';

const FILTERS: Array<{ id: WorkingGroupResourceModerationFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'changes_requested', label: 'Changes requested' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'removed', label: 'Removed' },
];

export default function ResourceModerationPanel({
  submissions,
  loading,
  error,
  pendingSubmissionId,
  onRefresh,
  onReview,
  onRemove,
}: {
  submissions: WorkingGroupResourceModerationSubmission[];
  loading: boolean;
  error: Error | null;
  pendingSubmissionId: string | null;
  onRefresh: () => void;
  onReview: (submissionId: string, input: WorkingGroupResourceReviewInput) => Promise<boolean>;
  onRemove: (submissionId: string) => Promise<boolean>;
}) {
  const { t } = useTheme();
  const [filter, setFilter] = useState<WorkingGroupResourceModerationFilter>('all');
  const [selected, setSelected] = useState<WorkingGroupResourceModerationSubmission | null>(null);

  const filtered = useMemo(
    () =>
      submissions.filter((submission) => {
        if (filter === 'all') return true;
        if (filter === 'removed') return submission.isRemoved;
        if (filter === 'approved') return submission.status === 'approved' && !submission.isRemoved;
        return submission.status === filter && !submission.isRemoved;
      }),
    [filter, submissions]
  );

  const pendingCount = submissions.filter((submission) => submission.status === 'pending' && !submission.isRemoved).length;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={[styles.heading, { color: t.inkStrong }]}>Resource moderation</Text>
          <Text style={[styles.subheading, { color: t.inkMuted }]}>Review submitted resources before publication.</Text>
        </View>
        <View style={[styles.count, { backgroundColor: t.surfaceSoft }]}>
          <Text style={[styles.countText, { color: t.inkMuted }]}>{pendingCount}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((option) => {
          const active = option.id === filter;
          return (
            <Pressable
              key={option.id}
              onPress={() => setFilter(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.filter,
                {
                  borderColor: active ? t.surfaceAnchor : t.ruleHairline,
                  backgroundColor: active ? t.surfaceAnchor : t.surfacePaper,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? t.inkInverse : t.inkMuted }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <StateCard title="Loading submissions" body="Fetching the moderation queue." />
      ) : error ? (
        <StateCard title="Queue unavailable" body={error.message} actionLabel="Try again" onAction={onRefresh} />
      ) : filtered.length === 0 ? (
        <StateCard title="Nothing to review" body="No submissions match this filter." />
      ) : (
        <View style={styles.cards}>
          {filtered.map((submission) => (
            <Pressable
              key={submission.id}
              onPress={() => setSelected(submission)}
              accessibilityRole="button"
              accessibilityLabel={`Review ${submission.title}`}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: t.ruleHairline,
                  backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : t.surfacePaper,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <StatusPill submission={submission} />
                <Text style={[styles.date, { color: t.inkFaint }]}>{formatDate(submission.submittedAt)}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: t.inkStrong }]}>{submission.title}</Text>
              <Text numberOfLines={1} style={[styles.cardMeta, { color: t.inkMuted }]}>
                {submission.submitter?.fullName ?? 'Contributor'} · {resourceTypeLabel(submission.resourceType)}
              </Text>
              {(submission.files.length > 0 || submission.sourceUrl) && (
                <View style={styles.assetLine}>
                  {submission.files.length > 0 ? <Paperclip size={13} color={t.inkFaint} /> : <Link size={13} color={t.inkFaint} />}
                  <Text style={[styles.assetText, { color: t.inkFaint }]}>
                    {submission.files.length > 0
                      ? `${submission.files.length} file${submission.files.length === 1 ? '' : 's'}`
                      : 'Source link'}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <ReviewSheet
        submission={selected}
        pending={selected?.id === pendingSubmissionId}
        onClose={() => setSelected(null)}
        onReview={async (input) => {
          if (!selected) return;
          if (await onReview(selected.id, input)) setSelected(null);
        }}
        onRemove={() => {
          if (!selected) return;
          Alert.alert(
            'Remove From Library?',
            'The published resource will no longer be available, but its review record will remain.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => {
                  void onRemove(selected.id).then((removed) => {
                    if (removed) setSelected(null);
                  });
                },
              },
            ]
          );
        }}
      />
    </View>
  );
}

function ReviewSheet({
  submission,
  pending,
  onClose,
  onReview,
  onRemove,
}: {
  submission: WorkingGroupResourceModerationSubmission | null;
  pending: boolean;
  onClose: () => void;
  onReview: (input: WorkingGroupResourceReviewInput) => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [reviewerNotes, setReviewerNotes] = useState('');

  useEffect(() => {
    setReviewerNotes(submission?.reviewerNotes ?? '');
  }, [submission?.id, submission?.reviewerNotes]);

  if (!submission) return null;

  const decide = (status: WorkingGroupResourceReviewInput['status']) => {
    const label = status === 'approved' ? 'Approve' : status === 'rejected' ? 'Reject' : 'Request Changes';
    Alert.alert(`${label} Resource?`, `This will update ${submission.title}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: status === 'rejected' ? 'destructive' : 'default',
        onPress: () => void onReview({ status, reviewerNotes: reviewerNotes.trim() || undefined }),
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.scrim} onPress={pending ? undefined : onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.surfacePaper,
              borderTopColor: t.ruleHairline,
              paddingBottom: Math.max(insets.bottom, 18),
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.ruleHairline }]} />
          <View style={styles.sheetHead}>
            <View style={styles.flex}>
              <Text style={[styles.sheetTitle, { color: t.inkStrong }]}>{submission.title}</Text>
              <Text style={[styles.sheetMeta, { color: t.inkMuted }]}>
                {submission.submitter?.fullName ?? 'Contributor'} · {formatDate(submission.submittedAt)}
              </Text>
            </View>
            <Pressable onPress={onClose} disabled={pending} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close review">
              <X size={18} color={t.inkMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
            <Detail label="Status" value={statusLabel(submission)} />
            <Detail label="Resource type" value={resourceTypeLabel(submission.resourceType)} />
            <Detail label="Summary" value={submission.summary ?? 'No summary provided.'} />
            <Detail label="Contributor notes" value={submission.contributorNotes ?? 'No contributor notes provided.'} />
            <Detail label="Tags" value={submission.tags.length ? submission.tags.map((tag) => `#${tag}`).join('  ') : 'No tags provided.'} />
            {!!submission.reviewer && (
              <Detail
                label="Previous review"
                value={`${submission.reviewer.fullName}${submission.reviewedAt ? ` · ${formatDate(submission.reviewedAt)}` : ''}`}
              />
            )}
            {!!submission.reviewerNotes && <Detail label="Reviewer notes" value={submission.reviewerNotes} />}

            {!!submission.sourceUrl && (
              <Pressable
                onPress={() => void Linking.openURL(submission.sourceUrl ?? '')}
                accessibilityRole="link"
                style={[styles.linkRow, { borderColor: t.ruleHairline }]}
              >
                <Link size={15} color={t.surfaceAnchor} />
                <Text numberOfLines={2} style={[styles.linkText, { color: t.surfaceAnchor }]}>Open source link</Text>
              </Pressable>
            )}

            {submission.files.map((file) => (
              <Pressable
                key={file.id}
                onPress={() => file.downloadUrl && void Linking.openURL(file.downloadUrl)}
                disabled={!file.downloadUrl}
                accessibilityRole="link"
                accessibilityState={{ disabled: !file.downloadUrl }}
                style={[styles.linkRow, { borderColor: t.ruleHairline }]}
              >
                <FileText size={15} color={file.downloadUrl ? t.surfaceAnchor : t.inkFaint} />
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[styles.fileName, { color: file.downloadUrl ? t.surfaceAnchor : t.inkMuted }]}>
                    {file.originalFilename}
                  </Text>
                  <Text style={[styles.fileSize, { color: t.inkFaint }]}>{formatBytes(file.byteSize)}</Text>
                </View>
              </Pressable>
            ))}

            {!submission.isRemoved && submission.status !== 'approved' && (
              <>
                <Text style={[styles.notesLabel, { color: t.inkMuted }]}>Reviewer notes</Text>
                <Input
                  value={reviewerNotes}
                  onChangeText={setReviewerNotes}
                  placeholder="Add context for the contributor"
                  multiline
                  textAlignVertical="top"
                  editable={!pending}
                  style={styles.notesInput}
                />
              </>
            )}
          </ScrollView>

          {!submission.isRemoved && (
            <View style={styles.actions}>
              {submission.status === 'approved' ? (
                <ActionButton label={pending ? 'Removing…' : 'Remove From Library'} destructive disabled={pending} onPress={onRemove} />
              ) : (
                <>
                  <ActionButton label="Approve" disabled={pending} onPress={() => decide('approved')} />
                  <ActionButton label="Request Changes" secondary disabled={pending} onPress={() => decide('changes_requested')} />
                  <ActionButton label="Reject" destructive disabled={pending} onPress={() => decide('rejected')} />
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.detail, { borderColor: t.ruleHairline }]}>
      <Text style={[styles.detailLabel, { color: t.inkFaint }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: t.inkStrong }]}>{value}</Text>
    </View>
  );
}

function StateCard({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  const { t } = useTheme();
  return (
    <View style={[styles.state, { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) }]}>
      <Text style={[styles.stateTitle, { color: t.inkStrong }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: t.inkMuted }]}>{body}</Text>
      {!!actionLabel && !!onAction && (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={[styles.retry, { color: t.surfaceAnchor }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function StatusPill({ submission }: { submission: WorkingGroupResourceModerationSubmission }) {
  const { t } = useTheme();
  const label = statusLabel(submission);
  const positive = submission.status === 'approved' && !submission.isRemoved;
  return (
    <View style={[styles.status, { borderColor: positive ? t.brandGreen : t.ruleHairline, backgroundColor: positive ? alpha(t.brandGreen, 0.08) : t.surfacePage }]}>
      {positive && <CheckCircle size={11} weight="fill" color={t.brandGreen} />}
      <Text style={[styles.statusText, { color: positive ? t.brandGreenStrong : t.inkMuted }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, disabled, secondary, destructive }: { label: string; onPress: () => void; disabled: boolean; secondary?: boolean; destructive?: boolean }) {
  const { t } = useTheme();
  const backgroundColor = disabled ? t.muted : destructive ? alpha(t.brandBrick, 0.1) : secondary ? t.surfacePaper : t.surfaceAnchor;
  const color = disabled ? t.inkFaint : destructive ? t.brandBrickInk : secondary ? t.inkStrong : t.inkInverse;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.action, { backgroundColor, borderColor: destructive ? t.brandBrick : secondary ? t.ruleHairline : t.surfaceAnchor }]}
    >
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function statusLabel(submission: WorkingGroupResourceModerationSubmission): string {
  if (submission.isRemoved) return 'Removed';
  if (submission.status === 'changes_requested') return 'Changes requested';
  return submission.status[0].toUpperCase() + submission.status.slice(1);
}

function resourceTypeLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heading: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  subheading: { marginTop: 3, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  count: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: mono(600), fontSize: 11 },
  filters: { gap: 8 },
  filter: { minHeight: 32, borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, justifyContent: 'center' },
  filterText: { fontFamily: sans(500), fontSize: 11.5 },
  cards: { gap: 9 },
  card: { borderWidth: 1, borderRadius: 9, padding: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { marginTop: 9, fontFamily: sans(600), fontSize: 14.5, lineHeight: 19 },
  cardMeta: { marginTop: 4, fontFamily: sans(400), fontSize: 12 },
  date: { fontFamily: mono(400), fontSize: 9.5 },
  status: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 13, paddingHorizontal: 8 },
  statusText: { fontFamily: sans(600), fontSize: 10.5 },
  assetLine: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  assetText: { fontFamily: sans(400), fontSize: 11 },
  state: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 9, padding: 16 },
  stateTitle: { fontFamily: sans(600), fontSize: 14 },
  stateBody: { marginTop: 4, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  retry: { marginTop: 10, fontFamily: sans(600), fontSize: 12.5 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(19,35,41,.42)' },
  sheet: { maxHeight: '92%', borderTopWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingHorizontal: 20 },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingBottom: 12 },
  sheetTitle: { fontFamily: sans(600), fontSize: 17, lineHeight: 22, letterSpacing: trackDisplay(17) },
  sheetMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 12 },
  sheetBody: { gap: 9, paddingBottom: 14 },
  detail: { borderWidth: 1, borderRadius: 8, padding: 11 },
  detailLabel: { fontFamily: mono(500), fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  detailValue: { marginTop: 5, fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  linkRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11 },
  linkText: { flex: 1, fontFamily: sans(600), fontSize: 12.5 },
  fileName: { fontFamily: sans(600), fontSize: 12.5 },
  fileSize: { marginTop: 2, fontFamily: mono(400), fontSize: 9.5 },
  notesLabel: { marginTop: 5, fontFamily: sans(500), fontSize: 12.5 },
  notesInput: { minHeight: 82, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10 },
  action: { minHeight: 44, flexGrow: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  actionText: { fontFamily: sans(600), fontSize: 12.5 },
});
