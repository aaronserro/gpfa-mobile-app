/**
 * One job listing, opened from the board.
 *
 * Bookmark and share are present in the design but inert here — there is no
 * saved-roles endpoint yet, the same as the resource sheet's bookmark.
 */
import { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import {
  ArrowSquareOut,
  BookmarkSimple,
  Briefcase,
  CalendarDots,
  CurrencyCircleDollar,
  MapPin,
  ShareFat,
} from '../../ds/icons';
import { MastheadMeta, OrgMark, PageActions, PageHead, StickyTitle, SwipeBack, useStickyScroll } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { jobFunctionRule, sans, trackDisplay } from '../../ds/tokens';
import { FactChip, SourceChip } from './parts';
import { orgInitials } from '../../lib/format';
import type { JobListing } from '../../api/types';

export interface JobPostingProps {
  job: JobListing;
  onBack: () => void;
  /** Opens the employer's own posting. Nothing happens without an `applyUrl`. */
  onApply?: (job: JobListing) => void;
}

export default function JobPosting({ job, onBack, onApply }: JobPostingProps) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();
  const dragOffset = useRef(new Animated.Value(0)).current;
  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-28, 28])
        .runOnJS(true)
        .onUpdate((event) => {
          dragOffset.setValue(Math.max(0, event.translationY));
        })
        .onEnd((event) => {
          if (event.translationY >= 72 || event.velocityY >= 900) {
            onBack();
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
          if (success) return;
          Animated.spring(dragOffset, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }),
    [dragOffset, onBack]
  );

  return (
    <Animated.View style={[styles.fill, { transform: [{ translateY: dragOffset }] }]}>
      <GestureDetector gesture={dismissGesture}>
        <View style={styles.dismissHandle} accessible={false}>
          <View style={[styles.grabber, { backgroundColor: t.ruleStrong }]} />
        </View>
      </GestureDetector>
      <SwipeBack onBack={onBack} style={styles.fill}>
      <StickyTitle scrollY={scrollY} title="Role" onBack={onBack} backLabel="Back to the job board" actions={<PageActions />} />

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        {...handlers}
      >
        <PageHead
          title="Role" onBack={onBack} backLabel="Back to the job board"
          actions={
            <>
              <View style={styles.topActions}>
            <Pressable accessibilityLabel="Save role" hitSlop={8}>
              <BookmarkSimple size={18} color={t.inkMuted} />
            </Pressable>
            <Pressable accessibilityLabel="Share role" hitSlop={8}>
              <ShareFat size={18} color={t.inkMuted} />
            </Pressable>
          </View>
              <PageActions />
            </>
          }
        />
        <View
          style={[
            styles.hero,
            {
              backgroundColor: t.surfacePaper,
              borderBottomColor: t.rule,
              borderLeftColor: jobFunctionRule(t, job.fnKey),
            },
          ]}
        >
          <View style={styles.heroTop}>
            <SourceChip source={job.source} size={10} />
            <Text style={[styles.posted, { color: t.inkMuted }]}>Posted {job.posted}</Text>
          </View>

          <Text style={[styles.title, { color: t.inkStrong }]}>{job.title}</Text>

          <View style={styles.orgRow}>
            <OrgMark initials={job.initials ?? orgInitials(job.org)} size={40} />
            <View style={styles.flex}>
              <Text style={[styles.org, { color: t.inkStrong }]}>{job.org}</Text>
              <MastheadMeta size={11}>{job.orgMeta}</MastheadMeta>
            </View>
          </View>

          <View style={styles.facts}>
            <FactChip icon={(c) => <MapPin size={13} color={c} />}>{job.loc}</FactChip>
            <FactChip icon={(c) => <Briefcase size={13} color={c} />}>{job.fn}</FactChip>
            <FactChip icon={(c) => <CurrencyCircleDollar size={13} color={c} />}>
              {job.comp}
            </FactChip>
            <FactChip tone="amber" icon={(c) => <CalendarDots size={13} color={c} />}>
              {job.closes}
            </FactChip>
          </View>
        </View>

        <Text style={[styles.sectionHead, { color: t.inkStrong }]}>The role</Text>
        <Text style={[styles.body, { color: t.inkBody }]}>{job.blurb}</Text>

        <View style={styles.bullets}>
          {job.bullets.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: t.brandLeaf }]} />
              <Text style={[styles.bulletText, { color: t.inkBody }]}>{b}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHead, { color: t.inkStrong }]}>The organization</Text>
        <Text style={[styles.body, { color: t.inkBody }]}>{job.about}</Text>

        {!!job.stats.length && (
          <View
            style={[styles.stats, { borderColor: t.rule, backgroundColor: t.surfacePaper }]}
          >
            {job.stats.map((s, i) => (
              <View
                key={s.label}
                style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.rule }]}
              >
                <Text style={[styles.statLabel, { color: t.inkMuted }]}>{s.label}</Text>
                <Text style={[styles.statValue, { color: t.inkStrong }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.disclaimer, { color: t.inkFaint }]}>
          Applications are handled entirely by the posting organization. GPFA does not receive or
          process applications and is not party to any hiring decision.
        </Text>
      </Animated.ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: t.surfacePaper, borderTopColor: t.rule },
        ]}
      >
        <View style={styles.flex}>
          <Text style={[styles.footComp, { color: t.inkStrong }]}>{job.comp}</Text>
          <Text style={[styles.posted, { color: t.inkMuted }]}>{job.closes}</Text>
        </View>
        <Pressable
          onPress={() => onApply?.(job)}
          accessibilityLabel={`Apply for ${job.title}`}
          style={({ pressed }) => [
            styles.applyBtn,
            { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
          ]}
        >
          <Text style={styles.applyText}>Apply</Text>
          <ArrowSquareOut size={16} color="#fff" />
        </Pressable>
      </View>
      </SwipeBack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  dismissHandle: { alignItems: 'center', height: 18, justifyContent: 'center' },
  grabber: { borderRadius: 2, height: 4, width: 36 },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  scroll: { paddingBottom: 12 },

  hero: {
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingVertical: 18,
    paddingRight: 20,
    paddingLeft: 17,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  posted: { fontFamily: sans(400), fontSize: 12.5 },
  title: {
    marginTop: 12,
    fontFamily: sans(600),
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: trackDisplay(20),
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  org: { fontFamily: sans(600), fontSize: 15 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  sectionHead: {
    marginTop: 18,
    paddingHorizontal: 20,
    fontFamily: sans(600),
    fontSize: 14.5,
    letterSpacing: trackDisplay(14.5),
  },
  statLabel: { fontFamily: sans(400), fontSize: 12.5 },
  body: {
    marginTop: 8,
    paddingHorizontal: 20,
    fontFamily: sans(400),
    fontSize: 15,
    lineHeight: 24,
  },
  bullets: { marginTop: 10, paddingHorizontal: 20 },
  bulletRow: { flexDirection: 'row', gap: 9, paddingVertical: 5 },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: { flex: 1, fontFamily: sans(400), fontSize: 14.5, lineHeight: 22.5 },

  stats: {
    flexDirection: 'row',
    marginTop: 18,
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  statValue: { marginTop: 3, fontFamily: sans(600), fontSize: 15 },

  disclaimer: {
    marginTop: 16,
    paddingHorizontal: 20,
    fontFamily: sans(400),
    fontSize: 11.5,
    lineHeight: 18.5,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  footComp: { fontFamily: sans(600), fontSize: 14.5 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  applyText: { fontFamily: sans(600), fontSize: 15, color: '#fff' },
});
