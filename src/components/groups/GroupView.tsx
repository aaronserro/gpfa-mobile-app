import { useState } from 'react';

/**
 * Groups tab, level two: one working group, across Activity, About, Resources,
 * Members and the co-lead moderation queue.
 *
 * Presentational. The post list arrives filtered and ordered; the tab and the
 * type filter are held by the caller so a trip into a post and back keeps them.
 */
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';

import {
  ArrowFatUp,
  ChatCircle,
  CheckCircle,
  FileText,
  MagnifyingGlass,
  Plus,
  Repeat,
  type Icon,
} from '../../ds/icons';
import { Avatar, MastheadMeta, ScreenHeader } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, resourceTypeStyle, sans, trackDisplay } from '../../ds/tokens';
import { initials as initialsOf } from '../../lib/format';
import { AnchorAvatar, RoleBadge, TagChip, TYPE_ICON, ROW_ICON } from './parts';
import type { Group, LibraryResource, PostType, Thread } from '../../api/types';

export type GroupTab = 'posts' | 'about' | 'resources' | 'members' | 'moderation';

export type PostFilterId = 'all' | PostType;

export const POST_FILTERS: { id: PostFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'discussion', label: 'Discussions' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'poll', label: 'Polls' },
  { id: 'event', label: 'Events' },
];

export interface GroupViewProps {
  group: Group;
  /** The group's posts, already filtered and newest-first. */
  posts: Thread[];
  /** The group's unfiltered posts, used by About and Moderation. */
  allPosts?: Thread[];
  /** Counts per type, for the About tab's Activity panel. */
  typeCounts: Record<PostType, number>;
  coLeads?: Group['members'];
  members?: Group['members'];
  resources?: LibraryResource[];
  loading?: boolean;
  loadingMore?: boolean;
  error?: Error | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  tab: GroupTab;
  onTab: (tab: GroupTab) => void;
  filter: PostFilterId;
  onFilter: (filter: PostFilterId) => void;
  subscribed: boolean;
  onToggleSubscribe: () => void;
  canModerate?: boolean;
  /** Reply count per post id, counting anything added this session. */
  replyCounts: Record<string, number>;
  upvoted: Record<string, boolean | undefined>;
  onToggleUpvote: (postId: string) => void;
  reposted: Record<string, boolean | undefined>;
  onToggleRepost: (postId: string) => void;
  /** Design prop: show the #topic chips on feed cards. */
  showTags: boolean;
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onCompose: () => void;
  onOpenResourceSubmission: () => void;
  onOpenResource?: (resource: LibraryResource) => void;
}

