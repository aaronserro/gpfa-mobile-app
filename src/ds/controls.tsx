import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import { alpha, sans } from './tokens';
import { AppText } from './text';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  style,
}: {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segment, { backgroundColor: t.surfaceSoft }, style]}
    >
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            disabled={option.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: option.disabled }}
            style={({ pressed }) => [
              styles.segmentButton,
              selected && { backgroundColor: t.surfacePaper },
              pressed && !option.disabled && Platform.OS !== 'android'
                ? { opacity: 0.7 }
                : null,
              option.disabled ? styles.disabled : null,
            ]}
            android_ripple={{ color: alpha(t.inkStrong, 0.1) }}
          >
            <AppText
              variant="caption"
              tone={selected ? 'strong' : 'muted'}
              style={{ fontFamily: sans(selected ? 600 : 400) }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
  count,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? t.surfaceAnchor : t.rule,
          backgroundColor: selected ? t.surfaceAnchor : t.surfacePaper,
        },
        pressed && Platform.OS !== 'android' ? { opacity: 0.7 } : null,
      ]}
      android_ripple={{ color: alpha(selected ? t.inkInverse : t.inkStrong, 0.12) }}
    >
      <AppText
        variant="caption"
        tone={selected ? 'inverse' : 'muted'}
        style={{ fontFamily: sans(selected ? 600 : 500) }}
      >
        {label}{count === undefined ? '' : ` · ${count}`}
      </AppText>
    </Pressable>
  );
}

export function FilterChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 12 },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  chipRow: { gap: 8, paddingHorizontal: 1 },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: { opacity: 0.45 },
});
