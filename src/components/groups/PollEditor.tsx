import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MemberPoll, MemberPollUpdateInput, PollQuestionInput } from '../../api/types';
import { Plus, X } from '../../ds/icons';
import { Input } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { sans } from '../../ds/tokens';

export default function PollEditor({
  poll,
  pending,
  error,
  onSave,
  onCancel,
}: {
  poll: MemberPoll;
  pending: boolean;
  error?: string | null;
  onSave: (input: MemberPollUpdateInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const { t } = useTheme();
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description ?? '');
  const [tags, setTags] = useState(poll.tags.join(', '));
  const [closesAt, setClosesAt] = useState(poll.closesAt ?? '');
  const [questions, setQuestions] = useState<PollQuestionInput[]>(
    poll.questions.map((question) => ({
      text: question.text,
      options: question.options.map((option) => ({ label: option.label })),
    }))
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const canEditQuestions = poll.totalResponses === 0;
  const visibleError = validationError ?? error;
  const closeDateIsFuture = useMemo(() => {
    const timestamp = Date.parse(closesAt);
    return !Number.isNaN(timestamp) && timestamp > Date.now();
  }, [closesAt]);

  const submit = async () => {
    const cleanTitle = title.trim();
    const cleanQuestions = questions.map((question) => ({
      text: question.text.trim(),
      options: question.options.map((option) => ({ label: option.label.trim() })).filter((option) => option.label),
    }));
    if (!cleanTitle) return setValidationError('Enter a poll title.');
    if (!closeDateIsFuture) return setValidationError('Enter a future close time in ISO format.');
    if (canEditQuestions && cleanQuestions.some((question) => !question.text || question.options.length < 2)) {
      return setValidationError('Each question needs text and at least two options.');
    }
    setValidationError(null);
    await onSave({
      title: cleanTitle,
      description: description.trim() || null,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      closesAt: new Date(closesAt).toISOString(),
      ...(canEditQuestions ? { questions: cleanQuestions } : {}),
    });
  };

  const updateQuestion = (index: number, value: string) => {
    setQuestions((current) => current.map((question, i) => i === index ? { ...question, text: value } : question));
  };
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((current) => current.map((question, i) => i === questionIndex ? {
      ...question,
      options: question.options.map((option, j) => j === optionIndex ? { label: value } : option),
    } : question));
  };

  return (
    <View style={[styles.panel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: t.inkStrong }]}>Edit poll</Text>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close poll editor" hitSlop={8}>
          <X size={18} color={t.inkMuted} />
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
        <Field label="Title"><Input value={title} onChangeText={setTitle} /></Field>
        <Field label="Description"><Input value={description} onChangeText={setDescription} multiline style={styles.textarea} /></Field>
        <Field label="Tags"><Input value={tags} onChangeText={setTags} placeholder="liquidity, policy" /></Field>
        <Field label="Close time"><Input value={closesAt} onChangeText={setClosesAt} autoCapitalize="none" placeholder="2026-09-30T17:00:00Z" /></Field>
        <View style={styles.sectionHead}>
          <Text style={[styles.label, { color: t.inkMuted }]}>Questions</Text>
          {!canEditQuestions && <Text style={[styles.locked, { color: t.inkMuted }]}>Locked after responses</Text>}
        </View>
        {questions.map((question, questionIndex) => (
          <View key={questionIndex} style={[styles.question, { borderColor: t.ruleHairline }]}>
            <Input editable={canEditQuestions} value={question.text} onChangeText={(value) => updateQuestion(questionIndex, value)} />
            {question.options.map((option, optionIndex) => (
              <View key={optionIndex} style={styles.optionRow}>
                <Input editable={canEditQuestions} value={option.label} onChangeText={(value) => updateOption(questionIndex, optionIndex, value)} style={styles.optionInput} />
                {canEditQuestions && question.options.length > 2 && (
                  <Pressable onPress={() => setQuestions((current) => current.map((item, i) => i === questionIndex ? { ...item, options: item.options.filter((_, j) => j !== optionIndex) } : item))} hitSlop={8}>
                    <X size={15} color={t.inkMuted} />
                  </Pressable>
                )}
              </View>
            ))}
            {canEditQuestions && question.options.length < 8 && (
              <Pressable onPress={() => setQuestions((current) => current.map((item, i) => i === questionIndex ? { ...item, options: [...item.options, { label: '' }] } : item))} style={styles.addOption}>
                <Plus size={14} color={t.surfaceAnchor} />
                <Text style={[styles.addOptionText, { color: t.surfaceAnchor }]}>Add option</Text>
              </Pressable>
            )}
          </View>
        ))}
        {!!visibleError && <Text accessibilityRole="alert" style={[styles.error, { color: t.brandRed }]}>{visibleError}</Text>}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable disabled={pending} onPress={() => void submit()} style={[styles.primary, { backgroundColor: pending ? t.muted : t.surfaceAnchor }]}>
          <Text style={styles.primaryText}>{pending ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
        <Pressable disabled={pending} onPress={onCancel} style={[styles.secondary, { borderColor: t.ruleHairline }]}>
          <Text style={[styles.secondaryText, { color: t.inkMuted }]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return <View style={styles.field}><Text style={[styles.label, { color: t.inkMuted }]}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  panel: { marginTop: 14, maxHeight: 560, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  heading: { fontFamily: sans(600), fontSize: 16 },
  scroll: { maxHeight: 430 },
  fields: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  field: { gap: 6 },
  label: { fontFamily: sans(600), fontSize: 11.5 },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locked: { fontFamily: sans(400), fontSize: 11 },
  question: { gap: 8, borderWidth: 1, borderRadius: 8, padding: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1 },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 4 },
  addOptionText: { fontFamily: sans(600), fontSize: 11.5 },
  error: { fontFamily: sans(500), fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, padding: 14 },
  primary: { minHeight: 40, justifyContent: 'center', borderRadius: 8, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontFamily: sans(600), fontSize: 12.5 },
  secondary: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14 },
  secondaryText: { fontFamily: sans(600), fontSize: 12.5 },
});