import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  HomeImmediateAction,
  HomeImmediateActionsResponse,
  HomeThreadPreview,
  LibraryResource,
  MobileEventPreview,
  NewsStory,
  PodcastEpisode,
  ResourceHubData,
  WorkingGroupsData,
} from '../api/types';
import {
  At,
  Bell,
  BellRinging,
  BookOpen,
  CalendarDots,
  ChatCircle,
  ChatCircleDots,
  CheckCircle,
  FileText,
  Megaphone,
  Microphone,
  Newspaper,
  Play,
  UsersThree,
  X,
} from '../ds/icons';
import {
  ActionButton,
  IconTile,
  MastheadMeta,
  PageActions,
  SectionCard,
  StickyTitle,
} from '../ds/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ds/ThemeProvider';
import { headerTop, mono, sans, trackDisplay } from '../ds/tokens';
import { remainingLabel, usePodcastPlayer } from '../components/podcast/PlayerProvider';

export interface HomeSectionState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  onRetry: () => void;
}

export default function HomeScreen({
  immediateActions,
  events,
  workingGroups,
  news,
  library,
  podcasts,
  refreshing,
  onRefresh,
  onOpenAction,
  onOpenMemberProfile,
  onOpenEvent,
  onGoEvents,
  onGoGroups,
  onPickGroup,
  onOpenThread,
  onGoNews,
  onOpenNewsStory,
  onGoLibrary,
  onOpenResource,
  onGoPodcasts,
  onOpenPodcast,
}: {
  immediateActions: HomeSectionState<HomeImmediateActionsResponse>;
  events: HomeSectionState<MobileEventPreview[]>;
  workingGroups: HomeSectionState<WorkingGroupsData>;
  news: HomeSectionState<NewsStory[]>;
  library: HomeSectionState<ResourceHubData>;
  podcasts: HomeSectionState<PodcastEpisode[]>;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenAction: (action: HomeImmediateAction) => void;
  onOpenMemberProfile: (memberId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onGoEvents: () => void;
  onGoGroups: () => void;
  onPickGroup: (slug: string) => void;
  onOpenThread: (thread: HomeThreadPreview) => void;
  onGoNews: () => void;
  onOpenNewsStory: (story: NewsStory) => void;
  onGoLibrary: () => void;
  onOpenResource: (resource: LibraryResource) => void;
  onSaveResource?: (resource: LibraryResource) => Promise<void>;
  onOpenExternalResource?: (resource: LibraryResource) => void;
  onGoPodcasts: () => void;
  onOpenPodcast: (episode: PodcastEpisode) => void;
}) {
  const { t } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const player = usePodcastPlayer();
  const masthead = immediateActions.data?.masthead;
  const upcomingEvents = events.data?.filter((event) => event.status === 'upcoming').slice(0, 2) ?? [];
  const radarStories = news.data?.filter((story) => story.kind === 'radar').slice(0, 3) ?? [];
  const documents = library.data?.resources.filter((resource) => resource.type !== 'Podcast').slice(0, 3) ?? [];
  const episodes = podcasts.data?.slice(0, 3) ?? [];

  return (
    <View style={styles.fill}>
      <StickyTitle
        scrollY={scrollY}
        title={masthead?.title ?? 'Welcome back'}
        em={masthead?.italic ? ` ${masthead.italic}` : undefined}
        actions={<PageActions />}
      />
      <Animated.ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.brandGreen}
            colors={[t.brandGreen]}
          />
        )}
      >
        {/* Home's page head. There is no header band above it, so this row
            carries the safe-area inset and the two chrome controls. */}
        <View
          style={[
            styles.greeting,
            { borderBottomColor: t.rule, paddingTop: headerTop(insets.top) },
          ]}
        >
          <View style={styles.greetingRow}>
            <Text style={[styles.greetingText, { color: t.inkStrong }]}>
              {masthead?.title ?? 'Welcome back'}
              {!!masthead?.italic && <Text style={{ color: t.brandGreen }}> {masthead.italic}</Text>}
            </Text>
            <PageActions />
          </View>
        </View>

        <View style={styles.sections}>
          <HomeBand state={immediateActions} rows={1}>
            {(home) => (
              <SectionCard title="What You Missed" Glyph={BellRinging} tint="red">
                {home.actions.length > 0 ? (
                  <View style={[styles.rows, { borderTopColor: t.rule }]}>
                    {home.actions.slice(0, 3).map((action, index) => (
                      <ActionRow
                        key={action.id}
                        action={action}
                        divided={index > 0}
                        onPress={() => onOpenAction(action)}
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    title="You’re all caught up"
                    body="Mentions, surveys, and announcements that need a reply will appear here."
                  />
                )}
              </SectionCard>
            )}
          </HomeBand>

          <HomeBand state={events} rows={2}>
            {() => upcomingEvents.length > 0 ? (
              <SectionCard
                title="Upcoming"
                Glyph={CalendarDots}
                tint="red"
                footer={<ActionButton label="All events" onPress={onGoEvents} />}
              >
                <View style={[styles.rows, { borderTopColor: t.rule }]}>
                  {upcomingEvents.map((event, index) => (
                    <View
                      key={event.id}
                      style={[
                        styles.eventRow,
                        index > 0 && { borderTopWidth: 1, borderTopColor: t.rule },
                      ]}
                    >
                      <View style={styles.dateChip}>
                        <Text style={[styles.dateMonth, { color: t.inkMuted }]}>{event.month}</Text>
                        <Text style={[styles.dateNumber, { color: t.brandRed }]}>{event.day}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Pressable
                          onPress={() => onOpenEvent(event.id)}
                          style={({ pressed }) => (pressed ? styles.pressed : null)}
                        >
                          <Text style={[styles.eventTitle, { color: t.inkStrong }]}>{event.title}</Text>
                        </Pressable>
                        <Text style={[styles.stamp, { color: t.inkMuted }]}>
                          {[event.location, event.dateLabel, event.timeLabel, event.format]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <View style={styles.eventActions}>
                          <View style={[styles.rsvp, { borderColor: t.ruleStrong }]}>
                            {event.rsvp === 'attending' ? (
                              <CheckCircle size={12} color={t.inkMuted} />
                            ) : (
                              <X size={12} color={t.inkMuted} />
                            )}
                            <Text style={[styles.rsvpLabel, { color: t.inkMuted }]}>
                              {event.rsvp === 'attending' ? 'You’re going' : 'Not responded'}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => onOpenEvent(event.id)}
                            hitSlop={8}
                            style={({ pressed }) => (pressed ? styles.pressed : null)}
                          >
                            <Text style={[styles.detailsLink, { color: t.inkStrong }]}>Details</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </SectionCard>
            ) : null}
          </HomeBand>

          <HomeBand state={workingGroups} rows={4}>
            {(data) => data.home.groups.length > 0 || data.home.threads.length > 0 ? (
              <SectionCard
                title="Your Groups"
                Glyph={UsersThree}
                tint="blue"
                footer={<ActionButton label="Browse all groups" onPress={onGoGroups} />}
              >
                {data.home.groups.length > 0 && (
                  <View style={styles.groupChips}>
                    {data.home.groups.map((group) => (
                      <Pressable
                        key={group.slug}
                        onPress={() => onPickGroup(group.slug)}
                        style={({ pressed }) => [
                          styles.groupChip,
                          { borderColor: t.rule },
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.groupChipText,
                            { color: t.inkStrong, textDecorationColor: t.ruleStrong },
                          ]}
                        >
                          {group.name}
                        </Text>
                        {!!group.unread && (
                          <View style={[styles.unread, { backgroundColor: t.brandBrickInk }]}>
                            <Text style={styles.unreadText}>{group.unread}</Text>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
                {data.home.threads.length > 0 && (
                  <View style={[styles.rows, { borderTopColor: t.rule }]}>
                    {data.home.threads.slice(0, 4).map((thread, index) => (
                      <Pressable
                        key={thread.id}
                        onPress={() => onOpenThread(thread)}
                        style={({ pressed }) => [
                          styles.threadRow,
                          index > 0 && { borderTopWidth: 1, borderTopColor: t.rule },
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        {thread.unread ? (
                          <ChatCircleDots size={18} color={t.brandRed} />
                        ) : (
                          <ChatCircle size={18} color={t.inkMuted} />
                        )}
                        <View style={styles.flex}>
                          <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{thread.title}</Text>
                          {/* The author is a link inside the stamp rather than
                              its own Pressable, so the line still wraps as one
                              run of mono text. A nested Text's onPress wins over
                              the row's, which opens the thread. */}
                          <Text style={[styles.stamp, { color: t.inkMuted }]}>
                            {thread.groupName} ·{' '}
                            {thread.authorId ? (
                              <Text
                                onPress={() => onOpenMemberProfile(thread.authorId!)}
                                suppressHighlighting
                                accessibilityRole="link"
                                accessibilityLabel={`Open ${thread.authorName}'s profile`}
                                style={[styles.authorLink, { color: t.brandGreen }]}
                              >
                                {thread.authorName}
                              </Text>
                            ) : (
                              thread.authorName
                            )}
                            {` · ${thread.replies} ${thread.replies === 1 ? 'reply' : 'replies'} · ${thread.age}`}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </SectionCard>
            ) : null}
          </HomeBand>

          <HomeBand state={news} rows={3}>
            {() => radarStories.length > 0 ? (
              <SectionCard
                title="Industry News"
                Glyph={Newspaper}
                tint="amber"
                footer={<ActionButton label="Open news" onPress={onGoNews} />}
              >
                <DigestRows
                  rows={radarStories.map((story) => ({
                    id: story.id,
                    title: story.title,
                    meta: `${story.topic} · ${story.publishedAt ?? story.meta}`,
                    icon: <FileText size={18} color={t.brandAmber} />,
                    onPress: () => onOpenNewsStory(story),
                  }))}
                />
              </SectionCard>
            ) : null}
          </HomeBand>

          {/* Library and Podcast are reachable from Menu › Knowledge, which is
              where v2's artboard routes them. They stay on Home as well, in the
              same card language but with the neutral tile, so the four sections
              the design calls out keep their tinted emphasis. */}
          <HomeBand state={library} rows={3}>
            {() => documents.length > 0 ? (
              <SectionCard
                title="Library"
                Glyph={BookOpen}
                footer={<ActionButton label="Open library" onPress={onGoLibrary} />}
              >
                <DigestRows
                  rows={documents.map((resource) => ({
                    id: resource.id,
                    title: resource.title,
                    meta: [resource.type, resource.authors, resource.pages ? `${resource.pages} pp` : null]
                      .filter(Boolean)
                      .join(' · '),
                    icon: <BookOpen size={18} color={t.inkMuted} />,
                    onPress: () => onOpenResource(resource),
                  }))}
                />
              </SectionCard>
            ) : null}
          </HomeBand>

          <HomeBand state={podcasts} rows={3}>
            {() => episodes.length > 0 ? (
              <SectionCard
                title="Podcast"
                Glyph={Microphone}
                footer={<ActionButton label="View episodes" onPress={onGoPodcasts} />}
              >
                <DigestRows
                  rows={episodes.map((episode) => ({
                    id: episode.slug,
                    title: episode.title,
                    meta: [episode.duration, remainingLabel(episode, player.positions)]
                      .filter(Boolean)
                      .join(' · '),
                    icon: <Play size={18} color={t.inkMuted} />,
                    onPress: () => onOpenPodcast(episode),
                  }))}
                />
              </SectionCard>
            ) : null}
          </HomeBand>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/** v2's dashed-outline empty state, used when a section has nothing to show. */
function EmptyState({ title, body }: { title: string; body: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: t.ruleStrong }]}>
      <IconTile Glyph={Bell} />
      <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: t.inkMuted }]}>{body}</Text>
    </View>
  );
}

function HomeBand<T>({
  state,
  rows,
  children,
}: {
  state: HomeSectionState<T>;
  rows: number;
  children: (data: T) => React.ReactNode;
}) {
  if (state.loading && state.data === undefined) return <BandSkeleton rows={rows} />;
  if (state.error && state.data === undefined) return <BandError error={state.error} onRetry={state.onRetry} />;
  return state.data === undefined ? null : <>{children(state.data)}</>;
}

function BandSkeleton({ rows }: { rows: number }) {
  const { t } = useTheme();
  return (
    <View style={[styles.loadingBand, { borderColor: t.rule, backgroundColor: t.surfacePaper }]}>
      <ActivityIndicator color={t.brandGreen} />
      <MastheadMeta size={10.5}>LOADING</MastheadMeta>
      <View style={styles.loadingRows}>
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} style={[styles.loadingRow, { backgroundColor: t.surfaceSubtle }]} />
        ))}
      </View>
    </View>
  );
}

function BandError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTheme();
  return (
    <View style={[styles.errorBand, { borderColor: t.brandRed, backgroundColor: t.surfacePaper }]}>
      <Text style={[styles.errorTitle, { color: t.inkStrong }]}>This section could not be loaded</Text>
      <Text style={[styles.errorMessage, { color: t.inkMuted }]} numberOfLines={2}>{error.message}</Text>
      <Pressable onPress={onRetry} style={[styles.retry, { borderColor: t.rule }]}>
        <Text style={[styles.retryText, { color: t.brandGreen }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

function ActionRow({
  action,
  divided,
  onPress,
}: {
  action: HomeImmediateAction;
  divided: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const icon = action.kind === 'announcement'
    ? <Megaphone size={18} color={t.brandRed} />
    : action.kind === 'survey'
      ? <CheckCircle size={18} color={t.brandRed} />
      : action.kind === 'mention'
        ? <At size={18} color={t.brandRed} />
        : <CalendarDots size={18} color={t.brandRed} />;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        divided && { borderTopWidth: 1, borderTopColor: t.rule },
        pressed ? styles.pressed : null,
      ]}
    >
      {icon}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{action.title}</Text>
        <Text style={[styles.rowBody, { color: t.inkMuted }]}>{action.description}</Text>
      </View>
      <Text style={[styles.actionLabel, { color: t.brandGreen }]}>{action.actionLabel}</Text>
    </Pressable>
  );
}

function DigestRows({
  rows,
}: {
  rows: Array<{ id: string; title: string; meta: string; icon: React.ReactNode; onPress: () => void }>;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.rows, { borderTopColor: t.rule }]}>
      {rows.map((row, index) => (
        <Pressable
          key={row.id}
          onPress={row.onPress}
          style={({ pressed }) => [
            styles.digestRow,
            index > 0 && { borderTopWidth: 1, borderTopColor: t.rule },
            pressed ? styles.pressed : null,
          ]}
        >
          {row.icon}
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{row.title}</Text>
            {!!row.meta && <Text style={[styles.stamp, { color: t.inkMuted }]}>{row.meta}</Text>}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: 36 },
  pressed: { opacity: 0.7 },

  greeting: { paddingHorizontal: 16, paddingBottom: 18, borderBottomWidth: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  greetingText: { flex: 1, fontFamily: sans(600), fontSize: 27, lineHeight: 31, letterSpacing: trackDisplay(27) },

  sections: { padding: 16, gap: 16 },
  rows: { marginTop: 14, borderTopWidth: 1 },

  empty: {
    marginTop: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { marginTop: 2, fontFamily: sans(500), fontSize: 15 },
  emptyBody: { fontFamily: sans(400), fontSize: 14, lineHeight: 21, textAlign: 'center' },

  actionRow: { minHeight: 64, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionLabel: { maxWidth: 92, fontFamily: sans(600), fontSize: 12.5, textAlign: 'right' },

  eventRow: { paddingTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dateChip: { width: 44, alignItems: 'center' },
  dateMonth: { fontFamily: mono(400), fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase' },
  dateNumber: {
    marginTop: 1,
    fontFamily: sans(600),
    fontSize: 26,
    lineHeight: 26,
    letterSpacing: trackDisplay(26),
    fontVariant: ['tabular-nums'],
  },
  eventTitle: { fontFamily: sans(600), fontSize: 16, lineHeight: 22 },
  eventActions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rsvp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 32,
  },
  rsvpLabel: { fontFamily: mono(400), fontSize: 12.5 },
  detailsLink: {
    fontFamily: sans(500),
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  groupChips: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupChipText: { fontFamily: sans(400), fontSize: 14, textDecorationLine: 'underline' },
  unread: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { fontFamily: sans(600), fontSize: 9.5, color: '#fff' },

  threadRow: { minHeight: 56, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  digestRow: { minHeight: 56, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontFamily: sans(600), fontSize: 16, lineHeight: 22 },
  rowBody: { marginTop: 4, fontFamily: sans(400), fontSize: 14.5, lineHeight: 21 },
  /** The mono stamp v2 uses for "Platform Feedback · 7m", "Derivatives · Sep 8". */
  stamp: { marginTop: 5, fontFamily: mono(400), fontSize: 12.5, lineHeight: 18 },
  authorLink: { fontFamily: mono(500), textDecorationLine: 'underline' },

  loadingBand: { padding: 16, borderWidth: 1, borderRadius: 12, gap: 10 },
  loadingRows: { gap: 7 },
  loadingRow: { height: 10, borderRadius: 4 },
  errorBand: { padding: 16, borderWidth: 1, borderRadius: 12 },
  errorTitle: { fontFamily: sans(600), fontSize: 15 },
  errorMessage: { marginTop: 4, fontFamily: sans(400), fontSize: 14, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    minHeight: 40,
    marginTop: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  retryText: { fontFamily: sans(600), fontSize: 14 },
});
