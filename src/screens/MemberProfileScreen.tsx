/**
 * The signed-in member's own profile, reached from the header avatar.
 *
 * From the Member Profile design. Two deliberate departures from it:
 *
 * - The design draws a bespoke anchor band (back caret, mono MEMBER PROFILE
 *   label, 64px avatar). `ScreenHeader` owns the band on every other screen, so
 *   the name is its title and the avatar, role and origin line sit in its
 *   `children` — the same relayout `OrgProfile` makes.
 * - The design's SAVED / ORGANIZATION mono eyebrows are sentence-case section
 *   heads here, per `docs/ADDING_A_SCREEN.md`.
 *
 * Presentational: the member, their saved documents and their organization all
 * arrive resolved.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookmarkSimple, CaretRight, Repeat } from '../ds/icons';
import { Avatar, MastheadMeta, OrgMark, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, postTypeStyle, resourceTypeStyle, sans, trackDisplay } from '../ds/tokens';
import { initials as initialsOf, orgInitials } from '../lib/format';
import { TYPE_ICON } from '../components/groups/parts';
import type { LibraryResource, Member, MemberOrg, MemberRepost } from '../api/types';

export interface MemberProfileScreenProps {
  member: Member;
  /** Bookmarked library documents, in the order they should be listed. */
  saved: LibraryResource[];
  /** Working-group posts the member has reposted, newest repost first. */
  reposts: MemberRepost[];
  /** How many working groups the member sits on — shown beside the origin line. */
  workingGroups: number;
  /** The member's organization, joined from the directory. Absent hides the card. */
  org: MemberOrg | null;
  onBack: () => void;
  /** Opens a saved document. Absent leaves the rows inert. */
  onOpenResource?: (resource: LibraryResource) => void;
  /** Opens a repost in its working group. Absent leaves the cards inert. */
  onOpenRepost?: (repost: MemberRepost) => void;
  /** Opens the organization's directory profile. Absent leaves the card inert. */
  onOpenOrg?: (org: MemberOrg) => void;
}

