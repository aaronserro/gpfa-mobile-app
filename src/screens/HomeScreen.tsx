import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
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
  ArrowRight,
  At,
  BookOpen,
  CalendarDots,
  ChatCircle,
  ChatCircleDots,
  CheckCircle,
  FileText,
  Megaphone,
  Play,
} from '../ds/icons';
import { Badge, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../ds/tokens';
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
  onOpenEvent: (eventId: string) => void;
  onGoEvents: () => void;
  onGoGroups: () => void;
  onPickGroup: (slug: string) => void;
  onOpenThread: (thread: HomeThreadPreview) => void;
  onGoNews: () => void;
  onOpenNewsStory: (story: NewsStory) => void;
  onGoLibrary: () => void;
  onOpenResource: (resource: LibraryResource) => void;
  onGoPodcasts: () => void;
  onOpenPodcast: (episode: PodcastEpisode) => void;
}) {
  const { t } = useTheme();
  const player = usePodcastPlayer();
  const masthead = immediateActions.data?.masthead;
  const upcomingEvents = events.data?.filter((event) => event.status === 'upcoming').slice(0, 2) ?? [];
  const radarStories = news.data?.filter((story) => story.kind === 'radar').slice(0, 3) ?? [];
  const documents = library.data?.resources.filter((resource) => resource.type !== 'Podcast').slice(0, 3) ?? [];
  const episodes = podcasts.data?.slice(0, 3) ?? [];

  return (
    <View style={styles.fill}>
      <ScreenHeader title={masthead?.title ?? 'Home'} accent={masthead?.italic} />

      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.brandGreen}
            colors={[t.brandGreen]}
          />
        )}
      >
        <HomeBand state={immediateActions} rows={1}>
          {(home) => home.actions.length > 0 ? (
            <HomeSection title="What You Missed">
              <View style={[styles.card, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
                {home.actions.slice(0, 3).map((action, index) => (
                  <ActionRow key={action.id} action={action} divided={index > 0} onPress={() => onOpenAction(action)} />
                ))}
              </View>
            </HomeSection>
          ) : null}
        </HomeBand>

        <HomeBand state={events} rows={2}>
          {() => upcomingEvents.length > 0 ? (
            <HomeSection title="Upcoming" action="All events" onAction={onGoEvents}>
              <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
                {upcomingEvents.map((event, index) => (
                  <Pressable
                    key={event.id}
                    onPress={() => onOpenEvent(event.id)}
                    style={({ pressed }) => [
                      styles.eventRow,
                      index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                      pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
                    ]}
                  >
                    <View style={styles.dateChip}>
                      <Text style={[styles.dateMonth, { color: t.inkMuted }]}>{event.month}</Text>
                      <Text style={[styles.dateNumber, { color: t.brandRed }]}>{event.day}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{event.title}</Text>
                      <Text style={[styles.rowMeta, { color: t.inkMuted }]}>
                        {[event.dateLabel, event.timeLabel, event.location, event.format].filter(Boolean).join(' · ')}
                      </Text>
                      <View style={styles.eventActions}>
                        <Badge variant={event.rsvp === 'attending' ? 'tag-green' : 'tag-default'} size={9}>
                          {event.rsvp === 'attending' ? "You’re going" : 'Not responded'}
                        </Badge>
                        <Text style={[styles.detailLink, { color: t.inkStrong }]}>Details</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </HomeSection>
          ) : null}
        </HomeBand>

        <HomeBand state={workingGroups} rows={4}>
          {(data) => data.home.groups.length > 0 || data.home.threads.length > 0 ? (
            <HomeSection title="Your Groups" action="Browse all groups" onAction={onGoGroups}>
              {data.home.groups.length > 0 ? (
                <View style={styles.groupChips}>
                  {data.home.groups.map((group) => (
                    <Pressable
                      key={group.slug}
                      onPress={() => onPickGroup(group.slug)}
                      style={({ pressed }) => [
                        styles.groupChip,
                        { borderColor: t.ruleHairline, backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper },
                      ]}
                    >
                      <Text style={[styles.groupChipText, { color: t.inkStrong }]}>{group.name}</Text>
                      {!!group.unread && <Badge variant="secondary">{group.unread}</Badge>}
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {data.home.threads.length > 0 ? (
                <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
                  {data.home.threads.slice(0, 4).map((thread, index) => (
                    <Pressable
                      key={thread.id}
                      onPress={() => onOpenThread(thread)}
                      style={({ pressed }) => [
                        styles.threadRow,
                        index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                        pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
                      ]}
                    >
                      {thread.unread ? <ChatCircleDots size={18} color={t.brandRed} /> : <ChatCircle size={18} color={t.inkMuted} />}
                      <View style={styles.flex}>
                        <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{thread.title}</Text>
                        <Text style={[styles.rowMeta, { color: t.inkMuted }]}>
                          {thread.groupName} · {thread.authorName} · {thread.replies} replies · {thread.age}
                        </Text>
                      </View>
                      <ArrowRight size={15} color={t.brandGreen} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </HomeSection>
          ) : null}
        </HomeBand>

        <HomeBand state={news} rows={3}>
          {() => radarStories.length > 0 ? (
            <HomeSection title="Industry News" action="Open news" onAction={onGoNews}>
              <DigestRows
                rows={radarStories.map((story) => ({
                  id: story.id,
                  title: story.title,
                  meta: `${story.topic} · ${story.publishedAt ?? story.meta}`,
                  icon: <FileText size={18} color={t.brandAmber} />,
                  onPress: () => onOpenNewsStory(story),
                }))}
              />
            </HomeSection>
          ) : null}
        </HomeBand>

        <HomeBand state={library} rows={3}>
          {() => documents.length > 0 ? (
            <HomeSection title="Library" action="Open library" onAction={onGoLibrary}>
              <DigestRows
                rows={documents.map((resource) => ({
                  id: resource.id,
                  title: resource.title,
                  meta: [resource.type, resource.authors, resource.pages ? `${resource.pages} pp` : null].filter(Boolean).join(' · '),
                  icon: <BookOpen size={18} color={t.brandGreen} />,
                  onPress: () => onOpenResource(resource),
                }))}
              />
            </HomeSection>
          ) : null}
        </HomeBand>

        <HomeBand state={podcasts} rows={3}>
          {() => episodes.length > 0 ? (
            <HomeSection title="Podcast" action="View episodes" onAction={onGoPodcasts}>
              <DigestRows
                rows={episodes.map((episode) => ({
                  id: episode.slug,
                  title: episode.title,
                  meta: [episode.duration, remainingLabel(episode, player.positions)].filter(Boolean).join(' · '),
                  icon: <Play size={18} color={t.brandGreen} />,
                  onPress: () => onOpenPodcast(episode),
                }))}
              />
            </HomeSection>
          ) : null}
        </HomeBand>
      </ScrollView>
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
    <View style={[styles.loadingBand, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      <ActivityIndicator color={t.brandGreen} />
      <MastheadMeta size={9.5}>LOADING</MastheadMeta>
      <View style={styles.loadingRows}>
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} style={[styles.loadingRow, { backgroundColor: t.surfaceSoft }]} />
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
      <Pressable onPress={onRetry} style={[styles.retry, { borderColor: t.ruleHairline }]}>
        <Text style={[styles.retryText, { color: t.brandGreen }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

function HomeSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: t.inkStrong }]}>{title}</Text>
        {action && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
            <Text style={[styles.sectionActionText, { color: t.brandGreen }]}>{action}</Text>
            <ArrowRight size={13} color={t.brandGreen} />
          </Pressable>
        ) : null}
      </View>
      {children}
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
        divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
        pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
      ]}
    >
      {icon}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{action.title}</Text>
        <Text style={[styles.rowMeta, { color: t.inkMuted }]}>{action.description}</Text>
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
    <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
      {rows.map((row, index) => (
        <Pressable
          key={row.id}
          onPress={row.onPress}
          style={({ pressed }) => [
            styles.digestRow,
            index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
            pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
          ]}
        >
          {row.icon}
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: t.inkStrong }]}>{row.title}</Text>
            {!!row.meta && <Text style={[styles.rowMeta, { color: t.inkMuted }]}>{row.meta}</Text>}
          </View>
          <ArrowRight size={15} color={t.brandGreen} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: 36 },
  section: { paddingTop: 24 },
  sectionHead: {
    minHeight: 44,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  sectionAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionActionText: { fontFamily: sans(500), fontSize: 12.5 },
  card: { marginHorizontal: 20, borderWidth: 1, borderRadius: 9, overflow: 'hidden' },
  band: { borderTopWidth: 1, borderBottomWidth: 1 },
  actionRow: { minHeight: 72, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionLabel: { maxWidth: 92, fontFamily: sans(600), fontSize: 11.5, textAlign: 'right' },
  eventRow: { minHeight: 112, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dateChip: { width: 48, alignItems: 'center', paddingTop: 2 },
  dateMonth: { fontFamily: sans(500), fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  dateNumber: { marginTop: 2, fontFamily: sans(600), fontSize: 25, lineHeight: 27, letterSpacing: trackDisplay(25) },
  eventActions: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailLink: { fontFamily: sans(500), fontSize: 11.5, textDecorationLine: 'underline' },
  groupChips: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupChip: { minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupChipText: { fontFamily: sans(500), fontSize: 11.5 },
  threadRow: { minHeight: 72, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  digestRow: { minHeight: 68, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowTitle: { fontFamily: sans(600), fontSize: 13.5, lineHeight: 18 },
  rowMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 11.5, lineHeight: 16 },
  loadingBand: { marginTop: 24, marginHorizontal: 20, padding: 16, borderWidth: 1, borderRadius: 9, gap: 10 },
  loadingRows: { gap: 7 },
  loadingRow: { height: 10, borderRadius: 4 },
  errorBand: { marginTop: 24, marginHorizontal: 20, padding: 16, borderWidth: 1, borderRadius: 9 },
  errorTitle: { fontFamily: sans(600), fontSize: 13.5 },
  errorMessage: { marginTop: 4, fontFamily: sans(400), fontSize: 11.5, lineHeight: 16 },
  retry: { alignSelf: 'flex-start', minHeight: 44, marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 7, justifyContent: 'center' },
  retryText: { fontFamily: sans(600), fontSize: 12 },
});
