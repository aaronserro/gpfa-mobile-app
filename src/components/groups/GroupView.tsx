import { useEffect, useRef, useState } from 'react';

/**
 * Groups tab, level two: one working group, across Activity, About, Resources,
 * Members and the co-lead moderation queue.
 *
 * Presentational. The post list arrives filtered and ordered; the tab and the
 * type filter are held by the caller so a trip into a post and back keeps them.
 */
import { Alert, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';

import {
  ArrowFatUp,
  ChatCircle,
  CheckCircle,
  FileText,
  MagnifyingGlass,
  Plus,
  Repeat,
  Trash,
  type Icon,
} from '../../ds/icons';
import { Avatar, MastheadMeta, ScreenHeader } from '../../ds/primitives';
import MutationNotice, { type MutationNoticeValue } from '../MutationNotice';
import FeedFilterDropdown from './FeedFilterDropdown';
import ForumModerationPanel from './ForumModerationPanel';
import ResourceModerationPanel from './ResourceModerationPanel';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, resourceTypeStyle, sans, trackDisplay } from '../../ds/tokens';
import { initials as initialsOf } from '../../lib/format';
import {
  DEFAULT_WORKING_GROUP_FEED_CONTROLS,
  hasActiveWorkingGroupFeedControls,
} from '../../lib/workingGroupFeedControls';
import { AnchorAvatar, RoleBadge, TagChip, TYPE_ICON, ROW_ICON } from './parts';
import type {
  ForumContentReportTarget,
  ForumModerationDecision,
  ForumModerationQueueItem,
  Group,
  LibraryResource,
  PostType,
  Thread,
  WorkingGroupFeedControls,
  WorkingGroupResourceModerationSubmission,
  WorkingGroupResourceReviewInput,
} from '../../api/types';

export type GroupTab = 'posts' | 'about' | 'resources' | 'members' | 'moderation';

export type PostFilterId = 'all' | PostType;
type FeedFilterAxis = 'type' | 'status' | 'sort';

type ModerationThreadStatus = 'open' | 'answered' | 'closed';

export const POST_FILTERS: { id: PostFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'discussion', label: 'Discussions' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'poll', label: 'Polls' },
  { id: 'event', label: 'Events' },
];

const STATUS_FILTERS: Array<{ id: WorkingGroupFeedControls['status']; label: string }> = [
  { id: 'any', label: 'Any status' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
];

const SORT_FILTERS: Array<{ id: WorkingGroupFeedControls['sort']; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'recently_active', label: 'Recently active' },
  { id: 'most_upvoted', label: 'Most upvoted' },
];

export interface GroupViewProps {
  group: Group;
  /** The group's posts, already filtered and newest-first. */
  posts: Thread[];
  /** The group's unfiltered posts, used by About and Moderation. */
  allPosts?: Thread[];
  coLeads?: Group['members'];
  members?: Group['members'];
  resources?: LibraryResource[];
  loading?: boolean;
  loadingMore?: boolean;
  error?: Error | null;
  hasMore?: boolean;
  totalMatching?: number;
  onLoadMore?: () => void;
  tab: GroupTab;
  onTab: (tab: GroupTab) => void;
  feedControls: WorkingGroupFeedControls;
  onApplyFeedControls: (controls: WorkingGroupFeedControls) => void;
  hasNewPosts: boolean;
  refreshingNewPosts: boolean;
  onShowNewPosts: () => Promise<void>;
  mutationNotice: MutationNoticeValue | null;
  onDismissMutationNotice: () => void;
  pendingMutations: Record<string, boolean | undefined>;
  subscribed: boolean;
  onToggleSubscribe: () => void;
  canModerate?: boolean;
  moderationSubmissions?: WorkingGroupResourceModerationSubmission[];
  moderationLoading?: boolean;
  moderationError?: Error | null;
  moderationPendingSubmissionId?: string | null;
  forumReports?: ForumModerationQueueItem[];
  forumReportsLoading?: boolean;
  forumReportsError?: Error | null;
  pendingReportId?: string | null;
  moderationPendingTarget?: ForumContentReportTarget | null;
  onRefreshModeration?: () => void;
  onRefreshReports?: () => void;
  onResolveReport?: (reportId: string, decision: ForumModerationDecision) => Promise<boolean>;
  onRemoveContent?: (target: ForumContentReportTarget) => Promise<boolean>;
  onReviewResource?: (
    submissionId: string,
    input: WorkingGroupResourceReviewInput
  ) => Promise<boolean>;
  onRemoveResource?: (submissionId: string) => Promise<boolean>;
  onChangePostStatus?: (
    threadId: string,
    status: 'open' | 'answered' | 'closed'
  ) => void;
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
  onOpenMemberProfile: (memberId: string) => void;
  onCompose: () => void;
  onOpenResourceSubmission: () => void;
  onOpenResource?: (resource: LibraryResource) => void;
}