export default function GroupView({
  group,
  posts,
  allPosts = posts,
  typeCounts,
  coLeads: routeCoLeads = [],
  members: routeMembers = [],
  resources = [],
  loading = false,
  loadingMore = false,
  error = null,
  hasMore = false,
  onLoadMore,
  tab,
  onTab,
  filter,
  onFilter,
  subscribed,
  onToggleSubscribe,
  canModerate = false,
  replyCounts,
  upvoted,
  onToggleUpvote,
  reposted,
  onToggleRepost,
  showTags,
  onBack,
  onOpenPost,
  onCompose,
  onOpenResourceSubmission,
  onOpenResource,
}: GroupViewProps) {
  const { t } = useTheme();
  const [memberQuery, setMemberQuery] = useState('');

  const coLeads = routeCoLeads.length ? routeCoLeads : group.members.filter((m) => m.isLead);
  const members = mergeGroupMembers(routeMembers.length ? routeMembers : group.members, coLeads);
  const memberCount = members.length || group.memberCount || group.members.length;
  const visibleMembers = filterGroupMembers(members, memberQuery);
  const groupResources = resources;
  const moderationPosts = allPosts.filter((post) => (post.lifecycle ?? 'open') === 'open');
  const topics: string[] = [];
  for (const p of allPosts) for (const tag of p.tags ?? []) if (!topics.includes(tag)) topics.push(tag);
  const groupTabs: [GroupTab, string][] = [
    ['posts', 'Activity'],
    ['about', 'About'],
    ['resources', 'Resources'],
    ['members', 'Members'],
    ...(canModerate ? ([['moderation', 'Moderation']] as [GroupTab, string][]) : []),
  ];

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title={group.n}
        onBack={onBack}
        backLabel="Back to working groups"
        actions={
          <Pressable
            onPress={onToggleSubscribe}
            accessibilityRole="button"
            accessibilityState={{ selected: subscribed }}
            style={[
              subscribed ? styles.subBtnOn : styles.subBtnOff,
              subscribed
                ? { borderColor: t.ruleOnAnchor }
                : { backgroundColor: t.brandGreenOnDark },
            ]}
          >
            {subscribed && <CheckCircle size={12} weight="fill" color={t.brandGreenOnDark} />}
            <Text
              style={[
                subscribed ? styles.subTextOn : styles.subTextOff,
                { color: subscribed ? '#fff' : '#07171b' },
              ]}
            >
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </Text>
          </Pressable>
        }
      >

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {groupTabs.map(([id, label]) => {
            const on = id === tab;
            return (
              <Pressable
                key={id}
                onPress={() => onTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, { borderBottomColor: on ? t.surfaceAnchor : 'transparent' }]}
              >
                <Text style={[styles.tabLabel, { color: on ? t.inkStrong : t.inkFaint }]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScreenHeader>

      <View style={styles.fill}>
        {tab === 'posts' && (
          <>
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={400}
              onScroll={({ nativeEvent }) => {
                if (!hasMore || loadingMore || !onLoadMore) return;
                const distanceFromBottom =
                  nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
                if (distanceFromBottom < 220) onLoadMore();
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {POST_FILTERS.map(({ id, label }) => {
                  const on = id === filter;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => onFilter(id)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                          backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.filterChipText, { color: on ? t.inkInverse : t.inkMuted }]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {loading ? (
                <View
                  style={[
                    styles.emptyCard,
                    { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>Loading feed</Text>
                  <Text style={[styles.emptyBody, { color: t.inkMuted }]}>Fetching the latest group posts.</Text>
                </View>
              ) : error ? (
                <View
                  style={[
                    styles.emptyCard,
                    { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>Feed unavailable</Text>
                  <Text style={[styles.emptyBody, { color: t.inkMuted }]}>{error.message}</Text>
                </View>
              ) : posts.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>Nothing to show</Text>
                  <Text style={[styles.emptyBody, { color: t.inkMuted }]}>
                    No active posts match this filter.
                  </Text>
                </View>
              ) : (
                <View style={styles.cards}>
                  {posts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      replyCount={replyCounts[p.id] ?? p.replies.length}
                      upvoted={!!upvoted[p.id]}
                      onToggleUpvote={() => onToggleUpvote(p.id)}
                      reposted={reposted[p.id] ?? p.hasReposted ?? false}
                      repostCount={optimisticRepostCount(p, reposted[p.id])}
                      onToggleRepost={() => onToggleRepost(p.id)}
                      showTags={showTags}
                      onOpen={() => onOpenPost(p.id)}
                    />
                  ))}
                  {(hasMore || loadingMore) && (
                    <View style={[styles.moreRow, { borderColor: t.ruleHairline }]}>
                      <Text style={[styles.moreText, { color: t.inkMuted }]}>{loadingMore ? 'Loading more posts...' : 'More posts load as you scroll'}</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <Pressable
              onPress={onCompose}
              accessibilityRole="button"
              accessibilityLabel="New post"
              style={({ pressed }) => [
                styles.fab,
                { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
              ]}
            >
              <Plus size={18} weight="bold" color="#fff" />
              <Text style={styles.fabText}>Post</Text>
            </Pressable>

            <Pressable
              onPress={onOpenResourceSubmission}
              disabled={!subscribed}
              accessibilityRole="button"
              accessibilityLabel="Submit resource"
              accessibilityState={{ disabled: !subscribed }}
              style={({ pressed }) => [
                styles.resourceFab,
                {
                  borderColor: t.ruleHairline,
                  backgroundColor: !subscribed
                    ? t.muted
                    : pressed
                      ? alpha(t.surfaceAnchor, 0.14)
                      : t.surfacePaper,
                },
              ]}
            >
              <FileText size={16} color={subscribed ? t.surfaceAnchor : t.inkFaint} />
              <Text style={[styles.resourceFabText, { color: subscribed ? t.surfaceAnchor : t.inkFaint }]}>Resource</Text>
            </Pressable>
          </>
        )}

        {tab === 'about' && (
          <ScrollView contentContainerStyle={styles.about} showsVerticalScrollIndicator={false}>
            {!!group.meta && (
              <View style={[styles.infoPanel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
                <Text style={[styles.panelTitle, { color: t.inkStrong }]}>About</Text>
                <Text style={[styles.aboutBio, { color: t.inkMuted }]}>{group.meta}</Text>
              </View>
            )}

            <View style={[styles.infoPanel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Activity</Text>
              <InfoRow Icon={ChatCircle} label="Threads" value={typeCounts.discussion} />
              <InfoRow Icon={TYPE_ICON.announcement} label="Announcements" value={typeCounts.announcement} />
              <InfoRow Icon={TYPE_ICON.event} label="Events" value={typeCounts.event} />
              <InfoRow Icon={TYPE_ICON.poll} label="Polls" value={typeCounts.poll} />
            </View>

            {coLeads.length > 0 && (
              <View style={[styles.infoPanel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
                <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Leadership</Text>
                {coLeads.map((c) => (
                  <View key={c.name} style={styles.leadRow}>
                    <AnchorAvatar initials={c.initials ?? initialsOf(c.name)} size={34} />
                    <View style={styles.flex}>
                      <Text style={[styles.personName, { color: t.inkStrong }]}>{c.name}</Text>
                      <Text style={[styles.personRole, { color: t.inkMuted }]}>Co-lead · {c.org}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {canModerate && (
              <View style={[styles.infoPanel, styles.dashedPanel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
                <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Admin Actions</Text>
                <InfoActionRow Icon={FileText} label="Moderation queue" value={moderationPosts.length} onPress={() => onTab('moderation')} />
              </View>
            )}

            <View>
              <Text style={[styles.aboutHead, { color: t.inkFaint }]}>TOPICS IN THIS GROUP</Text>
              <View style={styles.topics}>
                {topics.map((tp) => (
                  <TagChip key={tp} label={tp} size={11.5} height={24} />
                ))}
                {topics.length === 0 && (
                  <Text style={[styles.personEmpty, { color: t.inkMuted }]}>
                    No topics tagged yet.
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.notifCard, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
              <Text style={[styles.notifTitle, { color: t.inkStrong }]}>Notifications</Text>
              <Text style={[styles.notifBody, { color: t.inkMuted }]}>
                {subscribed
                  ? 'You get an email digest of new posts in this group.'
                  : 'Subscribe to get an email digest of new posts in this group.'}
              </Text>
              <Pressable
                onPress={onToggleSubscribe}
                accessibilityRole="button"
                style={[
                  styles.notifBtn,
                  {
                    backgroundColor: subscribed ? t.surfacePaper : t.surfaceAnchor,
                    borderColor: subscribed ? t.ruleHairline : t.surfaceAnchor,
                  },
                ]}
              >
                <Text style={[styles.notifBtnText, { color: subscribed ? t.inkBody : '#fff' }]}>
                  {subscribed ? 'Unsubscribe' : 'Subscribe'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {tab === 'resources' && (
          <GroupResourcesPanel
            resources={groupResources}
            subscribed={subscribed}
            onSubmit={onOpenResourceSubmission}
            onOpenResource={onOpenResource}
          />
        )}

        {tab === 'moderation' && canModerate && (
          <ModerationPanel
            posts={moderationPosts}
            openThreadCount={moderationPosts.length}
            onOpenPost={onOpenPost}
          />
        )}

        {tab === 'members' && (
          <ScrollView contentContainerStyle={styles.members} showsVerticalScrollIndicator={false}>
            <View style={[styles.memberSearch, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
              <MagnifyingGlass size={15} color={t.inkMuted} />
              <TextInput
                value={memberQuery}
                onChangeText={setMemberQuery}
                placeholder="Search members"
                placeholderTextColor={t.inkFaint}
                style={[styles.memberSearchInput, { color: t.inkStrong }]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <MastheadMeta size={9.5} color={t.inkFaint} style={styles.membersMeta}>
              {`${visibleMembers.length} OF ${memberCount} MEMBERS · ${coLeads.length} CO-LEAD${coLeads.length === 1 ? '' : 'S'}`}
            </MastheadMeta>
            {visibleMembers.map((m) => (
              <View
                key={m.name}
                style={[
                  styles.memberRow,
                  { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline },
                ]}
              >
                <Avatar initials={m.initials ?? initialsOf(m.name)} size={36} />
                <View style={styles.flex}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.personName, { color: t.inkStrong }]}>{m.name}</Text>
                    {m.isLead && <RoleBadge>Co-lead</RoleBadge>}
                  </View>
                  <Text style={[styles.personRole, { color: t.inkMuted }]}>{m.role}</Text>
                </View>
                <MastheadMeta size={9.5} color={t.inkFaint}>
                  {m.org}
                </MastheadMeta>
              </View>
            ))}
            {visibleMembers.length === 0 && (
              <Text style={[styles.personEmpty, { color: t.inkMuted }]}>No members match this search.</Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function InfoRow({
  Icon,
  label,
  value,
}: {
  Icon: Icon;
  label: string;
  value: number | string;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: t.surfaceSoft }]}>
        <Icon size={16} color={t.inkMuted} />
      </View>
      <Text style={[styles.infoLabel, { color: t.inkStrong }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: t.inkStrong }]}>{String(value)}</Text>
    </View>
  );
}

function InfoActionRow({
  Icon,
  label,
  value,
  onPress,
}: {
  Icon: Icon;
  label: string;
  value?: number | string;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.infoActionRow, pressed && { backgroundColor: alpha(t.surfaceSoft, 0.7) }]}
    >
      <View style={[styles.infoIcon, { backgroundColor: t.surfaceSoft }]}>
        <Icon size={16} color={t.inkMuted} />
      </View>
      <Text style={[styles.infoLabel, { color: t.inkStrong }]}>{label}</Text>
      {value !== undefined && <Text style={[styles.infoValue, { color: t.inkMuted }]}>{String(value)}</Text>}
    </Pressable>
  );
}

function GroupResourcesPanel({
  resources,
  subscribed,
  onSubmit,
  onOpenResource,
}: {
  resources: LibraryResource[];
  subscribed: boolean;
  onSubmit: () => void;
  onOpenResource?: (resource: LibraryResource) => void;
}) {
  const { t } = useTheme();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = resources.filter((resource) => {
    if (!q) return true;
    return [resource.title, resource.summary, resource.authors, resource.type, ...resource.tags]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
  const tags = uniqueTags(resources);

  return (
    <ScrollView contentContainerStyle={styles.resources} showsVerticalScrollIndicator={false}>
      <View style={styles.resourceHeaderRow}>
        <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Group Resources</Text>
        <View style={[styles.countPill, { backgroundColor: t.surfaceSoft }]}>
          <Text style={[styles.countPillText, { color: t.inkMuted }]}>{filtered.length}</Text>
        </View>
      </View>

      <View style={[styles.memberSearch, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
        <MagnifyingGlass size={15} color={t.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search resources"
          placeholderTextColor={t.inkFaint}
          style={[styles.memberSearchInput, { color: t.inkStrong }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {tags.length > 0 && (
        <View style={styles.topics}>
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} size={11} height={23} />
          ))}
        </View>
      )}

      {resources.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) }]}>
          <FileText size={22} color={t.inkMuted} />
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No group resources yet</Text>
          <Text style={[styles.emptyBody, { color: t.inkMuted }]}>Approved resources for this working group will appear here.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) }]}>
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No matching resources</Text>
          <Text style={[styles.emptyBody, { color: t.inkMuted }]}>Adjust the search to show all group resources.</Text>
        </View>
      ) : (
        <View style={styles.resourceList}>
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onOpen={() => onOpenResource?.(resource)} />
          ))}
        </View>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={!subscribed}
        accessibilityRole="button"
        accessibilityState={{ disabled: !subscribed }}
        style={[
          styles.submitResourceButton,
          {
            backgroundColor: subscribed ? t.surfaceAnchor : t.muted,
            borderColor: subscribed ? t.surfaceAnchor : t.ruleHairline,
          },
        ]}
      >
        <Plus size={16} weight="bold" color={subscribed ? '#fff' : t.inkFaint} />
        <Text style={[styles.submitResourceText, { color: subscribed ? '#fff' : t.inkFaint }]}>Submit a resource</Text>
      </Pressable>
    </ScrollView>
  );
}

function ResourceCard({ resource, onOpen }: { resource: LibraryResource; onOpen: () => void }) {
  const { t } = useTheme();
  const skin = resourceTypeStyle(t, resource.type);
  return (
    <Pressable
      onPress={onOpen}
      disabled={!resource.href}
      accessibilityRole="button"
      accessibilityState={{ disabled: !resource.href }}
      style={({ pressed }) => [
        styles.resourceCard,
        { borderColor: t.ruleHairline, backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : t.surfacePaper },
      ]}
    >
      <View style={styles.resourceCardHead}>
        <View style={styles.flex}>
          <Text style={[styles.resourceTitle, { color: t.inkStrong }]}>{resource.title}</Text>
          <View style={styles.resourceChips}>
            <View style={[styles.resourceTypeChip, { borderColor: skin.chipBd, backgroundColor: skin.chipBg }]}>
              <Text style={[styles.resourceTypeText, { color: skin.ink }]}>{resource.type}</Text>
            </View>
          </View>
        </View>
        {!!resource.href && <FileText size={16} color={t.inkMuted} />}
      </View>
      <Text numberOfLines={2} style={[styles.resourceSummary, { color: t.inkMuted }]}>{resource.summary}</Text>
      <Text numberOfLines={1} style={[styles.resourceMeta, { color: t.inkFaint }]}>
        {resource.authors} · {resource.updatedAt}{resource.pages ? ` · ${resource.pages} pages` : ''}
      </Text>
    </Pressable>
  );
}

function ModerationPanel({
  posts,
  openThreadCount,
  onOpenPost,
}: {
  posts: Thread[];
  openThreadCount: number;
  onOpenPost: (postId: string) => void;
}) {
  const { t } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.resources} showsVerticalScrollIndicator={false}>
      <View style={styles.resourceHeaderRow}>
        <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Moderation queue</Text>
        <View style={[styles.countPill, { backgroundColor: t.surfaceSoft }]}>
          <Text style={[styles.countPillText, { color: t.inkMuted }]}>{openThreadCount}</Text>
        </View>
      </View>

      {posts.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) }]}>
          <FileText size={22} color={t.inkMuted} />
          <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>Nothing needs review</Text>
          <Text style={[styles.emptyBody, { color: t.inkMuted }]}>Open group posts that need co-lead attention will appear here.</Text>
        </View>
      ) : (
        <View style={styles.resourceList}>
          {posts.map((post) => {
            const type = post.type ?? 'discussion';
            const TypeIcon = TYPE_ICON[type];
            return (
              <Pressable
                key={post.id}
                onPress={() => onOpenPost(post.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.moderationCard,
                  { borderColor: t.ruleHairline, backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : t.surfacePaper },
                ]}
              >
                <View style={styles.cardType}>
                  <TypeIcon size={14} color={t.inkMuted} />
                  <Text style={[styles.cardTypeText, { color: t.inkMuted }]}>{type}</Text>
                </View>
                <Text style={[styles.resourceTitle, { color: t.inkStrong }]}>{post.title}</Text>
                <Text numberOfLines={2} style={[styles.resourceSummary, { color: t.inkMuted }]}>{post.body}</Text>
                <Text style={[styles.resourceMeta, { color: t.inkFaint }]}>{post.author} · {post.time}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

/* ── one post in the group feed ───────────────────────────────────────────── */

function PostCard({
  post,
  replyCount,
  upvoted,
  onToggleUpvote,
  reposted,
  repostCount,
  onToggleRepost,
  showTags,
  onOpen,
}: {
  post: Thread;
  replyCount: number;
  upvoted: boolean;
  onToggleUpvote: () => void;
  reposted: boolean;
  repostCount: number;
  onToggleRepost: () => void;
  showTags: boolean;
  onOpen: () => void;
}) {
  const { t } = useTheme();
  const type = post.type ?? 'discussion';
  const TypeIcon = TYPE_ICON[type];
  const kindLabel = type === 'announcement' ? 'Announcement' : type[0].toUpperCase() + type.slice(1);

  // The design collapses an event's rows or a poll's shape into one meta strip.
  let strip = '';
  if (type === 'event' && post.eventRows) strip = post.eventRows.map((e) => e.text).join(' · ');
  if (post.poll) {
    const total = post.poll.options.reduce((a, o) => a + o.votes, 0);
    strip = `${post.poll.options.length} options · ${total} responses · ${post.poll.closes.split(' · ')[0]}`;
  }

  return (
    <View style={[styles.card, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <Pressable onPress={onOpen} accessibilityRole="button">
        <View style={styles.cardMetaRow}>
          <Avatar initials={post.initials ?? initialsOf(post.author)} size={22} />
          <Text numberOfLines={1} style={[styles.cardAuthor, { color: t.inkMuted }]}>
            {post.author}
          </Text>
          <Text style={[styles.cardDot, { color: t.inkMuted }]}>·</Text>
          <View style={styles.cardType}>
            <TypeIcon size={13} color={alpha(t.inkStrong, 0.8)} />
            <Text style={[styles.cardTypeText, { color: alpha(t.inkStrong, 0.8) }]}>
              {kindLabel}
            </Text>
          </View>
          <Text style={[styles.cardDot, { color: t.inkMuted }]}>·</Text>
          <Text style={[styles.cardTime, { color: t.inkMuted }]}>{post.time}</Text>
        </View>

        <Text style={[styles.cardTitle, { color: t.inkStrong }]}>{post.title}</Text>
        <Text numberOfLines={2} style={[styles.cardBody, { color: t.inkMuted }]}>
          {post.body}
        </Text>

        {!!strip && (
          <View
            style={[
              styles.strip,
              { borderColor: alpha(t.ruleHairline, 0.6), backgroundColor: alpha(t.surfaceSoft, 0.3) },
            ]}
          >
            <TypeIcon size={13} color={t.inkMuted} />
            <Text style={[styles.stripText, { color: t.inkMuted }]}>{strip}</Text>
          </View>
        )}

        {showTags && !!post.tags?.length && (
          <View style={styles.cardTags}>
            {post.tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </View>
        )}
      </Pressable>

      <View style={styles.cardActions}>
        <Pressable
          onPress={onToggleUpvote}
          accessibilityRole="button"
          accessibilityLabel="Upvote post"
          style={[styles.cardAction, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage }]}
        >
          <ArrowFatUp
            size={13}
            weight={upvoted ? 'fill' : 'regular'}
            color={upvoted ? t.brandLeaf : t.inkMuted}
          />
          <Text style={[styles.cardActionText, { color: upvoted ? t.brandLeaf : t.inkMuted }]}>
            {(post.upvotes ?? 0) + (upvoted ? 1 : 0)}
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Open replies"
          style={[styles.cardAction, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
        >
          <ChatCircle size={13} color={t.inkMuted} />
          <Text style={[styles.cardActionText, { color: t.inkMuted }]}>{replyCount}</Text>
        </Pressable>

        <Pressable
          onPress={onToggleRepost}
          accessibilityRole="button"
          accessibilityLabel={`${reposted ? 'Remove repost' : 'Repost'} (${repostCount} ${repostCount === 1 ? 'repost' : 'reposts'})`}
          accessibilityState={{ selected: reposted }}
          style={[styles.cardAction, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
        >
          <Repeat
            size={13}
            weight={reposted ? 'bold' : 'regular'}
            color={reposted ? t.brandGreenStrong : t.inkMuted}
          />
          <Text
            style={[styles.cardActionText, { color: reposted ? t.brandGreenStrong : t.inkMuted }]}
          >
            {reposted ? 'Reposted' : 'Repost'} · {repostCount}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function optimisticRepostCount(post: Thread, override: boolean | undefined): number {
  const initial = post.hasReposted ?? false;
  const current = override ?? initial;
  const delta = current === initial ? 0 : current ? 1 : -1;
  return Math.max(0, (post.repostCount ?? 0) + delta);
}

/** The event-row glyphs, re-exported so the post detail resolves them the same way. */
export { ROW_ICON };

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },

  subBtnOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 8,
  },
  subBtnOff: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  subTextOn: { fontFamily: sans(500), fontSize: 11.5 },
  subTextOff: { fontFamily: sans(600), fontSize: 11.5 },
  tabs: { flexDirection: 'row' },
  tab: { paddingTop: 9, paddingBottom: 10, paddingHorizontal: 14, borderBottomWidth: 2 },
  tabLabel: { fontFamily: sans(600), fontSize: 12.5 },

  list: { paddingBottom: 96 },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  filterChip: {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 32,
  },
  filterChipText: {
    fontFamily: mono(400),
    fontSize: 9.5,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
  },

  cards: { gap: 12, paddingTop: 12, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderRadius: 8, paddingTop: 14, paddingHorizontal: 15, paddingBottom: 12 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardAuthor: { flexShrink: 1, fontFamily: mono(400), fontSize: 11 },
  cardDot: { fontFamily: mono(400), fontSize: 11 },
  cardType: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTypeText: { fontFamily: mono(400), fontSize: 11 },
  cardTime: { fontFamily: mono(400), fontSize: 11 },
  cardTitle: {
    marginTop: 10,
    fontFamily: sans(600),
    fontSize: 16,
    lineHeight: 21.6,
    letterSpacing: trackDisplay(16),
  },
  cardBody: { marginTop: 6, fontFamily: sans(400), fontSize: 13, lineHeight: 20.8 },
  strip: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stripText: { flex: 1, fontFamily: mono(400), fontSize: 10 },
  cardTags: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardActions: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreRow: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  moreText: { fontFamily: sans(400), fontSize: 12 },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderRadius: 6,
  },
  cardActionText: { fontFamily: mono(400), fontSize: 11 },

  emptyCard: {
    margin: 16,
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: sans(600), fontSize: 13.5 },
  emptyBody: { marginTop: 5, fontFamily: sans(400), fontSize: 12, lineHeight: 18, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: '#132329',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { fontFamily: sans(600), fontSize: 14, color: '#fff' },
  resourceFab: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#132329',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  resourceFabText: { fontFamily: sans(600), fontSize: 13 },

  about: { padding: 16, paddingBottom: 40, gap: 18 },
  aboutBio: { marginTop: 8, fontFamily: sans(400), fontSize: 13, lineHeight: 20.15 },
  infoPanel: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 },
  dashedPanel: { borderStyle: 'dashed' },
  panelTitle: { fontFamily: sans(600), fontSize: 14, letterSpacing: trackDisplay(14) },
  infoRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
  infoActionRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 2 },
  infoIcon: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, minWidth: 0, fontFamily: sans(500), fontSize: 13 },
  infoValue: { fontFamily: mono(600), fontSize: 12, fontVariant: ['tabular-nums'] },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 4 },
  aboutHead: { fontFamily: mono(600), fontSize: 9.5, letterSpacing: 1.7 },
  personName: { fontFamily: sans(600), fontSize: 13 },
  personRole: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },
  personEmpty: { padding: 14, fontFamily: sans(400), fontSize: 12.5 },
  topics: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  notifCard: { borderWidth: 1, borderRadius: 8, padding: 14 },
  notifTitle: { fontFamily: sans(600), fontSize: 13 },
  notifBody: { marginTop: 4, fontFamily: sans(400), fontSize: 12, lineHeight: 18.6 },
  notifBtn: {
    marginTop: 12,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtnText: { fontFamily: sans(600), fontSize: 13 },

  resources: { padding: 16, paddingBottom: 40, gap: 12 },
  resourceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countPill: { minWidth: 28, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countPillText: { fontFamily: mono(600), fontSize: 11, fontVariant: ['tabular-nums'] },
  resourceList: { gap: 10 },
  resourceCard: { borderWidth: 1, borderRadius: 8, padding: 13, gap: 8 },
  resourceCardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resourceTitle: { fontFamily: sans(600), fontSize: 14, lineHeight: 19.6, letterSpacing: trackDisplay(14) },
  resourceChips: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  resourceTypeChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 32, paddingVertical: 3, paddingHorizontal: 8 },
  resourceTypeText: { fontFamily: mono(400), fontSize: 9.5, letterSpacing: 0.55, textTransform: 'uppercase' },
  resourceSummary: { fontFamily: sans(400), fontSize: 12.5, lineHeight: 18.5 },
  resourceMeta: { fontFamily: mono(400), fontSize: 10.5 },
  submitResourceButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  submitResourceText: { fontFamily: sans(600), fontSize: 13 },
  moderationCard: { borderWidth: 1, borderRadius: 8, padding: 13, gap: 8 },

  members: { paddingTop: 14, paddingBottom: 40 },
  memberSearch: {
    marginHorizontal: 16,
    marginBottom: 12,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  memberSearchInput: { flex: 1, minWidth: 0, fontFamily: sans(400), fontSize: 13.5, paddingVertical: 8 },
  membersMeta: { paddingHorizontal: 16, paddingBottom: 10 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});

function mergeGroupMembers(groupMembers: Group['members'], coLeads: Group['members']): Group['members'] {
  const byName = new Map<string, Group['members'][number]>();

  for (const member of groupMembers) {
    byName.set(member.name, member);
  }

  for (const coLead of coLeads) {
    const existing = byName.get(coLead.name);
    byName.set(coLead.name, { ...(existing ?? coLead), ...coLead, isLead: true });
  }

  return [...byName.values()].sort((first, second) => {
    if (first.isLead !== second.isLead) return first.isLead ? -1 : 1;
    return first.name.localeCompare(second.name);
  });
}

function filterGroupMembers(members: Group['members'], query: string): Group['members'] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return members;

  return members.filter((member) =>
    [member.name, member.role, member.org]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function uniqueTags(resources: LibraryResource[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const resource of resources) {
    for (const tag of resource.tags) {
      const key = normalizeMatchText(tag);
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags.slice(0, 12);
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/\bwg\b/g, 'working group');
}
