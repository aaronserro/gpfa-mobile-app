import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  ForumContentReportInput,
  ForumContentReportTarget,
  ForumReportCategory,
} from '../../api/types';
import { Flag, X } from '../../ds/icons';
import { Input } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../../ds/tokens';

const REPORT_CATEGORIES: Array<{ id: ForumReportCategory; label: string }> = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'off_topic', label: 'Off topic' },
  { id: 'sensitive_information', label: 'Sensitive information' },
  { id: 'misleading', label: 'Misleading' },
  { id: 'other', label: 'Other' },
];

const MAX_DETAILS_LENGTH = 1000;

export default function ForumReportSheet({
  target,
  pending,
  onClose,
  onSubmit,
}: {
  target: ForumContentReportTarget | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: ForumContentReportInput) => Promise<boolean>;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ForumReportCategory | null>(null);
  const [details, setDetails] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setCategory(null);
    setDetails('');
    setValidationError(null);
  }, [target?.targetId, target?.targetType]);

  if (!target) return null;

  const submit = async () => {
    if (!category) {
      setValidationError('Choose a reason for the report.');
      return;
    }
    if (details.length > MAX_DETAILS_LENGTH) {
      setValidationError(`Details must be ${MAX_DETAILS_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }

    setValidationError(null);
    const succeeded = await onSubmit({
      targetType: target.targetType,
      targetId: target.targetId,
      category,
      details: details.trim() || undefined,
    });
    if (succeeded) onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={pending ? undefined : onClose}>
      <KeyboardAvoidingView
        style={styles.modalWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel="Close report form"
          accessibilityState={{ disabled: pending }}
        />
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
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: alpha(t.brandAmber, 0.12) }]}>
              <Flag size={18} color={t.brandAmber} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.title, { color: t.inkStrong }]}>Report content</Text>
              <Text style={[styles.subtitle, { color: t.inkMuted }]}>A co-lead will review this report privately.</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={pending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close report form"
              accessibilityState={{ disabled: pending }}
            >
              <X size={19} color={t.inkMuted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <Text style={[styles.label, { color: t.inkStrong }]}>Reason</Text>
            <View style={styles.categories} accessibilityRole="radiogroup">
              {REPORT_CATEGORIES.map((option) => {
                const selected = category === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      setCategory(option.id);
                      setValidationError(null);
                    }}
                    disabled={pending}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: pending }}
                    style={[
                      styles.category,
                      {
                        borderColor: selected ? t.surfaceAnchor : t.ruleHairline,
                        backgroundColor: selected ? alpha(t.surfaceAnchor, 0.1) : t.surfacePage,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: selected ? t.surfaceAnchor : t.inkBody }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.detailsHeader}>
              <Text style={[styles.label, { color: t.inkStrong }]}>Details (optional)</Text>
              <Text style={[styles.counter, { color: t.inkFaint }]}>{details.length}/{MAX_DETAILS_LENGTH}</Text>
            </View>
            <Input
              value={details}
              onChangeText={(value) => {
                setDetails(value);
                setValidationError(null);
              }}
              placeholder="Add context that will help the moderators review this content"
              multiline
              maxLength={MAX_DETAILS_LENGTH}
              textAlignVertical="top"
              editable={!pending}
              accessibilityLabel="Report details"
              style={styles.detailsInput}
            />

            {!!validationError && (
              <Text accessibilityRole="alert" style={[styles.error, { color: t.brandRed }]}>
                {validationError}
              </Text>
            )}

            <Text style={[styles.privacy, { color: t.inkFaint }]}>Your identity is shown only to authorized moderators.</Text>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={pending}
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              style={[styles.button, { borderColor: t.ruleHairline, opacity: pending ? 0.55 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: t.inkMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void submit()}
              disabled={pending}
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              style={[
                styles.button,
                styles.submitButton,
                { borderColor: t.surfaceAnchor, backgroundColor: pending ? t.muted : t.surfaceAnchor },
              ]}
            >
              <Text style={[styles.buttonText, { color: pending ? t.inkFaint : t.inkInverse }]}>
                {pending ? 'Submitting…' : 'Submit report'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(19,35,41,.42)' },
  sheet: {
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  title: { fontFamily: sans(600), fontSize: 18, letterSpacing: trackDisplay(18) },
  subtitle: { marginTop: 3, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  body: { gap: 10, paddingBottom: 14 },
  label: { fontFamily: sans(600), fontSize: 13 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12 },
  categoryText: { fontFamily: sans(500), fontSize: 12 },
  detailsHeader: { marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontFamily: sans(400), fontSize: 11 },
  detailsInput: { minHeight: 112, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { fontFamily: sans(500), fontSize: 12, lineHeight: 17 },
  privacy: { fontFamily: sans(400), fontSize: 11.5, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 9, paddingTop: 10 },
  button: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  submitButton: { flex: 1.35 },
  buttonText: { fontFamily: sans(600), fontSize: 12.5 },
});
