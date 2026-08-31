import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileEventAttendee } from '../api/types';
import { CaretDown } from '../ds/icons';
import { Avatar } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { mono, sans } from '../ds/tokens';

const STACK_LIMIT = 3;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function EventAttendees({
  count,
  attendees,
  onOpenMemberProfile,
}: {
  count: number;
  attendees: MobileEventAttendee[];
  onOpenMemberProfile: (memberId: string) => void;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const unnamed = Math.max(0, count - attendees.length);
  const countLabel = `${count} ${count === 1 ? 'member' : 'members'} attending`;

  if (count === 0) {
    return (
      <View>
        <Text style={[styles.label, { color: t.inkMuted }]}>Attending</Text>
        <Text style={[styles.empty, { color: t.inkMuted }]}>No RSVPs yet</Text>
      </View>
    );
  }

  if (attendees.length === 0) {
    return (
      <View>
        <Text style={[styles.label, { color: t.inkMuted }]}>Attending</Text>
        <Text style={[styles.countOnly, { color: t.inkStrong }]}>{countLabel}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.label, { color: t.inkMuted }]}>Attending</Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${countLabel}. ${open ? 'Hide' : 'Show'} attendee list`}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.stack}>
          {attendees.slice(0, STACK_LIMIT).map((attendee, index) => (
            <Pressable
              key={`${attendee.name}-${index}`}
              onPress={attendee.id ? () => onOpenMemberProfile(attendee.id!) : undefined}
              disabled={!attendee.id}
              accessibilityRole={attendee.id ? 'button' : undefined}
              accessibilityLabel={attendee.id ? `Open ${attendee.name}'s profile` : undefined}
              style={[
                index > 0 && styles.overlap,
              ]}
            >
              <Avatar
                initials={initialsOf(attendee.name)}
                size={30}
                style={{ borderColor: t.surfacePaper }}
              />
            </Pressable>
          ))}
        </View>
        <Text style={[styles.count, { color: t.inkStrong }]} numberOfLines={1}>
          {countLabel}
        </Text>
        <Text style={[styles.toggle, { color: t.brandGreen }]}>{open ? 'Hide' : 'See who'}</Text>
        <CaretDown
          size={13}
          color={t.brandGreen}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open && (
        <View style={[styles.roster, { borderTopColor: t.ruleHairline }]}>
          {attendees.map((attendee, index) => (
            <Pressable
              key={`${attendee.name}-${index}`}
              onPress={attendee.id ? () => onOpenMemberProfile(attendee.id!) : undefined}
              disabled={!attendee.id}
              accessibilityRole={attendee.id ? 'button' : undefined}
              accessibilityLabel={attendee.id ? `Open ${attendee.name}'s profile` : undefined}
              style={[
                styles.rosterRow,
                index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
              ]}
            >
              <Text style={[styles.name, { color: t.inkStrong }]} numberOfLines={1}>
                {attendee.name}
              </Text>
              {!!attendee.org && (
                <Text style={[styles.org, { color: t.inkMuted }]} numberOfLines={1}>
                  {attendee.org}
                </Text>
              )}
            </Pressable>
          ))}
          {unnamed > 0 && (
            <Text style={[styles.more, { color: t.inkMuted }]}>+{unnamed} more</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: sans(500), fontSize: 11.5 },
  empty: { marginTop: 5, fontFamily: sans(400), fontSize: 13 },
  countOnly: { marginTop: 5, fontFamily: sans(500), fontSize: 13 },
  summary: { minHeight: 40, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  pressed: { opacity: 0.78 },
  stack: { flexDirection: 'row', paddingLeft: 1 },
  overlap: { marginLeft: -9 },
  count: { flex: 1, minWidth: 0, fontFamily: sans(500), fontSize: 12.5 },
  toggle: { fontFamily: sans(600), fontSize: 11.5 },
  roster: { marginTop: 8, borderTopWidth: 1 },
  rosterRow: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, minWidth: 0, fontFamily: sans(500), fontSize: 12.5 },
  org: { maxWidth: '42%', fontFamily: mono(500), fontSize: 9.5, letterSpacing: 0.4 },
  more: { paddingVertical: 9, fontFamily: sans(400), fontSize: 12.5 },
});
