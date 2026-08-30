/**
 * The quick sheet behind the header avatar.
 *
 * From the Member Profile design: a bottom sheet with the member's identity and
 * three routes, all of which land on the full profile — the sheet is a shortcut
 * into it, not a second place to read the same facts.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowSquareOut, Buildings, CaretRight, Repeat, User, X, type Icon } from '../ds/icons';
import { Avatar } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import { initials as initialsOf } from '../lib/format';
import type { Member } from '../api/types';

export interface MemberSheetProps {
  member: Member;
  /** Shown on the Reposts row. */
  repostCount: number;
  onClose: () => void;
  /** Every row opens the profile; the design routes all three there. */
  onOpenProfile: () => void;
  /** Production session action, confirmation is owned by the app shell. */
  onSignOut?: () => void;
}

export default function MemberSheet({
  member,
  repostCount,
  onClose,
  onOpenProfile,
  onSignOut,
}: MemberSheetProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  // gpfaScrim (180ms) and gpfaSheet (280ms) from the design, run off one clock.
  // The design slides the sheet by 102% of its own height; RN's native driver
  // takes points, so the rise starts once layout has reported that height.
  const p = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!height) return;
    const a = Animated.timing(p, {
      toValue: 1,
      duration: 280,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [height, p]);

  const meta = [member.org, member.role].filter(Boolean).join(' · ').toUpperCase();

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: p }]}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close profile menu" />
      </Animated.View>

      <Animated.View
        onLayout={(e) => setHeight((h) => h || e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          {
            backgroundColor: t.surfacePaper,
            borderTopColor: t.ruleHairline,
            paddingBottom: Math.max(insets.bottom, 18),
            // Invisible for the one frame between mount and layout, so it never
            // paints at its resting position before the rise begins.
            opacity: height ? 1 : 0,
            transform: [
              {
                translateY: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height * 1.02, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.ruleHairline }]} />

        <View style={styles.head}>
          <Avatar initials={member.initials ?? initialsOf(member.name)} photoUrl={member.avatarUrl ?? undefined} size={44} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.name, { color: t.inkStrong }]}>
              {member.name}
            </Text>
            {!!meta && (
              <Text numberOfLines={1} style={[styles.meta, { color: t.inkMuted }]}>
                {meta}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={[styles.close, { borderColor: t.ruleHairline }]}
          >
            <X size={14} color={t.inkMuted} />
          </Pressable>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: t.ruleHairline }}>
          <Row icon={User} label="View profile" onPress={onOpenProfile} />
          <Row
            icon={Repeat}
            label="Reposts"
            trailing={String(repostCount)}
            onPress={onOpenProfile}
            divided
          />
          <Row
            icon={Buildings}
            label={`${member.org} organization`}
            onPress={onOpenProfile}
            divided
          />
          {!!onSignOut && (
            <Row icon={ArrowSquareOut} label="Sign out" onPress={onSignOut} divided />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function Row({
  icon: Glyph,
  label,
  trailing,
  divided = false,
  onPress,
}: {
  icon: Icon;
  label: string;
  /** Mono count on the right of the label, e.g. the saved-items total. */
  trailing?: string;
  divided?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
        { backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent' },
      ]}
    >
      <Glyph size={18} color={t.brandGreen} />
      <Text style={[styles.rowLabel, { color: t.inkStrong }]}>{label}</Text>
      {!!trailing && <Text style={[styles.rowCount, { color: t.inkFaint }]}>{trailing}</Text>}
      <CaretRight size={14} color={t.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 70 },
  // The one literal here: a scrim is the same dark in both themes, as in
  // PostComposer — no token stays dark when the palette inverts.
  scrim: { flex: 1, backgroundColor: 'rgba(19,35,41,.45)' },
  flex: { flex: 1, minWidth: 0 },

  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 8 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 14 },
  name: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  meta: { marginTop: 3, fontFamily: mono(400), fontSize: 10, letterSpacing: 0.4 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 20,
  },
  rowLabel: { flex: 1, fontFamily: sans(500), fontSize: 14 },
  rowCount: { fontFamily: mono(400), fontSize: 11 },
});
