import * as DocumentPicker from 'expo-document-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ForumUploadFile } from '../../api/types';
import { FileText, Paperclip, X } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';

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

export default function ForumFilePicker({
  files,
  onChange,
  compact = false,
}: {
  files: ForumUploadFile[];
  onChange: (files: ForumUploadFile[]) => void;
  compact?: boolean;
}) {
  const { t } = useTheme();

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIME_TYPES,
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const existing = new Set(files.map((file) => file.uri));
    onChange([
      ...files,
      ...result.assets
        .filter((asset) => !existing.has(asset.uri))
        .map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        })),
    ]);
  };

  return (
    <View style={compact ? styles.compactWrap : styles.wrap}>
      <Pressable
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel="Attach files"
        style={[styles.attach, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
      >
        <Paperclip size={14} color={t.inkMuted} />
        <Text style={[styles.attachText, { color: t.inkMuted }]}>Attach files</Text>
      </Pressable>

      {files.length > 0 && (
        <View style={styles.list}>
          {files.map((file) => (
            <View key={file.uri} style={[styles.file, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <FileText size={14} color={t.inkMuted} />
              <View style={styles.fileCopy}>
                <Text numberOfLines={1} style={[styles.fileName, { color: t.inkStrong }]}>{file.name}</Text>
                <Text style={[styles.fileMeta, { color: t.inkFaint }]}>{formatFileSize(file.size)}</Text>
              </View>
              <Pressable
                onPress={() => onChange(files.filter((candidate) => candidate.uri !== file.uri))}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${file.name}`}
                hitSlop={8}
              >
                <X size={14} color={t.inkMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function formatFileSize(size: number | undefined): string {
  if (!size || size <= 0) return 'Ready to upload';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  compactWrap: { marginTop: 7 },
  attach: {
    alignSelf: 'flex-start',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
  },
  attachText: { fontFamily: sans(600), fontSize: 12 },
  list: { marginTop: 8, gap: 6 },
  file: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  fileCopy: { flex: 1, minWidth: 0 },
  fileName: { fontFamily: sans(500), fontSize: 12 },
  fileMeta: { marginTop: 2, fontFamily: mono(400), fontSize: 9.5 },
});
