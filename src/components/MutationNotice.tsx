import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckCircle, X } from '../ds/icons';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans } from '../ds/tokens';

export interface MutationNoticeValue {
  type: 'success' | 'error';
  message: string;
}

export default function MutationNotice({
  notice,
  onDismiss,
}: {
  notice: MutationNoticeValue | null;
  onDismiss: () => void;
}) {
  const { t } = useTheme();
  if (!notice) return null;

  const success = notice.type === 'success';
  const color = success ? t.brandLeaf : t.brandRed;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        { borderColor: alpha(color, 0.45), backgroundColor: alpha(color, 0.1) },
      ]}
    >
      {success && <CheckCircle size={18} weight="fill" color={color} />}
      <Text style={[styles.message, { color: t.inkStrong }]}>{notice.message}</Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        hitSlop={8}
      >
        <X size={16} color={t.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  message: { flex: 1, minWidth: 0, fontFamily: sans(500), fontSize: 12.5, lineHeight: 18 },
});