export default function MemberProfileScreen({
  member,
  saved,
  reposts,
  workingGroups,
  org,
  onBack,
  onOpenResource,
  onOpenRepost,
  onOpenOrg,
}: MemberProfileScreenProps) {
  const { t } = useTheme();

  const origin = [member.org, org && `${org.city}, ${org.country}`].filter(Boolean).join(' · ');

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={member.name} onBack={onBack} backLabel="Back">
        <View style={styles.identity}>
          <Avatar initials={member.initials ?? initialsOf(member.name)} size={48} />
          <View style={styles.flex}>
            {!!member.role && (
              <Text style={[styles.role, { color: t.inkBody }]}>{member.role}</Text>
            )}
            <View style={styles.originRow}>
              <MastheadMeta size={10} style={styles.flex}>
                {origin.toUpperCase()}
              </MastheadMeta>
              <MastheadMeta size={10} color={t.brandGreen}>
                {`${workingGroups} WORKING GROUP${workingGroups === 1 ? '' : 'S'}`}
              </MastheadMeta>
            </View>
          </View>
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHead
          label="Reposts"
          count={`${reposts.length} post${reposts.length === 1 ? '' : 's'}`}
        />
        <View style={styles.repostList}>
          {reposts.map((repost) => (
            <RepostCard key={repost.id} repost={repost} onOpen={() => onOpenRepost?.(repost)} />
          ))}
          {reposts.length === 0 && (
            <View
              style={[
                styles.repostEmpty,
                { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline },
              ]}
            >
              <Repeat size={20} color={t.inkMuted} />
              <Text style={[styles.empty, { color: t.inkMuted }]}>Reposted working-group posts appear here.</Text>
            </View>
          )}
        </View>

        <SectionHead
          label="Library bookmarks"
          count={`${saved.length} item${saved.length === 1 ? '' : 's'}`}
        />
        <View
          style={[styles.rows, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}
        >
          {saved.map((r, i) => {
            const chip = resourceTypeStyle(t, r.type);
            const meta = [r.authors, r.updatedAt, r.pages && `${r.pages} pp`]
              .filter(Boolean)
              .join(' · ')
              .toUpperCase();
            return (
              <Pressable
                key={r.id}
                onPress={() => onOpenResource?.(r)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.savedRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                  { backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent' },
                ]}
              >
                <View style={styles.flex}>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: chip.chipBg, borderColor: chip.chipBd },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: chip.ink }]}>{chip.label}</Text>
                  </View>
                  <Text style={[styles.savedTitle, { color: t.inkStrong }]}>{r.title}</Text>
                  <MastheadMeta size={10} style={styles.savedMeta}>
                    {meta}
                  </MastheadMeta>
                </View>
                {/* Filled: every row in this list is, by definition, saved. */}
                <BookmarkSimple size={17} weight="fill" color={t.brandGreen} />
              </Pressable>
            );
          })}
          {saved.length === 0 && (
            <Text style={[styles.empty, { color: t.inkMuted }]}>
              Nothing saved yet. Bookmark a document in the library and it lands here.
            </Text>
          )}
        </View>

        {!!org && (
          <>
            <SectionHead label="Organization" />
            <View style={styles.orgWrap}>
              <Pressable
                onPress={() => onOpenOrg?.(org)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.orgCard,
                  {
                    backgroundColor: t.surfacePaper,
                    borderColor: pressed ? t.ruleStrong : t.ruleHairline,
                  },
                ]}
              >
                <View style={styles.orgHead}>
                  <OrgMark initials={orgInitials(org.short)} logoUrl={org.logoUrl} size={40} />
                  <View style={styles.flex}>
                    <Text style={[styles.orgName, { color: t.inkStrong }]}>
                      {org.fullName ?? org.name}
                    </Text>
                    <MastheadMeta size={9.5} style={styles.orgMeta}>
                      {`${org.sector} · ${org.city}, ${org.country}`.toUpperCase()}
                    </MastheadMeta>
                  </View>
                  <CaretRight size={14} color={t.inkFaint} />
                </View>
                <View style={[styles.orgFoot, { borderTopColor: t.ruleHairline }]}>
                  <MastheadMeta size={11} color={t.inkFaint}>
                    {`${org.members} member${org.members === 1 ? '' : 's'} · ${org.workingGroups} working group${org.workingGroups === 1 ? '' : 's'}`}
                  </MastheadMeta>
                  <Text style={[styles.orgLink, { color: t.brandGreen }]}>Open profile →</Text>
                </View>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RepostCard({ repost, onOpen }: { repost: MemberRepost; onOpen: () => void }) {
  const { t } = useTheme();
  const post = repost.entry.post;
  const type = post.type ?? 'discussion';
  const skin = postTypeStyle(t, type);
  const TypeIcon = TYPE_ICON[type];
  const repostedOn = new Date(repost.repostedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open repost: ${post.title}`}
      style={({ pressed }) => [
        styles.repostCard,
        {
          backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : t.surfacePaper,
          borderColor: t.ruleHairline,
        },
      ]}
    >
      <View style={styles.repostHead}>
        <View style={[styles.repostChip, { backgroundColor: skin.chipBg, borderColor: skin.chipBd }]}>
          <TypeIcon size={12} color={skin.ink} />
          <Text style={[styles.repostChipText, { color: skin.ink }]}>{skin.label}</Text>
        </View>
        <Repeat size={15} weight="bold" color={t.brandGreen} />
      </View>
      <Text style={[styles.repostTitle, { color: t.inkStrong }]}>{post.title}</Text>
      {!!post.body && (
        <Text numberOfLines={2} style={[styles.repostBody, { color: t.inkMuted }]}>
          {post.body}
        </Text>
      )}
      <MastheadMeta size={9.5} style={styles.repostMeta}>
        {`${repost.groupName} · ${post.author} · REPOSTED ${repostedOn}`.toUpperCase()}
      </MastheadMeta>
    </Pressable>
  );
}

/** The heading above a section. Matches `OrgProfile`'s. */
function SectionHead({ label, count }: { label: string; count?: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionLabel, { color: t.inkStrong }]}>{label}</Text>
      {!!count && <Text style={[styles.sectionCount, { color: t.inkMuted }]}>{count}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 12 },
  role: { fontFamily: sans(400), fontSize: 12.5, lineHeight: 18.75 },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },

  scroll: { paddingBottom: 28 },
  repostList: { paddingHorizontal: 20, gap: 10 },
  repostCard: { borderWidth: 1, borderRadius: 8, padding: 14 },
  repostHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  repostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 32,
    borderWidth: 1,
  },
  repostChipText: { fontFamily: mono(400), fontSize: 9.5, letterSpacing: 0.48 },
  repostTitle: { marginTop: 9, fontFamily: sans(600), fontSize: 14, lineHeight: 20 },
  repostBody: { marginTop: 5, fontFamily: sans(400), fontSize: 12.5, lineHeight: 18.5 },
  repostMeta: { marginTop: 9 },
  repostEmpty: { borderWidth: 1, borderRadius: 8, alignItems: 'center', paddingVertical: 22 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  sectionLabel: { fontFamily: sans(600), fontSize: 13, letterSpacing: trackDisplay(13) },
  sectionCount: { fontFamily: sans(400), fontSize: 12 },
  rows: { borderTopWidth: 1, borderBottomWidth: 1 },

  savedRow: { flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 20 },
  chip: {
    alignSelf: 'flex-start',
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 32,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: mono(400),
    fontSize: 9.5,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
  },
  savedTitle: { marginTop: 7, fontFamily: sans(500), fontSize: 13.5, lineHeight: 19.6 },
  savedMeta: { marginTop: 5 },

  orgWrap: { paddingHorizontal: 20, paddingTop: 2 },
  orgCard: { borderWidth: 1, borderRadius: 8, padding: 14 },
  orgHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgName: { fontFamily: sans(600), fontSize: 14 },
  orgMeta: { marginTop: 3 },
  orgFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orgLink: { fontFamily: sans(400), fontSize: 12.5 },

  empty: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 19,
  },
});
