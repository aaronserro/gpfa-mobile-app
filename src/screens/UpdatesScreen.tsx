import { useMemo, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowRight, CalendarDots, CheckCircle, Megaphone } from '../ds/icons';
import { Badge, MastheadMeta, PageActions, PageHead, ScreenEnter, StickyTitle, useStickyScroll } from '../ds/primitives';
import { SegmentedControl } from '../ds/controls';
import { CollectionEmptyState } from '../ds/feedback';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import type {
  MobileAnnouncementPreview,
  MobileSurveyAnswer,
  MobileSurveyPreview,
  MobileSurveyStatus,
} from '../api/types';

type UpdatesFilter = 'all' | 'announcements' | 'surveys';
export type UpdateSelection = { kind: 'announcement'; id: string } | { kind: 'survey'; id: string };

const UPDATE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'surveys', label: 'Surveys' },
] as const;

export default function UpdatesScreen({
  announcements,
  surveys,
  initialSelection = null,
  onBack,
  onReadAnnouncement,
  onSubmitSurvey,
}: {
  announcements: MobileAnnouncementPreview[];
  surveys: MobileSurveyPreview[];
  initialSelection?: UpdateSelection | null;
  onBack: () => void;
  onReadAnnouncement?: (notificationId: string) => void | Promise<void>;
  onSubmitSurvey: (surveyId: string, answers: MobileSurveyAnswer[]) => Promise<void>;
}) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();
  const [filter, setFilter] = useState<UpdatesFilter>('all');
  const [selection, setSelection] = useState<UpdateSelection | null>(initialSelection);
  const [readIds, setReadIds] = useState<string[]>([]);

  const selectedAnnouncement = selection?.kind === 'announcement'
    ? announcements.find((item) => item.id === selection.id) ?? null
    : null;
  const selectedSurvey = selection?.kind === 'survey'
    ? surveys.find((item) => item.id === selection.id) ?? null
    : null;

  if (selectedAnnouncement) {
    return (
      <AnnouncementDetail
        announcement={selectedAnnouncement}
        onBack={() => setSelection(null)}
      />
    );
  }

  if (selectedSurvey) {
    return (
      <SurveyFlow
        survey={selectedSurvey}
        onBack={() => setSelection(null)}
        onSubmit={onSubmitSurvey}
      />
    );
  }

  const rows = [
    ...(filter === 'surveys' ? [] : announcements.map((item) => ({ kind: 'announcement' as const, item }))),
    ...(filter === 'announcements' ? [] : surveys.map((item) => ({ kind: 'survey' as const, item }))),
  ];

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title="Updates" onBack={onBack} backLabel="Back to More" actions={<PageActions />} />

      <Animated.ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        {...handlers}
      >
        <PageHead title="Updates" onBack={onBack} backLabel="Back to More" actions={<PageActions />}>
          <SegmentedControl
            value={filter}
            options={UPDATE_FILTERS}
            onChange={setFilter}
            accessibilityLabel="Filter updates"
          />
        </PageHead>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryTitle, { color: t.inkStrong }]}>Member updates</Text>
          <MastheadMeta size={11}>{`${rows.length} ITEM${rows.length === 1 ? '' : 'S'}`}</MastheadMeta>
        </View>

        <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}>
          {rows.length === 0 && (
            <CollectionEmptyState
              title={filter === 'announcements'
                ? 'No announcements'
                : filter === 'surveys'
                  ? 'No surveys'
                  : 'No member updates'}
              body={filter === 'announcements'
                ? 'New GPFA announcements will appear here.'
                : filter === 'surveys'
                  ? 'Open member surveys will appear here.'
                  : 'Announcements and surveys will appear here when published.'}
              Glyph={filter === 'surveys' ? CalendarDots : Megaphone}
              compact
              style={styles.emptyState}
            />
          )}
          {rows.map((row, index) => {
            if (row.kind === 'announcement') {
              const unread = row.item.unread && !readIds.includes(row.item.id);
              return (
                <Pressable
                  key={`announcement-${row.item.id}`}
                  onPress={() => {
                    setReadIds((current) => [...current, row.item.id]);
                    if (row.item.notificationId) void onReadAnnouncement?.(row.item.notificationId);
                    setSelection({ kind: 'announcement', id: row.item.id });
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && { borderTopWidth: 1, borderTopColor: t.rule },
                    pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
                  ]}
                >
                  <View style={[styles.typeIcon, { backgroundColor: alpha(t.brandBlue, 0.12) }]}>
                    <Megaphone size={19} color={t.brandBlue} />
                    {unread && <View style={[styles.unreadDot, { backgroundColor: t.brandBrickInk }]} />}
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.metaRow}>
                      <Text style={[styles.kindLabel, { color: t.brandBlue }]}>Announcement</Text>
                      <MastheadMeta size={10.5}>{row.item.dateLabel}</MastheadMeta>
                    </View>
                    <Text style={[styles.rowTitle, { color: t.inkStrong }]} numberOfLines={2}>{row.item.title}</Text>
                    <Text style={[styles.rowCopy, { color: t.inkMuted }]} numberOfLines={2}>{row.item.summary}</Text>
                  </View>
                  <ArrowRight size={16} color={t.brandGreen} />
                </Pressable>
              );
            }

            return (
              <Pressable
                key={`survey-${row.item.id}`}
                onPress={() => setSelection({ kind: 'survey', id: row.item.id })}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && { borderTopWidth: 1, borderTopColor: t.rule },
                  pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
                ]}
              >
                <View style={[styles.typeIcon, { backgroundColor: alpha(t.brandAmber, 0.12) }]}>
                  <CalendarDots size={19} color={t.brandAmber} />
                </View>
                <View style={styles.flex}>
                  <View style={styles.metaRow}>
                    <Text style={[styles.kindLabel, { color: t.brandAmber }]}>Member survey</Text>
                    <MastheadMeta size={10.5}>{row.item.closesLabel}</MastheadMeta>
                  </View>
                  <Text style={[styles.rowTitle, { color: t.inkStrong }]} numberOfLines={2}>{row.item.title}</Text>
                  <View style={styles.statusRow}>
                    <Badge variant={row.item.status === 'submitted' ? 'tag-green' : 'tag-default'} size={9}>
                      {surveyStatusLabel(row.item.status)}
                    </Badge>
                    <Text style={[styles.questionCount, { color: t.inkMuted }]}>{surveyStatementCount(row.item)} statements</Text>
                  </View>
                </View>
                <ArrowRight size={16} color={t.brandGreen} />
              </Pressable>
            );
          })}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function AnnouncementDetail({
  announcement,
  onBack,
}: {
  announcement: MobileAnnouncementPreview;
  onBack: () => void;
}) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();
  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title="Announcement" onBack={onBack} backLabel="Back to Updates" actions={<PageActions />} />
      <Animated.ScrollView contentContainerStyle={styles.articleScroll} showsVerticalScrollIndicator={false} {...handlers}>
        <PageHead title="Announcement" onBack={onBack} backLabel="Back to Updates" actions={<PageActions />} />
        <View style={styles.metaRow}>
          <Text style={[styles.kindLabel, { color: t.brandBlue }]}>GPFA announcement</Text>
          <MastheadMeta size={11}>{announcement.dateLabel}</MastheadMeta>
        </View>
        <Text style={[styles.articleTitle, { color: t.inkStrong }]}>{announcement.title}</Text>
        <Text style={[styles.articleDeck, { color: t.inkMuted }]}>{announcement.summary}</Text>
        <View style={[styles.notice, { backgroundColor: t.surfaceSoft, borderLeftColor: t.brandBlue }]}>
          <Text style={[styles.noticeLabel, { color: t.brandBlue }]}>Member notice</Text>
          <Text style={[styles.noticeCopy, { color: t.inkBody }]}>This update is visible to active GPFA members.</Text>
        </View>
        {announcement.body.map((paragraph) => (
          <Text key={paragraph} style={[styles.paragraph, { color: t.inkBody }]}>{paragraph}</Text>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function SurveyFlow({
  survey,
  onBack,
  onSubmit,
}: {
  survey: MobileSurveyPreview;
  onBack: () => void;
  onSubmit: (surveyId: string, answers: MobileSurveyAnswer[]) => Promise<void>;
}) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const statements = useMemo(
    () => survey.questions.flatMap((question) =>
      question.statements.map((statement) => ({ question, statement }))
    ),
    [survey.questions]
  );
  const [answers, setAnswers] = useState<Record<string, MobileSurveyAnswer>>(() =>
    Object.fromEntries(survey.answers.map((answer) => [answer.statementId, answer]))
  );
  const [submitted, setSubmitted] = useState(survey.status === 'submitted');
  const [submitting, setSubmitting] = useState(false);
  const current = statements[step];
  const currentAnswer = current ? answers[current.statement.id] : undefined;
  const currentOption = current?.question.options.find((option) => option.id === currentAnswer?.optionId);
  const currentAnswered = !!currentAnswer && (!currentOption?.isOther || !!currentAnswer.otherText?.trim());
  const answeredCount = Object.keys(answers).length;
  const complete = statements.every(({ question, statement }) => {
    const answer = answers[statement.id];
    const option = question.options.find((candidate) => candidate.id === answer?.optionId);
    return !!answer && (!option?.isOther || !!answer.otherText?.trim());
  });

  const leave = () => {
    if (answeredCount > 0 && !submitted) {
      Alert.alert('Leave survey?', 'Your preview answers will be cleared.', [
        { text: 'Keep answering', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onBack },
      ]);
      return;
    }
    onBack();
  };

  if (submitted) {
    return (
      <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
        <PageHead title="Survey" onBack={onBack} backLabel="Back to Updates" actions={<PageActions />} />
        <View style={styles.confirmation}>
          <View style={[styles.confirmationIcon, { backgroundColor: t.brandGreenSoft }]}>
            <CheckCircle size={32} color={t.brandGreen} weight="fill" />
          </View>
          <Text style={[styles.confirmationTitle, { color: t.inkStrong }]}>Response recorded</Text>
          <Text style={[styles.confirmationCopy, { color: t.inkMuted }]}>Your answers to “{survey.title}” are on file. You can update them until the survey closes.</Text>
          <Pressable onPress={() => setSubmitted(false)} style={[styles.outlineButton, { borderColor: t.ruleStrong }]}>
            <Text style={[styles.outlineButtonText, { color: t.brandGreen }]}>Review response</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title="Member survey" onBack={leave} backLabel="Back to Updates" actions={<PageActions />} />
      <View style={[styles.progressTrack, { backgroundColor: t.surfaceSoft }]}>
        <View style={[styles.progressFill, { backgroundColor: t.brandGreen, width: `${statements.length ? ((step + 1) / statements.length) * 100 : 0}%` }]} />
      </View>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.ScrollView style={styles.fill} contentContainerStyle={styles.surveyScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" {...handlers}>
        <PageHead title="Member survey" onBack={leave} backLabel="Back to Updates" actions={<PageActions />} />
        <MastheadMeta size={11}>{`STATEMENT ${step + 1} OF ${statements.length} · ${survey.closesLabel}`}</MastheadMeta>
        <Text style={[styles.surveyTitle, { color: t.inkStrong }]}>{survey.title}</Text>
        <Text style={[styles.surveyDescription, { color: t.inkMuted }]}>{step === 0 ? survey.description : 'Choose the response that best reflects your organization.'}</Text>

        {!!current && (
          <ScreenEnter key={current.statement.id} style={styles.questionBlock}>
            <Text style={[styles.questionPrompt, { color: t.inkStrong }]}>{current.question.prompt}</Text>
            <Text style={[styles.surveyDescription, { color: t.inkMuted }]}>{current.statement.text}</Text>
            <View style={styles.optionList}>
              {current.question.options.map((option) => {
                const selected = answers[current.statement.id]?.optionId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setAnswers((existing) => ({
                      ...existing,
                      [current.statement.id]: {
                        questionId: current.question.id,
                        statementId: current.statement.id,
                        optionId: option.id,
                        otherText: null,
                      },
                    }))}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? t.brandGreenSoft : t.surfacePaper,
                        borderColor: selected ? t.brandGreen : t.rule,
                      },
                    ]}
                  >
                    <View style={[styles.radio, { borderColor: selected ? t.brandGreen : t.ruleStrong }]}>
                      {selected && <View style={[styles.radioFill, { backgroundColor: t.brandGreen }]} />}
                    </View>
                    <Text style={[styles.optionLabel, { color: t.inkStrong }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {currentOption?.isOther && (
              <TextInput
                value={currentAnswer?.otherText ?? ''}
                onChangeText={(otherText) => setAnswers((existing) => ({
                  ...existing,
                  [current.statement.id]: { ...currentAnswer!, otherText },
                }))}
                placeholder="Please specify"
                placeholderTextColor={t.inkFaint}
                style={[styles.otherInput, { color: t.inkStrong, backgroundColor: t.surfacePaper, borderColor: t.rule }]}
              />
            )}
          </ScreenEnter>
        )}
      </Animated.ScrollView>

      <View style={[styles.surveyFooter, { backgroundColor: t.surfacePaper, borderTopColor: t.rule, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={[styles.footerCount, { color: t.inkMuted }]}>{answeredCount} of {statements.length} answered</Text>
        {step > 0 && (
          <Pressable onPress={() => setStep((current) => current - 1)} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: t.brandGreen }]}>Back</Text>
          </Pressable>
        )}
        <Pressable
          disabled={!currentAnswered || submitting}
          onPress={async () => {
            if (step < statements.length - 1) {
              setStep((currentStep) => currentStep + 1);
              return;
            }
            if (!complete) return;
            setSubmitting(true);
            try {
              await onSubmit(survey.id, Object.values(answers));
              setSubmitted(true);
            } catch (error) {
              Alert.alert('Response not saved', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setSubmitting(false);
            }
          }}
          style={[styles.continueButton, { backgroundColor: currentAnswered ? t.surfaceAnchor : t.surfaceSoft }]}
        >
          <Text style={[styles.continueLabel, { color: currentAnswered ? t.inkInverse : t.inkFaint }]}>
            {submitting ? 'Submitting…' : step === statements.length - 1 ? 'Submit response' : 'Continue'}
          </Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function surveyStatusLabel(status: MobileSurveyStatus) {
  if (status === 'in-progress') return 'In progress';
  if (status === 'submitted') return 'Submitted';
  if (status === 'closed') return 'Closed';
  return 'Not started';
}

function surveyStatementCount(survey: MobileSurveyPreview) {
  return survey.questions.reduce((count, question) => count + question.statements.length, 0);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  list: { paddingVertical: 22, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 11 },
  summaryTitle: { fontFamily: sans(600), fontSize: 19, letterSpacing: trackDisplay(19) },
  band: { borderTopWidth: 1, borderBottomWidth: 1 },
  emptyState: { margin: 20 },
  row: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 15 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  kindLabel: { fontFamily: sans(600), fontSize: 11.5 },
  rowTitle: { fontFamily: sans(600), fontSize: 15, lineHeight: 20.5 },
  rowCopy: { marginTop: 3, fontFamily: sans(400), fontSize: 13, lineHeight: 18.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  questionCount: { fontFamily: sans(400), fontSize: 12.5 },
  articleScroll: { padding: 20, paddingBottom: 40 },
  articleTitle: { fontFamily: sans(600), fontSize: 27, lineHeight: 32, letterSpacing: trackDisplay(27) },
  articleDeck: { marginTop: 10, fontFamily: sans(400), fontSize: 16, lineHeight: 23.5 },
  notice: { marginVertical: 22, borderLeftWidth: 3, padding: 14 },
  noticeLabel: { fontFamily: sans(600), fontSize: 13 },
  noticeCopy: { marginTop: 3, fontFamily: sans(400), fontSize: 13.5, lineHeight: 19.5 },
  paragraph: { marginBottom: 16, fontFamily: sans(400), fontSize: 15, lineHeight: 24.5 },
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  surveyScroll: { padding: 20, paddingBottom: 24 },
  surveyTitle: { marginTop: 10, fontFamily: sans(600), fontSize: 23, lineHeight: 28, letterSpacing: trackDisplay(23) },
  surveyDescription: { marginTop: 8, fontFamily: sans(400), fontSize: 15, lineHeight: 22 },
  questionBlock: { marginTop: 30 },
  questionPrompt: { fontFamily: sans(600), fontSize: 19, lineHeight: 25.5 },
  optionList: { gap: 9, marginTop: 16 },
  option: { minHeight: 54, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { flex: 1, fontFamily: sans(500), fontSize: 15, lineHeight: 21 },
  otherInput: { marginTop: 12, minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontFamily: sans(400), fontSize: 14.5 },
  surveyFooter: { minHeight: 72, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  footerCount: { flex: 1, fontFamily: mono(400), fontSize: 9.5 },
  textButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 8 },
  textButtonLabel: { fontFamily: sans(600), fontSize: 13.5 },
  continueButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  continueLabel: { fontFamily: sans(600), fontSize: 13.5 },
  confirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  confirmationIcon: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  confirmationTitle: { marginTop: 18, fontFamily: sans(600), fontSize: 22, letterSpacing: trackDisplay(22) },
  confirmationCopy: { marginTop: 8, maxWidth: 320, textAlign: 'center', fontFamily: sans(400), fontSize: 15, lineHeight: 23.5 },
  outlineButton: { marginTop: 22, minHeight: 44, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  outlineButtonText: { fontFamily: sans(600), fontSize: 14.5 },
});
