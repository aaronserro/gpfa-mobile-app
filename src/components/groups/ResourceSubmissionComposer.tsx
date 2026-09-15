import { useMemo, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { FileText, Link, Paperclip, X } from '../../ds/icons';
import { Input } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../../ds/tokens';
import { useSheetTransition } from '../../hooks/useSheetTransition';
import type {
  WorkingGroupResourceSubmissionFile,
  WorkingGroupResourceSubmissionInput,
  WorkingGroupResourceType,
} from '../../api/types';

const RESOURCE_TYPES: Array<{ value: WorkingGroupResourceType; label: string }> = [
  { value: 'document', label: 'Document' },
  { value: 'meeting_material', label: 'Meeting material' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'template', label: 'Template' },
  { value: 'report', label: 'Report' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'external_link', label: 'External link' },
  { value: 'guide', label: 'Guide' },
  { value: 'other', label: 'Other' },
];

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

interface SelectedResourceFile extends WorkingGroupResourceSubmissionFile {
  size?: number;
}

export default function ResourceSubmissionComposer({
  groupName,
  submitting = false,
  onClose,
  onSubmit,
}: {
  groupName: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: WorkingGroupResourceSubmissionInput) => Promise<void>;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<WorkingGroupResourceType>('document');
  const [sourceUrl, setSourceUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [contributorNotes, setContributorNotes] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<SelectedResourceFile[]>([]);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const dragOffset = useRef(new Animated.Value(0)).current;
  const { closing, progress, requestClose } = useSheetTransition(onClose, sheetHeight);

  const parsedTags = useMemo(
    () => tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tags]
  );
  const canSubmit = title.trim().length >= 3 && (!!sourceUrl.trim() || files.length > 0) && !submitting && !closing;
  const dismissDisabled = submitting || closing;
  const dismissDistance = Math.min(Math.max(sheetHeight * 0.16, 64), 128);
  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!dismissDisabled)
        .activeOffsetY(8)
        .failOffsetX([-28, 28])
        .runOnJS(true)
        .onUpdate((event) => {
          dragOffset.setValue(Math.max(0, event.translationY));
        })
        .onEnd((event) => {
          if (event.translationY >= dismissDistance || event.velocityY >= 900) {
            requestClose();
            return;
          }
          Animated.spring(dragOffset, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        })
        .onFinalize((_event, success) => {
          if (success || closing) return;
          Animated.spring(dragOffset, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }),
    [closing, dismissDisabled, dismissDistance, dragOffset, requestClose]
  );

  const pickFiles = async () => {
    setMessage(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIME_TYPES,
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    setFiles((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      })),
    ]);
  };

  const removeFile = (uri: string) => {
    setFiles((current) => current.filter((file) => file.uri !== uri));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setMessage(null);

    try {
      await onSubmit({
        title: title.trim(),
        resourceType,
        sourceUrl: sourceUrl.trim() || undefined,
        summary: summary.trim() || undefined,
        contributorNotes: contributorNotes.trim() || undefined,
        tags: parsedTags,
        files,
      });
      setTitle('');
      setResourceType('document');
      setSourceUrl('');
      setSummary('');
      setContributorNotes('');
      setTags('');
      setFiles([]);
      setMessage({ kind: 'success', text: 'Submitted to the moderation queue.' });
    } catch (cause) {
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Resource submission could not be sent.',
      });
    }
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          style={styles.scrim}
          onPress={() => requestClose()}
          disabled={dismissDisabled}
          accessibilityRole="button"
          accessibilityLabel="Close resource submission"
          accessibilityState={{ disabled: dismissDisabled }}
        />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoider}>
        <Animated.View
          onLayout={(event) => setSheetHeight((height) => height || event.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              backgroundColor: t.surfacePaper,
              borderTopColor: t.rule,
              paddingBottom: Math.max(insets.bottom, 18),
              opacity: sheetHeight ? 1 : 0,
              transform: [{
                translateY: Animated.add(
                  progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetHeight * 1.02, 0],
                  }),
                  dragOffset
                ),
              }],
            },
          ]}
        >
          <GestureDetector gesture={dismissGesture}>
            <View>
              <View style={[styles.grabber, { backgroundColor: t.rule }]} />
              <View style={styles.head}>
                <View style={styles.flex}>
                  <Text style={[styles.kicker, { color: t.inkFaint }]}>RESOURCE SUBMISSION</Text>
                  <Text style={[styles.title, { color: t.inkStrong }]}>Share with {groupName}</Text>
                </View>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {message && (
              <View
                style={[
                  styles.message,
                  {
                    borderColor: message.kind === 'error' ? t.brandBrick : t.rule,
                    backgroundColor: message.kind === 'error' ? alpha(t.brandBrick, 0.08) : alpha(t.brandGreen, 0.08),
                  },
                ]}
              >
                <Text style={[styles.messageText, { color: message.kind === 'error' ? t.brandBrickInk : t.inkMuted }]}>
                  {message.text}
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: t.inkMuted }]}>Resource type</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {RESOURCE_TYPES.map((option) => {
                const on = option.value === resourceType;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setResourceType(option.value)}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? t.surfaceAnchor : t.rule,
                        backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? t.inkInverse : t.inkMuted }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Title</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Collateral playbook update"
              style={styles.field}
            />

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Source URL</Text>
            <Input
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.field}
            />

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Summary</Text>
            <Input
              value={summary}
              onChangeText={setSummary}
              placeholder="What should reviewers know at a glance?"
              multiline
              textAlignVertical="top"
              style={[styles.field, styles.textarea]}
            />

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Contributor notes</Text>
            <Input
              value={contributorNotes}
              onChangeText={setContributorNotes}
              placeholder="Add context for co-leads before publication."
              multiline
              textAlignVertical="top"
              style={[styles.field, styles.textarea]}
            />

            <Text style={[styles.fieldLabel, styles.label, { color: t.inkMuted }]}>Tags</Text>
            <Input
              value={tags}
              onChangeText={setTags}
              placeholder="repo, collateral, policy"
              autoCapitalize="none"
              style={styles.field}
            />

            <View style={styles.uploadHead}>
              <Text style={[styles.fieldLabel, { color: t.inkMuted }]}>Files</Text>
              <Pressable
                onPress={pickFiles}
                accessibilityRole="button"
                style={[styles.attachButton, { borderColor: t.rule, backgroundColor: t.surfacePage }]}
              >
                <Paperclip size={14} color={t.inkMuted} />
                <Text style={[styles.attachText, { color: t.inkMuted }]}>Attach</Text>
              </Pressable>
            </View>

            {files.length > 0 ? (
              <View style={styles.fileList}>
                {files.map((file) => (
                  <View key={file.uri ?? file.name} style={[styles.fileRow, { borderColor: t.rule }]}>
                    <FileText size={15} color={t.inkMuted} />
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={[styles.fileName, { color: t.inkStrong }]}>
                        {file.name ?? 'Selected file'}
                      </Text>
                      <Text style={[styles.fileMeta, { color: t.inkFaint }]}>{formatFileSize(file.size)}</Text>
                    </View>
                    {!!file.uri && (
                      <Pressable onPress={() => removeFile(file.uri ?? '')} hitSlop={8}>
                        <X size={15} color={t.inkMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyFiles, { borderColor: t.rule, backgroundColor: alpha(t.surfaceSoft, 0.25) }]}>
                <Link size={15} color={t.inkMuted} />
                <Text style={[styles.emptyText, { color: t.inkMuted }]}>Attach a file, or submit with a source URL.</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: t.rule }]}>
            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Submit resource"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              style={({ pressed }) => [
                styles.submit,
                {
                  backgroundColor: canSubmit ? (pressed ? t.brandGreenStrong : t.surfaceAnchor) : t.muted,
                },
              ]}
            >
              <Text style={[styles.submitText, { color: canSubmit ? t.inkInverse : t.inkFaint }]}>Submit Resource</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function formatFileSize(size: number | undefined): string {
  if (!size || size <= 0) return 'Ready to upload';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 95,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,35,41,.42)',
  },
  keyboardAvoider: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  sheet: {
    maxHeight: '94%',
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 4,
  },
  flex: { flex: 1, minWidth: 0 },
  kicker: { fontFamily: mono(600), fontSize: 9.5, letterSpacing: 1.5 },
  title: {
    marginTop: 3,
    fontFamily: sans(600),
    fontSize: 18,
    lineHeight: 23.5,
    letterSpacing: trackDisplay(18),
  },
  body: { paddingBottom: 24 },
  formScroll: { flexShrink: 1, minHeight: 0 },
  message: { marginTop: 12, borderWidth: 1, borderRadius: 8, padding: 11 },
  messageText: { fontFamily: sans(500), fontSize: 13.5, lineHeight: 19.5 },
  label: { marginTop: 16 },
  fieldLabel: { fontFamily: sans(500), fontSize: 13.5 },
  chips: { gap: 8, paddingVertical: 10 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
  },
  chipText: { fontFamily: mono(400), fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  field: {
    marginTop: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  textarea: { minHeight: 82 },
  uploadHead: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attachButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
  },
  attachText: { fontFamily: sans(600), fontSize: 13 },
  fileList: { marginTop: 9, gap: 8 },
  fileRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  fileName: { fontFamily: sans(500), fontSize: 13.5 },
  fileMeta: { marginTop: 2, fontFamily: mono(400), fontSize: 11 },
  emptyFiles: {
    marginTop: 9,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 11,
  },
  emptyText: { flex: 1, fontFamily: sans(400), fontSize: 13.5, lineHeight: 19.5 },
  actions: {
    marginHorizontal: -20,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  submit: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontFamily: sans(600), fontSize: 15 },
});
