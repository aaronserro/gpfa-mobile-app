import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Poll, PollAnswer } from '../../api/types';
import { CheckCircle } from '../../ds/icons';
import { MastheadMeta } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans } from '../../ds/tokens';
import {
  firstUnansweredPollQuestionIndex,
  pollAnswerMap,
  pollAnswersAreComplete,
  pollAnswersFromMap,
} from '../../lib/polls';

export default function PollQuestionnaire({
  poll,
  closed,
  draftAnswers,
  pending,
  onDraftChange,
  onSubmit,
}: {
  poll: Poll;
  closed: boolean;
  draftAnswers: PollAnswer[];
  pending: boolean;
  onDraftChange: (answers: PollAnswer[]) => void;
  onSubmit: (answers: PollAnswer[]) => Promise<boolean>;
}) {
  const { t } = useTheme();
  const initialAnswers = useMemo(
    () => (draftAnswers.length > 0 ? draftAnswers : poll.answers),
    [draftAnswers, poll.answers]
  );
  const [currentIndex, setCurrentIndex] = useState(() =>
    firstUnansweredPollQuestionIndex(poll, pollAnswerMap(initialAnswers))
  );
  const [editing, setEditing] = useState(!poll.hasSubmitted && !closed);
  const [error, setError] = useState<string | null>(null);
  const question = poll.questions[currentIndex];
  const answers = pollAnswerMap(initialAnswers);
  const complete = pollAnswersAreComplete(poll, answers);
  const showResults = closed || (poll.hasSubmitted && !editing);

  useEffect(() => {
    if (closed || poll.hasSubmitted) setEditing(false);
  }, [closed, poll.hasSubmitted]);

  if (!question) return null;

  const choose = (questionId: string, optionId: string) => {
    const next = pollAnswersFromMap(poll, { ...answers, [questionId]: optionId });
    setError(null);
    onDraftChange(next);
  };

  const submit = async () => {
    if (!complete || pending) return;
    setError(null);
    const succeeded = await onSubmit(pollAnswersFromMap(poll, answers));
    if (succeeded) {
      setEditing(false);
    } else {
      setError('Your response could not be submitted. Your selections were kept.');
    }
  };

  return (
    <View style={[styles.panel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <View style={styles.progressRow}>
        <Text style={[styles.progress, { color: t.inkMuted }]}>
          Question {currentIndex + 1} of {poll.questions.length}
        </Text>
        <MastheadMeta size={9.5}>{poll.closes}</MastheadMeta>
      </View>

      <Text style={[styles.question, { color: t.inkStrong }]}>{question.text}</Text>
      <View style={styles.options}>
        {question.options.map((option) => {
          const selected = answers[question.id] === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => choose(question.id, option.id)}
              disabled={showResults || pending}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: showResults || pending }}
              style={[
                styles.option,
                {
                  borderColor: selected ? t.brandGreen : t.ruleHairline,
                  backgroundColor: selected ? t.brandGreenSoft : t.surfacePaper,
                },
              ]}
            >
              {showResults && (
                <View
                  style={[
                    styles.resultFill,
                    {
                      width: `${Math.max(0, Math.min(100, option.percentage))}%`,
                      backgroundColor: selected
                        ? alpha(t.brandGreen, 0.18)
                        : alpha(t.surfaceSoft, 0.6),
                    },
                  ]}
                />
              )}
              <View style={styles.optionLabelRow}>
                <Text style={[styles.optionLabel, { color: t.inkStrong }]}>{option.label}</Text>
                {showResults && (
                  <Text style={[styles.result, { color: t.inkMuted }]}>
                    {Math.round(option.percentage)}%
                  </Text>
                )}
                {selected && <CheckCircle size={15} weight="fill" color={t.brandLeaf} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {!!error && (
        <Text accessibilityRole="alert" style={[styles.error, { color: t.brandRed }]}>
          {error}
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          disabled={currentIndex === 0 || pending}
          accessibilityRole="button"
          style={[styles.secondary, { borderColor: t.ruleHairline }]}
        >
          <Text style={[styles.secondaryText, { color: currentIndex === 0 ? t.inkFaint : t.inkMuted }]}>Previous</Text>
        </Pressable>

        {currentIndex < poll.questions.length - 1 ? (
          <Pressable
            onPress={() => setCurrentIndex((index) => Math.min(poll.questions.length - 1, index + 1))}
            disabled={(!showResults && !answers[question.id]) || pending}
            accessibilityRole="button"
            style={[
              styles.primary,
              { backgroundColor: (showResults || answers[question.id]) && !pending ? t.surfaceAnchor : t.muted },
            ]}
          >
            <Text style={styles.primaryText}>Next</Text>
          </Pressable>
        ) : showResults && poll.hasSubmitted && !closed ? (
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            style={[styles.secondary, { borderColor: t.ruleHairline }]}
          >
            <Text style={[styles.secondaryText, { color: t.surfaceAnchor }]}>Change answers</Text>
          </Pressable>
        ) : !showResults ? (
          <Pressable
            onPress={() => void submit()}
            disabled={!complete || pending}
            accessibilityRole="button"
            accessibilityState={{ disabled: !complete || pending }}
            style={[styles.primary, { backgroundColor: complete && !pending ? t.surfaceAnchor : t.muted }]}
          >
            <Text style={styles.primaryText}>{pending ? 'Submitting…' : 'Submit response'}</Text>
          </Pressable>
        ) : null}
      </View>

      {showResults && (
        <Text style={[styles.responded, { color: t.inkMuted }]}>
          {poll.hasSubmitted ? `You responded · ${poll.responseCount} ${poll.responseCount === 1 ? 'response' : 'responses'}` : `${poll.responseCount} ${poll.responseCount === 1 ? 'response' : 'responses'}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, marginTop: 14, borderWidth: 1, borderRadius: 8, padding: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progress: { fontFamily: sans(600), fontSize: 11.5 },
  question: { fontFamily: sans(600), fontSize: 15, lineHeight: 21 },
  options: { gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  resultFill: { ...StyleSheet.absoluteFillObject, right: undefined },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  optionLabel: { flex: 1, fontFamily: sans(500), fontSize: 13, lineHeight: 18 },
  result: { fontFamily: sans(600), fontSize: 11.5 },
  error: { fontFamily: sans(500), fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  primary: { minHeight: 40, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontFamily: sans(600), fontSize: 12.5 },
  secondary: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14 },
  secondaryText: { fontFamily: sans(600), fontSize: 12.5 },
  responded: { fontFamily: sans(500), fontSize: 11.5 },
});
