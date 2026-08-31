import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PollQuestionInput } from '../../api/types';
import { Plus, X } from '../../ds/icons';
import { Input } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { sans } from '../../ds/tokens';

export type PollOptionDraft = {
  key: string;
  label: string;
};

export type PollQuestionDraft = {
  key: string;
  text: string;
  options: PollOptionDraft[];
};

let draftSequence = 0;

function draftKey(prefix: string) {
  draftSequence += 1;
  return `${prefix}-${draftSequence}`;
}

export function createPollQuestionDraft(
  question?: PollQuestionInput,
  key = draftKey('question')
): PollQuestionDraft {
  return {
    key,
    text: question?.text ?? '',
    options: (question?.options ?? [{ label: '' }, { label: '' }]).map((option) => ({
      key: draftKey('option'),
      label: option.label,
    })),
  };
}

export function pollQuestionDraftsToInput(
  questions: PollQuestionDraft[]
): PollQuestionInput[] {
  return questions.map((question) => ({
    text: question.text.trim(),
    options: question.options.map((option) => ({ label: option.label.trim() })),
  }));
}

export default function PollQuestionFields({
  questions,
  editable,
  onChange,
}: {
  questions: PollQuestionDraft[];
  editable: boolean;
  onChange: (questions: PollQuestionDraft[]) => void;
}) {
  const { t } = useTheme();

  const updateQuestion = (questionKey: string, text: string) => {
    onChange(
      questions.map((question) =>
        question.key === questionKey ? { ...question, text } : question
      )
    );
  };

  const updateOption = (questionKey: string, optionKey: string, label: string) => {
    onChange(
      questions.map((question) =>
        question.key === questionKey
          ? {
              ...question,
              options: question.options.map((option) =>
                option.key === optionKey ? { ...option, label } : option
              ),
            }
          : question
      )
    );
  };

  return (
    <View style={styles.list}>
      {questions.map((question, questionIndex) => (
        <View
          key={question.key}
          style={[styles.question, { borderColor: t.ruleHairline }]}
        >
          <View style={styles.questionHeader}>
            <Text style={[styles.questionNumber, { color: t.inkMuted }]}>
              Question {questionIndex + 1}
            </Text>
            {editable && questions.length > 1 && (
              <Pressable
                onPress={() =>
                  onChange(questions.filter((item) => item.key !== question.key))
                }
                accessibilityRole="button"
                accessibilityLabel={`Remove question ${questionIndex + 1}`}
                hitSlop={8}
              >
                <X size={15} color={t.inkMuted} />
              </Pressable>
            )}
          </View>
          <Input
            editable={editable}
            value={question.text}
            onChangeText={(value) => updateQuestion(question.key, value)}
            placeholder="Question members will answer"
          />
          {question.options.map((option, optionIndex) => (
            <View key={option.key} style={styles.optionRow}>
              <Input
                editable={editable}
                value={option.label}
                onChangeText={(value) =>
                  updateOption(question.key, option.key, value)
                }
                placeholder={`Option ${optionIndex + 1}`}
                style={styles.optionInput}
              />
              {editable && question.options.length > 2 && (
                <Pressable
                  onPress={() =>
                    onChange(
                      questions.map((item) =>
                        item.key === question.key
                          ? {
                              ...item,
                              options: item.options.filter(
                                (candidate) => candidate.key !== option.key
                              ),
                            }
                          : item
                      )
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Remove option ${optionIndex + 1} from question ${questionIndex + 1}`}
                  hitSlop={8}
                >
                  <X size={15} color={t.inkMuted} />
                </Pressable>
              )}
            </View>
          ))}
          {editable && question.options.length < 8 && (
            <Pressable
              onPress={() =>
                onChange(
                  questions.map((item) =>
                    item.key === question.key
                      ? {
                          ...item,
                          options: [
                            ...item.options,
                            { key: draftKey('option'), label: '' },
                          ],
                        }
                      : item
                  )
                )
              }
              accessibilityRole="button"
              style={styles.addAction}
            >
              <Plus size={14} color={t.surfaceAnchor} />
              <Text style={[styles.addText, { color: t.surfaceAnchor }]}>Add option</Text>
            </Pressable>
          )}
        </View>
      ))}
      {editable && (
        <Pressable
          onPress={() => onChange([...questions, createPollQuestionDraft()])}
          accessibilityRole="button"
          style={[styles.addQuestion, { borderColor: t.ruleHairline }]}
        >
          <Plus size={15} color={t.surfaceAnchor} />
          <Text style={[styles.addText, { color: t.surfaceAnchor }]}>Add question</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  question: { gap: 8, borderWidth: 1, borderRadius: 8, padding: 10 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionNumber: { fontFamily: sans(600), fontSize: 11.5 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1 },
  addAction: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 4 },
  addQuestion: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8 },
  addText: { fontFamily: sans(600), fontSize: 11.5 },
});
