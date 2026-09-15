import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import { alpha } from './tokens';

export function ContentRow({
  leading,
  trailing,
  children,
  onPress,
  divided = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  onPress?: () => void;
  divided?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const rowStyle: StyleProp<ViewStyle> = [
    styles.row,
    divided && { borderTopWidth: 1, borderTopColor: t.rule },
    style,
  ];
  const content = (
    <>
      {leading}
      <View style={styles.body}>{children}</View>
      {trailing}
    </>
  );

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        rowStyle,
        pressed && Platform.OS !== 'android' ? styles.pressed : null,
      ]}
      android_ripple={{ color: alpha(t.inkStrong, 0.1) }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    overflow: 'hidden',
  },
  body: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
});
