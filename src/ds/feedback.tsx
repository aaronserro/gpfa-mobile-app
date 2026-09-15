import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ArrowClockwise, Tray, type Icon } from './icons';
import { ActionButton, IconTile } from './primitives';
import { useTheme } from './ThemeProvider';
import { AppText } from './text';

export function CollectionEmptyState({
  title,
  body,
  Glyph = Tray,
  actionLabel,
  onAction,
  compact = false,
  style,
}: {
  title: string;
  body: string;
  Glyph?: Icon;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.empty,
        compact && styles.emptyCompact,
        { borderColor: t.ruleStrong },
        style,
      ]}
    >
      <IconTile Glyph={Glyph} size={compact ? 34 : 38} />
      <AppText variant="cardTitle" tone="strong" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="body" tone="muted" style={styles.center}>
        {body}
      </AppText>
      {!!actionLabel && !!onAction && (
        <ActionButton label={actionLabel} onPress={onAction} variant="outline" />
      )}
    </View>
  );
}

export function InlineRetryState({
  title = 'This section could not be loaded',
  message,
  onRetry,
  style,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.retry, { borderColor: t.brandRed, backgroundColor: t.surfacePaper }, style]}>
      <AppText variant="cardTitle" tone="strong">{title}</AppText>
      {!!message && (
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {message}
        </AppText>
      )}
      <ActionButton label="Try again" Glyph={ArrowClockwise} onPress={onRetry} variant="outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyCompact: { paddingVertical: 18 },
  center: { textAlign: 'center' },
  retry: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
});