export default function GroupView({
  group,
  posts,
  allPosts = posts,
  coLeads: routeCoLeads = [],
  members: routeMembers = [],
  resources = [],
  loading = false,
  loadingMore = false,
  error = null,
  hasMore = false,
  totalMatching = 0,
  onLoadMore,
  tab,
  onTab,
  feedControls,
  onApplyFeedControls,
  hasNewPosts,
  refreshingNewPosts,
  onShowNewPosts,
  mutationNotice,
  onDismissMutationNotice,
  pendingMutations,
  subscribed,
  onToggleSubscribe,
  canModerate = false,
  moderationSubmissions = [],
  moderationLoading = false,
  moderationError = null,
  moderationPendingSubmissionId = null,
  forumReports = [],
  forumReportsLoading = false,
  forumReportsError = null,
  pendingReportId = null,
  moderationPendingTarget = null,
  onRefreshModeration,
  onRefreshReports,
  onResolveReport,
  onRemoveContent,
  onReviewResource,
  onRemoveResource,
  onChangePostStatus,
  replyCounts,
  upvoted,
  onToggleUpvote,
  reposted,
  onToggleRepost,
  showTags,
  onBack,
  onOpenPost,
  onOpenMemberProfile,
  onCompose,
  onOpenResourceSubmission,
  onOpenResource,
}: GroupViewProps) {
  const { t } = useTheme();
  const [memberQuery, setMemberQuery] = useState('');
  const [feedQuery, setFeedQuery] = useState(feedControls.query);
  const [openFeedFilter, setOpenFeedFilter] = useState<FeedFilterAxis | null>(null);
  const feedScrollRef = useRef<ScrollView>(null);
  const feedScrollOffset = useRef(0);
  const feedPostLayouts = useRef(new Map<string, { y: number; height: number }>());
  const pendingFeedAnchor = useRef<{ postId: string | null; offset: number; fallbackY: number } | null>(null);

  useEffect(() => {
    setFeedQuery(feedControls.query);
    setOpenFeedFilter(null);
  }, [feedControls.query, group.id]);

  const coLeads = routeCoLeads.length ? routeCoLeads : group.members.filter((m) => m.isLead);
  const members = mergeGroupMembers(routeMembers.length ? routeMembers : group.members, coLeads);
  const memberCount = members.length || group.memberCount || group.members.length;
  const visibleMembers = filterGroupMembers(members, memberQuery);
  const groupResources = resources;
  const moderationPosts = allPosts.filter((post) => post.type !== 'poll');
  const openModerationThreadCount = moderationPosts.filter(
    (post) => moderationThreadStatus(post) === 'open'
  ).length;
  const topics: string[] = [];
  for (const p of allPosts) for (const tag of p.tags ?? []) if (!topics.includes(tag)) topics.push(tag);
  const groupTabs: [GroupTab, string][] = [
    ['posts', 'Activity'],
    ['about', 'About'],
    ['resources', 'Resources'],
    ['members', 'Members'],
    ...(canModerate ? ([['moderation', 'Moderation']] as [GroupTab, string][]) : []),
  ];

  const showNewPosts = async () => {
    const scrollY = feedScrollOffset.current;
    const anchor = [...feedPostLayouts.current.entries()]
      .filter(([, layout]) => layout.y + layout.height >= scrollY)
      .sort((left, right) => left[1].y - right[1].y)[0];
    pendingFeedAnchor.current = {
      postId: anchor?.[0] ?? null,
      offset: anchor ? scrollY - anchor[1].y : 0,
      fallbackY: scrollY,
    };
    feedPostLayouts.current.clear();
    await onShowNewPosts();
    requestAnimationFrame(restoreFeedAnchor);
  };

  const restoreFeedAnchor = () => {
    const anchor = pendingFeedAnchor.current;
    if (!anchor) return;
    const layout = anchor.postId ? feedPostLayouts.current.get(anchor.postId) : null;
    pendingFeedAnchor.current = null;
    feedScrollRef.current?.scrollTo({
      y: Math.max(0, layout ? layout.y + anchor.offset : anchor.fallbackY),
      animated: false,
    });
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title={group.n}
        onBack={onBack}
        backLabel="Back to working groups"
        actions={
          <Pressable
            onPress={onToggleSubscribe}
            disabled={!!pendingMutations[`subscription:${group.id}`]}
            accessibilityRole="button"
            accessibilityState={{ selected: subscribed, disabled: !!pendingMutations[`subscription:${group.id}`] }}
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
            {hasNewPosts && (
              <View style={[styles.newPostsBar, { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline }]}
                accessibilityLiveRegion="polite">
                <Pressable
                  onPress={() => void showNewPosts()}
                  disabled={refreshingNewPosts}
                  accessibilityRole="button"
                  accessibilityLabel={refreshingNewPosts ? 'Refreshing new posts' : 'Show new posts'}
                  style={[styles.newPostsButton, { backgroundColor: t.surfaceAnchor }]}
                >
                  <Text style={[styles.newPostsText, { color: t.inkInverse }]}>
                    {refreshingNewPosts ? 'Refreshing…' : 'New Posts'}
                  </Text>
                </Pressable>
              </View>
            )}
            <ScrollView
              ref={feedScrollRef}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={400}
              onContentSizeChange={() => {
                if (pendingFeedAnchor.current && !refreshingNewPosts) {
                  requestAnimationFrame(restoreFeedAnchor);
                }
              }}
              onScroll={({ nativeEvent }) => {
                feedScrollOffset.current = nativeEvent.contentOffset.y;
                if (!hasMore || loadingMore || !onLoadMore) return;
                const distanceFromBottom =
                  nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
                if (distanceFromBottom < 220) onLoadMore();
              }}
            >
              <MutationNotice notice={mutationNotice} onDismiss={onDismissMutationNotice} />
              <View style={styles.feedControls}>
                <View style={[styles.feedSearch, { backgroundColor: t.surfacePage, borderColor: t.ruleHairline }]}>
                  <MagnifyingGlass size={15} color={t.inkMuted} />
                  <TextInput
                    value={feedQuery}
                    onChangeText={setFeedQuery}
                    onSubmitEditing={() => onApplyFeedControls({ ...feedControls, query: feedQuery.trim() })}
                    placeholder="Search activity"
                    placeholderTextColor={t.inkFaint}
                    style={[styles.feedSearchInput, { color: t.inkStrong }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  <Pressable
                    onPress={() => onApplyFeedControls({ ...feedControls, query: feedQuery.trim() })}
                    accessibilityRole="button"
                    style={[styles.applySearch, { backgroundColor: t.surfaceAnchor }]}
                  >
                    <Text style={styles.applySearchText}>Search</Text>
                  </Pressable>
                </View>

                <View style={styles.filterRow}>
                  <FeedFilterDropdown
                    label="Type"
                    value={feedControls.type}
                    options={POST_FILTERS}
                    open={openFeedFilter === 'type'}
                    onOpenChange={(open) => setOpenFeedFilter(open ? 'type' : null)}
                    onChange={(type) => onApplyFeedControls({ ...feedControls, type })}
                  />
                  <FeedFilterDropdown
                    label="Status"
                    value={feedControls.status}
                    options={STATUS_FILTERS}
                    open={openFeedFilter === 'status'}
                    onOpenChange={(open) => setOpenFeedFilter(open ? 'status' : null)}
                    onChange={(status) => onApplyFeedControls({ ...feedControls, status })}
                  />
                  <FeedFilterDropdown
                    label="Sort"
                    value={feedControls.sort}
                    options={SORT_FILTERS}
                    open={openFeedFilter === 'sort'}
                    onOpenChange={(open) => setOpenFeedFilter(open ? 'sort' : null)}
                    onChange={(sort) => onApplyFeedControls({ ...feedControls, sort })}
                  />
                </View>

                <View style={styles.resultsRow}>
                  <Text style={[styles.resultsText, { color: t.inkMuted }]}>{totalMatching} {totalMatching === 1 ? 'result' : 'results'}</Text>
                  {hasActiveWorkingGroupFeedControls(feedControls) && (
                    <Pressable
                      onPress={() => {
                        setFeedQuery('');
                        onApplyFeedControls(DEFAULT_WORKING_GROUP_FEED_CONTROLS);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.clearText, { color: t.surfaceAnchor }]}>Clear filters</Text>
                    </Pressable>
                  )}
                </View>
              </View>

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
                    No posts match the applied feed controls.
                  </Text>
                </View>
              ) : (
                <View style={styles.cards}>
                  {posts.map((p) => (
                    <View
                      key={p.id}
                      onLayout={({ nativeEvent }) => {
                        feedPostLayouts.current.set(p.id, nativeEvent.layout);
                      }}
                    >
                      <PostCard
                        post={p}
                        replyCount={replyCounts[p.id] ?? p.replies.length}
                        upvoted={!!upvoted[p.id]}
                        upvotePending={!!pendingMutations[`upvote:${p.id}`]}
                        onToggleUpvote={() => onToggleUpvote(p.id)}
                        reposted={reposted[p.id] ?? p.hasReposted ?? false}
                        repostPending={!!pendingMutations[`repost:${p.id}`]}
                        repostCount={optimisticRepostCount(p, reposted[p.id])}
                        onToggleRepost={() => onToggleRepost(p.id)}
                        showTags={showTags}
                        onOpen={() => onOpenPost(p.id)}
                        onOpenAuthor={p.authorId ? () => onOpenMemberProfile(p.authorId!) : undefined}
                      />
                    </View>
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

            {coLeads.length > 0 && (
              <View style={[styles.infoPanel, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
                <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Leadership</Text>
                {coLeads.map((c) => (
                  <Pressable
                    key={c.id ?? c.name}
                    disabled={!c.id}
                    onPress={() => c.id && onOpenMemberProfile(c.id)}
                    accessibilityRole={c.id ? 'button' : undefined}
                    accessibilityLabel={c.id ? `Open ${c.name}'s profile` : undefined}
                    style={styles.leadRow}
                  >
                    <AnchorAvatar initials={c.initials ?? initialsOf(c.name)} size={34} />
                    <View style={styles.flex}>
                      <Text style={[styles.personName, { color: t.inkStrong }]}>{c.name}</Text>
                      <Text style={[styles.personRole, { color: t.inkMuted }]}>Co-lead · {c.org}</Text>
                    </View>
                  </Pressable>
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
            key={group.id}
            posts={moderationPosts}
            openThreadCount={openModerationThreadCount}
            onOpenPost={onOpenPost}
            onChangePostStatus={onChangePostStatus}
            pendingMutations={pendingMutations}
            mutationNotice={mutationNotice}
            onDismissMutationNotice={onDismissMutationNotice}
            submissions={moderationSubmissions}
            forumReports={forumReports}
            forumReportsLoading={forumReportsLoading}
            forumReportsError={forumReportsError}
            pendingReportId={pendingReportId}
            moderationPendingTarget={moderationPendingTarget}
            onRefreshReports={onRefreshReports ?? (() => {})}
            onResolveReport={onResolveReport ?? (async () => false)}
            onRemoveContent={onRemoveContent ?? (async () => false)}
            resourceLoading={moderationLoading}
            resourceError={moderationError}
            pendingSubmissionId={moderationPendingSubmissionId}
            onRefreshResources={onRefreshModeration ?? (() => {})}
            onReviewResource={onReviewResource ?? (async () => false)}
            onRemoveResource={onRemoveResource ?? (async () => false)}
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
              <Pressable
                key={m.id ?? m.name}
                disabled={!m.id}
                onPress={() => m.id && onOpenMemberProfile(m.id)}
                accessibilityRole={m.id ? 'button' : undefined}
                accessibilityLabel={m.id ? `Open ${m.name}'s profile` : undefined}
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
              </Pressable>
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
  onChangePostStatus,
  pendingMutations,
  mutationNotice,
  onDismissMutationNotice,
  submissions,
  forumReports,
  forumReportsLoading,
  forumReportsError,
  pendingReportId,
  moderationPendingTarget,
  onRefreshReports,
  onResolveReport,
  onRemoveContent,
  resourceLoading,
  resourceError,
  pendingSubmissionId,
  onRefreshResources,
  onReviewResource,
  onRemoveResource,
}: {
  posts: Thread[];
  openThreadCount: number;
  onOpenPost: (postId: string) => void;
  onChangePostStatus?: (
    threadId: string,
    status: 'open' | 'answered' | 'closed'
  ) => void;
  pendingMutations: Record<string, boolean | undefined>;
  mutationNotice: MutationNoticeValue | null;
  onDismissMutationNotice: () => void;
  submissions: WorkingGroupResourceModerationSubmission[];
  forumReports: ForumModerationQueueItem[];
  forumReportsLoading: boolean;
  forumReportsError: Error | null;
  pendingReportId: string | null;
  moderationPendingTarget: ForumContentReportTarget | null;
  onRefreshReports: () => void;
  onResolveReport: (reportId: string, decision: ForumModerationDecision) => Promise<boolean>;
  onRemoveContent: (target: ForumContentReportTarget) => Promise<boolean>;
  resourceLoading: boolean;
  resourceError: Error | null;
  pendingSubmissionId: string | null;
  onRefreshResources: () => void;
  onReviewResource: (
    submissionId: string,
    input: WorkingGroupResourceReviewInput
  ) => Promise<boolean>;
  onRemoveResource: (submissionId: string) => Promise<boolean>;
}) {
  const { t } = useTheme();
  const [threadStatusFilter, setThreadStatusFilter] = useState<ModerationThreadStatus>('open');
  const threadCounts = {
    open: openThreadCount,
    answered: posts.filter((post) => moderationThreadStatus(post) === 'answered').length,
    closed: posts.filter((post) => moderationThreadStatus(post) === 'closed').length,
  };
  const filteredPosts = posts.filter(
    (post) => moderationThreadStatus(post) === threadStatusFilter
  );
  const emptyStatusLabel = threadStatusFilter === 'answered' ? 'answered' : threadStatusFilter;

  return (
    <View style={styles.fill}>
      <MutationNotice notice={mutationNotice} onDismiss={onDismissMutationNotice} />
      <ScrollView contentContainerStyle={styles.resources} showsVerticalScrollIndicator={false}>
        <ForumModerationPanel
          reports={forumReports}
          loading={forumReportsLoading}
          error={forumReportsError}
          pendingReportId={pendingReportId}
          onRefresh={onRefreshReports}
          onOpen={(report) => onOpenPost(report.threadId)}
          onDismiss={(reportId) => onResolveReport(reportId, 'dismiss')}
          onRemove={(reportId) => onResolveReport(reportId, 'remove')}
        />

        <ResourceModerationPanel
          submissions={submissions}
          loading={resourceLoading}
          error={resourceError}
          pendingSubmissionId={pendingSubmissionId}
          onRefresh={onRefreshResources}
          onReview={onReviewResource}
          onRemove={onRemoveResource}
        />

        <View style={styles.resourceHeaderRow}>
          <Text style={[styles.panelTitle, { color: t.inkStrong }]}>Thread moderation</Text>
          <View style={[styles.countPill, { backgroundColor: t.surfaceSoft }]}>
            <Text style={[styles.countPillText, { color: t.inkMuted }]}>{filteredPosts.length}</Text>
          </View>
        </View>

        <View style={styles.threadStatusFilters}>
          {(['open', 'answered', 'closed'] as const).map((status) => {
            const selected = threadStatusFilter === status;
            const label = status[0].toUpperCase() + status.slice(1);
            return (
              <Pressable
                key={status}
                onPress={() => setThreadStatusFilter(status)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.threadStatusFilter,
                  {
                    borderColor: selected ? t.surfaceAnchor : t.ruleHairline,
                    backgroundColor: selected ? t.surfaceAnchor : t.surfacePaper,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.threadStatusFilterText,
                    { color: selected ? '#fff' : t.inkMuted },
                  ]}
                >
                  {label} · {threadCounts[status]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filteredPosts.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: t.ruleHairline, backgroundColor: alpha(t.surfaceSoft, 0.3) }]}>
            <FileText size={22} color={t.inkMuted} />
            <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No {emptyStatusLabel} threads</Text>
            <Text style={[styles.emptyBody, { color: t.inkMuted }]}>Threads with this status will appear here.</Text>
          </View>
        ) : (
          <View style={styles.resourceList}>
            {filteredPosts.map((post) => {
              const type = post.type ?? 'discussion';
              const TypeIcon = TYPE_ICON[type];
              const status = moderationThreadStatus(post);
              const statusPending = !!pendingMutations[`thread:status:${post.id}`];
              return (
                <View
                  key={post.id}
                  style={[
                    styles.moderationCard,
                    { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper },
                  ]}
                >
                  <Pressable
                    onPress={() => onOpenPost(post.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${post.title}`}
                    style={({ pressed }) => [
                      styles.moderationCardContent,
                      { backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : 'transparent' },
                    ]}
                  >
                    <View style={styles.cardType}>
                      <TypeIcon size={14} color={t.inkMuted} />
                      <Text style={[styles.cardTypeText, { color: t.inkMuted }]}>{type}</Text>
                      <Text style={[styles.cardTypeText, { color: t.inkFaint }]}>· {status}</Text>
                    </View>
                    <Text style={[styles.resourceTitle, { color: t.inkStrong }]}>{post.title}</Text>
                    <Text numberOfLines={2} style={[styles.resourceSummary, { color: t.inkMuted }]}>{post.body}</Text>
                    <Text style={[styles.resourceMeta, { color: t.inkFaint }]}>{post.author} · {post.time}</Text>
                  </Pressable>
                  {!!onChangePostStatus && (
                    <View style={[styles.moderationActions, { borderTopColor: t.ruleHairline }]}>
                      {status !== 'open' && (
                        <Pressable
                          onPress={() => onChangePostStatus(post.id, 'open')}
                          disabled={statusPending}
                          accessibilityRole="button"
                          accessibilityLabel={`Reopen ${post.title}`}
                          accessibilityState={{ disabled: statusPending }}
                          style={({ pressed }) => [
                            styles.moderationAction,
                            {
                              borderColor: t.ruleHairline,
                              backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
                              opacity: statusPending ? 0.55 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.moderationActionText, { color: t.brandLeaf }]}>Reopen Thread</Text>
                        </Pressable>
                      )}
                      {type === 'discussion' && status !== 'answered' && (
                        <Pressable
                          onPress={() => onChangePostStatus(post.id, 'answered')}
                          disabled={statusPending}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${post.title} answered`}
                          accessibilityState={{ disabled: statusPending }}
                          style={({ pressed }) => [
                            styles.moderationAction,
                            {
                              borderColor: t.ruleHairline,
                              backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
                              opacity: statusPending ? 0.55 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.moderationActionText, { color: t.brandLeaf }]}>Mark Answered</Text>
                        </Pressable>
                      )}
                      {status !== 'closed' && (
                        <Pressable
                          onPress={() => onChangePostStatus(post.id, 'closed')}
                          disabled={statusPending}
                          accessibilityRole="button"
                          accessibilityLabel={`Close ${post.title}`}
                          accessibilityState={{ disabled: statusPending }}
                          style={({ pressed }) => [
                            styles.moderationAction,
                            {
                              borderColor: t.ruleHairline,
                              backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
                              opacity: statusPending ? 0.55 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.moderationActionText, { color: t.inkMuted }]}>Close Thread</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  <View style={[styles.directRemovalRow, { borderTopColor: t.ruleHairline }]}>
                    <Pressable
                      onPress={() => onOpenPost(post.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${post.title} for review`}
                      style={[styles.moderationAction, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
                    >
                      <Text style={[styles.moderationActionText, { color: t.inkMuted }]}>Open / Review</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => Alert.alert(
                        'Remove post?',
                        'This post will be removed from member views. The audit record will be preserved.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => void onRemoveContent({ targetType: 'thread', targetId: post.id, threadId: post.id }),
                          },
                        ]
                      )}
                      disabled={moderationPendingTarget?.targetType === 'thread' && moderationPendingTarget.targetId === post.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${post.title}`}
                      accessibilityState={{ disabled: moderationPendingTarget?.targetType === 'thread' && moderationPendingTarget.targetId === post.id }}
                      style={[
                        styles.moderationAction,
                        {
                          borderColor: t.brandBrick,
                          backgroundColor: alpha(t.brandBrick, 0.08),
                          opacity: moderationPendingTarget?.targetType === 'thread' && moderationPendingTarget.targetId === post.id ? 0.55 : 1,
                        },
                      ]}
                    >
                      <Trash size={13} color={t.brandBrickInk} />
                      <Text style={[styles.moderationActionText, { color: t.brandBrickInk }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── one post in the group feed ───────────────────────────────────────────── */

function PostCard({
  post,
  replyCount,
  upvoted,
  upvotePending,
  onToggleUpvote,
  reposted,
  repostPending,
  repostCount,
  onToggleRepost,
  showTags,
  onOpen,
  onOpenAuthor,
}: {
  post: Thread;
  replyCount: number;
  upvoted: boolean;
  upvotePending: boolean;
  onToggleUpvote: () => void;
  reposted: boolean;
  repostPending: boolean;
  repostCount: number;
  onToggleRepost: () => void;
  showTags: boolean;
  onOpen: () => void;
  onOpenAuthor?: () => void;
}) {
  const { t } = useTheme();
  const type = post.type ?? 'discussion';
  const TypeIcon = TYPE_ICON[type];
  const kindLabel = type === 'announcement' ? 'Announcement' : type[0].toUpperCase() + type.slice(1);

  // The design collapses an event's rows or a poll's shape into one meta strip.
  let strip = '';
  if (type === 'event' && post.eventRows) strip = post.eventRows.map((e) => e.text).join(' · ');
  if (post.poll) {
    const questionLabel = post.poll.questions.length === 1 ? 'question' : 'questions';
    strip = `${post.poll.questions.length} ${questionLabel} · ${post.poll.responseCount} responses · ${post.poll.closes.split(' · ')[0]}`;
  }

  return (
    <View style={[styles.card, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <View style={styles.cardMetaRow}>
        <Pressable
          onPress={onOpenAuthor}
          disabled={!onOpenAuthor}
          accessibilityRole={onOpenAuthor ? 'button' : undefined}
          accessibilityLabel={onOpenAuthor ? `Open ${post.author}'s profile` : undefined}
          style={styles.cardAuthorIdentity}
        >
          <Avatar initials={post.initials ?? initialsOf(post.author)} size={22} />
          <Text numberOfLines={1} style={[styles.cardAuthor, { color: t.inkMuted }]}>
            {post.author}
          </Text>
        </Pressable>
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

      <Pressable onPress={onOpen} accessibilityRole="button">
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
          disabled={upvotePending}
          accessibilityRole="button"
          accessibilityLabel="Upvote post"
          accessibilityState={{ disabled: upvotePending }}
          style={[styles.cardAction, { borderColor: t.ruleHairline, backgroundColor: t.surfacePage, opacity: upvotePending ? 0.55 : 1 }]}
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
          disabled={repostPending}
          accessibilityRole="button"
          accessibilityLabel={`${reposted ? 'Remove repost' : 'Repost'} (${repostCount} ${repostCount === 1 ? 'repost' : 'reposts'})`}
          accessibilityState={{ selected: reposted, disabled: repostPending }}
          style={[styles.cardAction, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper, opacity: repostPending ? 0.55 : 1 }]}
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

  newPostsBar: {
    position: 'absolute',
    zIndex: 2,
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  newPostsButton: { minHeight: 34, justifyContent: 'center', borderRadius: 17, paddingHorizontal: 18 },
  newPostsText: { fontFamily: sans(600), fontSize: 12 },
  list: { paddingBottom: 96 },
  feedControls: { paddingTop: 12, gap: 8 },
  feedSearch: {
    minHeight: 42,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 4,
  },
  feedSearchInput: { flex: 1, minWidth: 0, fontFamily: sans(400), fontSize: 13.5, paddingVertical: 8 },
  applySearch: { minHeight: 34, justifyContent: 'center', borderRadius: 6, paddingHorizontal: 11 },
  applySearchText: { color: '#fff', fontFamily: sans(600), fontSize: 11.5 },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  resultsText: { fontFamily: sans(500), fontSize: 11.5 },
  clearText: { fontFamily: sans(600), fontSize: 11.5 },

  cards: { gap: 12, paddingTop: 12, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderRadius: 8, paddingTop: 14, paddingHorizontal: 15, paddingBottom: 12 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardAuthorIdentity: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
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
  moderationCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  threadStatusFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  threadStatusFilter: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  threadStatusFilterText: { fontFamily: sans(600), fontSize: 11.5 },
  moderationCardContent: { padding: 13, gap: 8 },
  moderationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    padding: 10,
  },
  directRemovalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    padding: 10,
  },
  moderationAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  moderationActionText: { fontFamily: sans(600), fontSize: 12 },

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

function moderationThreadStatus(thread: Thread): ModerationThreadStatus {
  if (thread.lifecycle === 'resolved') return 'answered';
  if (thread.lifecycle === 'closed') return 'closed';
  return 'open';
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
