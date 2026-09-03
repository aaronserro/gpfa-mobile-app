import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CalendarDots, CaretDown } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans } from '../../ds/tokens';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

type PickerMode = 'date' | 'time';

export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function nextWholeHour(from = new Date()): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export function PostDateTimeField({
  label,
  value,
  timezone,
  minimumDate,
  onChange,
}: {
  label: string;
  value: Date;
  timezone: string;
  minimumDate?: Date;
  onChange: (value: Date) => void;
}) {
  const { t, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }),
    [timezone]
  );

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'set' && selected) onChange(selected);
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: t.inkMuted }]}>{label}</Text>
      <Pressable
        onPress={() => {
          setExpanded((current) => {
            const next = !current;
            setPickerMode(next ? 'date' : null);
            return next;
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatter.format(value)}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.summary,
          {
            borderColor: expanded ? t.surfaceAnchor : t.ruleHairline,
            backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
          },
        ]}
      >
        <CalendarDots size={18} color={t.surfaceAnchor} />
        <Text style={[styles.summaryText, { color: t.inkStrong }]}>{formatter.format(value)}</Text>
        <CaretDown size={15} color={t.inkFaint} />
      </Pressable>

      {expanded && (
        <View style={[styles.pickerPanel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}>
          <View style={styles.modeRow}>
            {(['date', 'time'] as const).map((mode) => {
              const selected = pickerMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setPickerMode(mode)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.modeButton,
                    {
                      borderColor: selected ? t.surfaceAnchor : t.ruleHairline,
                      backgroundColor: selected ? t.surfaceAnchor : t.surfacePaper,
                    },
                  ]}
                >
                  <Text style={[styles.modeText, { color: selected ? t.inkInverse : t.inkMuted }]}>
                    {mode === 'date' ? 'Choose date' : 'Choose time'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {pickerMode && (
            <DateTimePicker
              value={value}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={pickerMode === 'date' ? minimumDate : undefined}
              minuteInterval={5}
              timeZoneName={timezone}
              themeVariant={isDark ? 'dark' : 'light'}
              accentColor={t.surfaceAnchor}
              onChange={handleChange}
              style={styles.picker}
            />
          )}
        </View>
      )}
    </View>
  );
}

export function PostTimezoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const options = useMemo(
    () => [value, deviceTimezone(), ...COMMON_TIMEZONES].filter(
      (zone, index, zones) => zone && zones.indexOf(zone) === index
    ),
    [value]
  );

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: t.inkMuted }]}>Timezone</Text>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={`Timezone: ${value}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.summary,
          {
            borderColor: expanded ? t.surfaceAnchor : t.ruleHairline,
            backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
          },
        ]}
      >
        <Text style={[styles.zoneText, { color: t.inkStrong }]}>{value}</Text>
        <CaretDown size={15} color={t.inkFaint} />
      </Pressable>
      {expanded && (
        <View style={[styles.zoneList, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
          {options.map((zone) => {
            const selected = zone === value;
            return (
              <Pressable
                key={zone}
                onPress={() => {
                  onChange(zone);
                  setExpanded(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.zoneOption,
                  { borderTopColor: t.ruleHairline, backgroundColor: selected ? t.surfaceSoft : t.surfacePaper },
                ]}
              >
                <Text style={[styles.zoneOptionText, { color: selected ? t.surfaceAnchor : t.inkMuted }]}>{zone}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginTop: 16 },
  label: { marginBottom: 8, fontFamily: sans(500), fontSize: 12.5 },
  summary: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  summaryText: { flex: 1, fontFamily: sans(500), fontSize: 13, lineHeight: 18 },
  pickerPanel: { marginTop: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
  modeText: { fontFamily: sans(600), fontSize: 12 },
  picker: { alignSelf: 'stretch' },
  zoneText: { flex: 1, fontFamily: mono(400), fontSize: 11.5 },
  zoneList: { marginTop: 8, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  zoneOption: { minHeight: 42, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  zoneOptionText: { fontFamily: mono(400), fontSize: 11.5 },
});
