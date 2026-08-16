import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowRight,
  Article,
  BookmarkSimple,
  CaretLeft,
  MagnifyingGlass,
  Pause,
  Play,
  X,
} from '../ds/icons';
import { Avatar, Eyebrow, MastheadMeta } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, resourceTypeStyle, sans, topPad, trackDisplay } from '../ds/tokens';
import Waveform, { fallbackPeaks } from '../components/podcast/Waveform';
import {
  formatTime,
  playedRatio,
  remainingLabel,
  usePodcastPlayer,
} from '../components/podcast/PlayerProvider';
import JobBoard, { filterJobs, type JobFilterId } from '../components/jobs/JobBoard';
import JobPosting from '../components/jobs/JobPosting';
import { initials } from '../lib/format';
import type { JobListing, LibraryResource, Member, PodcastEpisode, ResourceType } from '../api/types';

/** Typographic corner mark per type — the colour comes from resourceTypeStyle. */
const TYPE_GLYPH: Record<ResourceType, string> = {
  'Working Paper': '¶',
  Podcast: '▶',
  Briefing: '§',
  Template: '⧉',
  'External Link': '⧉',
  Explainer: '?',
  'Event Notes': '✎',
};

type View_ = 'hub' | 'library' | 'podcasts' | 'jobs';
type SortId = 'newest' | 'oldest';
type Sheet = { kind: 'resource'; id: string } | { kind: 'episode'; slug: string } | null;

export interface ResourcesScreenProps {
  member: Member;
  resources: LibraryResource[];
  episodes: PodcastEpisode[];
  jobs: JobListing[];
  /** Set to open the screen straight on a sub-view — the now-playing bar uses it. */
  initialView?: View_;
  /** Episode to show on mount, e.g. from the now-playing bar's Episode action. */
  initialEpisodeSlug?: string | null;
  /** Posting to open on mount, e.g. from an organization's profile in the directory. */
  initialJobId?: string | null;
  /** Called when the member taps Open on a resource. */
  onOpenResource?: (resource: LibraryResource) => void;
  /** Called when the member asks for an episode transcript. */
  onOpenTranscript?: (episode: PodcastEpisode) => void;
  /** Called when the member taps Apply on a job listing. */
  onApplyToJob?: (job: JobListing) => void;
}

export default function ResourcesScreen({
  member,
  resources,
  episodes,
  jobs,
  initialView = 'hub',
  initialEpisodeSlug = null,
  initialJobId = null,
  onOpenResource,
  onOpenTranscript,
  onApplyToJob,
}: ResourcesScreenProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const player = usePodcastPlayer();

  const [view, setView] = useState<View_>(initialView);
  const [query, setQuery] = useState('');
  const [sortId, setSortId] = useState<SortId>('newest');
  const [sheet, setSheet] = useState<Sheet>(
    initialEpisodeSlug ? { kind: 'episode', slug: initialEpisodeSlug } : null
  );
  // Job board state lives here, not in JobBoard, so a trip into a posting and
  // back doesn't reset the search and the filter.
  const [jobQuery, setJobQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<JobFilterId>('all');
  const [jobId, setJobId] = useState<string | null>(initialJobId);

  const dir = sortId === 'newest' ? 1 : -1;

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const rows = resources.filter((r) => {
      if (!q) return true;
      return [r.title, r.summary, r.type, r.authors, ...r.tags].join(' ').toLowerCase().includes(q);
    });
    // `mins` is the publication age, so ascending is newest first.
    return [...rows].sort((a, b) => ((a.mins ?? 0) - (b.mins ?? 0)) * dir);
  }, [dir, q, resources]);

  // Featured stays the newest episode whichever way the list is sorted, as on
  // the web portal, so "New" never moves.
  const featured = episodes[0] ?? null;
  const listEpisodes = useMemo(() => {
    const rest = episodes.slice(1);
    return sortId === 'newest' ? rest : [...rest].reverse();
  }, [episodes, sortId]);

  const visibleJobs = useMemo(
    () => filterJobs(jobs, jobQuery, jobFilter),
    [jobFilter, jobQuery, jobs]
  );
  const openJob = jobId ? jobs.find((j) => j.id === jobId) ?? null : null;

  const sheetResource =
    sheet?.kind === 'resource' ? resources.find((r) => r.id === sheet.id) ?? null : null;
  const sheetEpisode =
    sheet?.kind === 'episode' ? episodes.find((e) => e.slug === sheet.slug) ?? null : null;

  const sortToggle = (
    <View style={[styles.segment, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
      {(['newest', 'oldest'] as SortId[]).map((id) => {
        const on = sortId === id;
        return (
          <Pressable
            key={id}
            onPress={() => setSortId(id)}
            style={[styles.segmentBtn, on && { backgroundColor: t.surfaceAnchor }]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: on ? t.inkInverse : t.inkMuted, fontFamily: sans(on ? 600 : 400) },
              ]}
            >
              {id === 'newest' ? 'Newest' : 'Oldest'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  /* ── hub ──────────────────────────────────────────────────────────────── */
  const hub = (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.head, { paddingTop: topPad(insets.top, 66) }]}>
        <Text style={[styles.pageTitle, { color: t.inkStrong }]}>
          Resources<Text style={{ color: t.brandGreen }}>.</Text>
        </Text>
        <MastheadMeta size={11} style={styles.pageMeta}>
          MEMBER LIBRARY · PODCASTS · JOB BOARD
        </MastheadMeta>
      </View>

      <View style={styles.hubCards}>
        <HubCard
          label="Library"
          glyph="¶"
          color={t.brandGreen}
          title="Resource library"
          body="Working papers, briefings, templates and event notes published out of the working groups."
          meta={`${resources.length} RESOURCES`}
          onPress={() => setView('library')}
        />
        <HubCard
          label="Podcast"
          glyph="▶"
          color={t.brandRed}
          title="Podcasts"
          body="Practitioner conversations recorded with members. Transcripts included."
          meta={`${episodes.length} EPISODES`}
          onPress={() => setView('podcasts')}
        />
        <HubCard
          label="Jobs"
          glyph="◆"
          color={t.brandBlue}
          title="Job board"
          body="Open roles at member organizations, plus listings the secretariat curates from outside the membership."
          meta={`${jobs.length} OPEN ROLE${jobs.length === 1 ? '' : 'S'}`}
          onPress={() => setView('jobs')}
        />
      </View>
    </ScrollView>
  );

  /* ── library ──────────────────────────────────────────────────────────── */
  const library = (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <SubHead title="Resource library" onBack={() => setView('hub')} top={topPad(insets.top, 66)} />

      <View style={styles.controls}>
        <View
          style={[styles.search, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
        >
          <MagnifyingGlass size={15} color={t.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search resources"
            placeholderTextColor={t.inkFaint}
            style={[styles.searchInput, { color: t.inkStrong }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.controlRow}>
          <MastheadMeta size={10.5}>
            {q
              ? `${filtered.length} OF ${resources.length} RESOURCES`
              : `${resources.length} RESOURCES`}
          </MastheadMeta>
          {sortToggle}
        </View>
      </View>

      <View style={[styles.band, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
        {filtered.map((r, i) => {
          const skin = resourceTypeStyle(t, r.type);
          return (
            <Pressable
              key={r.id}
              onPress={() => setSheet({ kind: 'resource', id: r.id })}
              style={({ pressed }) => [
                styles.docRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
              ]}
            >
              <Text style={[styles.glyph, { color: skin.ink }]}>{TYPE_GLYPH[r.type]}</Text>
              <View style={styles.docBody}>
                <Text style={[styles.docTitle, { color: t.inkStrong }]}>{r.title}</Text>
                <View style={styles.docMetaRow}>
                  <View
                    style={[
                      styles.typeChip,
                      { borderColor: skin.chipBd, backgroundColor: skin.chipBg },
                    ]}
                  >
                    <Text style={[styles.typeChipText, { color: skin.ink }]}>{r.type}</Text>
                  </View>
                  <MastheadMeta size={10}>
                    {r.updatedAt.toUpperCase()}
                    {r.pages ? ` · ${r.pages}P` : ''}
                  </MastheadMeta>
                </View>
              </View>
            </Pressable>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>
              No resources match this search
            </Text>
            <Text style={[styles.emptyBody, { color: t.inkMuted }]}>
              Clear the search to show all {resources.length} resources.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  /* ── podcasts ─────────────────────────────────────────────────────────── */
  const podcasts = (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <SubHead title="Podcasts" onBack={() => setView('hub')} top={topPad(insets.top, 66)} />

      {!!featured && (
        <View style={styles.featuredWrap}>
          <View
            style={[styles.featured, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}
          >
            <View style={styles.featuredTop}>
              <View style={[styles.newChip, { borderColor: alpha(t.brandRed, 0.5) }]}>
                <Text style={[styles.newChipText, { color: t.brandRed }]}>New</Text>
              </View>
              <MastheadMeta size={11}>{episodeMeta(featured)}</MastheadMeta>
            </View>

            <Pressable onPress={() => setSheet({ kind: 'episode', slug: featured.slug })}>
              <Text style={[styles.featuredTitle, { color: t.inkStrong }]}>{featured.title}</Text>
            </Pressable>
            <Text style={[styles.featuredBody, { color: t.inkMuted }]}>{featured.summary}</Text>

            <View style={styles.featuredFoot}>
              <Text style={[styles.people, { color: t.inkMuted }]} numberOfLines={1}>
                {featured.people.map((p) => p.name).join(' · ')}
              </Text>
              <Pressable
                onPress={() => player.toggleEpisode(featured)}
                accessibilityLabel={`Play ${featured.title}`}
                style={({ pressed }) => [
                  styles.featuredPlay,
                  { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
                ]}
              >
                {isLive(player, featured) ? (
                  <Pause size={19} weight="fill" color="#fff" />
                ) : (
                  <Play size={19} weight="fill" color="#fff" />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.controlRow, styles.podControls]}>
        <MastheadMeta size={10.5}>{episodes.length} EPISODES</MastheadMeta>
        {sortToggle}
      </View>

      <View style={[styles.band, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
        {listEpisodes.map((e, i) => {
          const live = isLive(player, e);
          const label = remainingLabel(e, player.positions);
          return (
            <View
              key={e.slug}
              style={[styles.epRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}
            >
              <Pressable
                onPress={() => player.toggleEpisode(e)}
                accessibilityLabel={`${live ? 'Pause' : 'Play'} ${e.title}`}
                style={[
                  styles.epPlay,
                  {
                    borderColor: live ? t.surfaceAnchor : t.ruleHairline,
                    backgroundColor: live ? t.surfaceAnchor : t.surfacePaper,
                  },
                ]}
              >
                {live ? (
                  <Pause size={14} weight="fill" color="#fff" />
                ) : (
                  <Play size={14} weight="fill" color={t.brandGreen} />
                )}
              </Pressable>

              <Pressable
                style={styles.epBody}
                onPress={() => setSheet({ kind: 'episode', slug: e.slug })}
              >
                <Text numberOfLines={1} style={[styles.epTitle, { color: t.inkStrong }]}>
                  {e.title}
                </Text>
                <MastheadMeta size={10}>{episodeMeta(e)}</MastheadMeta>
                <View style={styles.epFoot}>
                  <Waveform
                    peaks={e.peaks ?? fallbackPeaks(e.slug)}
                    progress={playedRatio(e, player.positions)}
                  />
                  {!!label && <Text style={[styles.epProgress, { color: t.inkMuted }]}>{label}</Text>}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  /* ── sheets ───────────────────────────────────────────────────────────── */
  const resourceSheet = !!sheetResource && (
    <Sheet_ kicker="Resource library" onClose={() => setSheet(null)}>
      {(() => {
        const skin = resourceTypeStyle(t, sheetResource.type);
        return (
          <>
            <View
              style={[styles.typeChip, { borderColor: skin.chipBd, backgroundColor: skin.chipBg }]}
            >
              <Text style={[styles.typeChipText, { color: skin.ink }]}>{sheetResource.type}</Text>
            </View>
            <Text style={[styles.sheetTitle, { color: t.inkStrong }]}>{sheetResource.title}</Text>
            <MastheadMeta size={11} style={styles.sheetMeta}>
              {[
                sheetResource.authors.toUpperCase(),
                sheetResource.updatedAt.toUpperCase(),
                sheetResource.pages ? `${sheetResource.pages} PAGES` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </MastheadMeta>
            <Text style={[styles.sheetBody, { color: t.inkBody }]}>{sheetResource.summary}</Text>

            {!!sheetResource.tags.length && (
              <View style={styles.tags}>
                {sheetResource.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { borderColor: t.ruleHairline }]}>
                    <Text style={[styles.tagText, { color: t.inkMuted }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => onOpenResource?.(sheetResource)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
                ]}
              >
                <Text style={styles.primaryBtnText}>Open</Text>
                <ArrowRight size={15} color="#fff" />
              </Pressable>
              <Pressable
                accessibilityLabel="Save resource"
                style={[styles.iconBtn, { borderColor: t.ruleHairline }]}
              >
                <BookmarkSimple size={17} color={t.brandGreen} />
              </Pressable>
            </View>
          </>
        );
      })()}
    </Sheet_>
  );

  const episodeSheet = !!sheetEpisode && (
    <Sheet_ kicker="Podcast episode" onClose={() => setSheet(null)}>
      <View
        style={[
          styles.typeChip,
          { borderColor: alpha(t.brandRed, 0.4), backgroundColor: alpha(t.brandRed, 0.1) },
        ]}
      >
        <Text style={[styles.typeChipText, { color: t.brandRed }]}>Episode</Text>
      </View>
      <Text style={[styles.sheetTitle, { color: t.inkStrong }]}>{sheetEpisode.title}</Text>
      <MastheadMeta size={11} style={styles.sheetMeta}>
        {episodeMeta(sheetEpisode)}
      </MastheadMeta>
      <Text style={[styles.sheetBody, { color: t.inkBody }]}>{sheetEpisode.summary}</Text>

      {!!sheetEpisode.people.length && (
        <View style={[styles.peopleBlock, { borderTopColor: t.ruleHairline }]}>
          <Eyebrow size={10}>On this episode</Eyebrow>
          <View style={styles.peopleList}>
            {sheetEpisode.people.map((p) => (
              <View key={p.name} style={styles.person}>
                <Avatar initials={p.initials ?? initials(p.name)} size={32} />
                <View style={styles.personBody}>
                  <Text style={[styles.personName, { color: t.inkStrong }]}>{p.name}</Text>
                  <Text style={[styles.personRole, { color: t.inkMuted }]}>{p.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sheetActions}>
        <Pressable
          onPress={() => player.toggleEpisode(sheetEpisode)}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: pressed ? t.brandGreenStrong : t.surfaceAnchor },
          ]}
        >
          {isLive(player, sheetEpisode) ? (
            <Pause size={15} weight="fill" color="#fff" />
          ) : (
            <Play size={15} weight="fill" color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>{playLabel(player, sheetEpisode)}</Text>
        </Pressable>
        {sheetEpisode.hasTranscript && (
          <Pressable
            onPress={() => onOpenTranscript?.(sheetEpisode)}
            style={[styles.secondaryBtn, { borderColor: t.ruleHairline }]}
          >
            <Article size={15} color={t.brandGreen} />
            <Text style={[styles.secondaryBtnText, { color: t.brandGreen }]}>Transcript</Text>
          </Pressable>
        )}
      </View>
    </Sheet_>
  );

  /* ── job board ────────────────────────────────────────────────────────── */
  const jobBoard = openJob ? (
    <JobPosting job={openJob} onBack={() => setJobId(null)} onApply={onApplyToJob} />
  ) : (
    <JobBoard
      jobs={visibleJobs}
      query={jobQuery}
      onQuery={setJobQuery}
      filter={jobFilter}
      onFilter={setJobFilter}
      memberInitials={member.initials ?? initials(member.name)}
      onBack={() => setView('hub')}
      onOpen={setJobId}
    />
  );

  return (
    <View style={styles.fill}>
      {view === 'hub' && hub}
      {view === 'library' && library}
      {view === 'podcasts' && podcasts}
      {view === 'jobs' && jobBoard}
      {resourceSheet}
      {episodeSheet}
    </View>
  );
}

/* ── parts ────────────────────────────────────────────────────────────────── */

function HubCard({
  label,
  glyph,
  color,
  title,
  body,
  meta,
  onPress,
}: {
  label: string;
  glyph: string;
  color: string;
  title: string;
  body: string;
  meta: string;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.hubCard,
        { backgroundColor: t.surfacePaper, borderColor: pressed ? t.ruleStrong : t.ruleHairline },
      ]}
    >
      {/* The library card's patterned band, flattened to the soft tint plus the
          type rule — RN has no repeating-linear-gradient. */}
      <View style={[styles.hubBand, { backgroundColor: t.surfaceSoft, borderBottomColor: color }]}>
        <Text style={[styles.hubGlyph, { color }]}>{glyph}</Text>
        <View style={[styles.hubLabel, { borderColor: color, backgroundColor: t.surfacePaper }]}>
          <Text style={[styles.hubLabelText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.hubBody}>
        <Text style={[styles.hubTitle, { color: t.inkStrong }]}>{title}</Text>
        <Text style={[styles.hubText, { color: t.inkMuted }]}>{body}</Text>
        <View style={styles.hubFoot}>
          <MastheadMeta size={10.5}>{meta}</MastheadMeta>
          <ArrowRight size={16} color={t.brandGreen} />
        </View>
      </View>
    </Pressable>
  );
}

function SubHead({ title, onBack, top }: { title: string; onBack: () => void; top: number }) {
  const { t } = useTheme();
  return (
    <View style={[styles.subHead, { paddingTop: top }]}>
      <Pressable
        onPress={onBack}
        accessibilityLabel="Back to resources"
        style={styles.backBtn}
        hitSlop={6}
      >
        <CaretLeft size={19} color={t.brandGreen} />
      </Pressable>
      <Text style={[styles.subTitle, { color: t.inkStrong }]}>{title}</Text>
    </View>
  );
}

function Sheet_({
  kicker,
  onClose,
  children,
}: {
  kicker: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.sheetWrap}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.surfacePaper }]}>
        <View style={[styles.sheetHead, { borderBottomColor: t.ruleHairline }]}>
          <MastheadMeta size={10} style={styles.sheetKicker}>
            {kicker.toUpperCase()}
          </MastheadMeta>
          <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={10}>
            <X size={16} color={t.inkMuted} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.sheetBodyWrap,
            { paddingBottom: Math.max(insets.bottom, 22) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** Meta chips only from real fields, as on the web portal — never invented. */
function episodeMeta(e: PodcastEpisode): string {
  return [
    e.date.toUpperCase(),
    e.duration.toUpperCase(),
    e.hasTranscript ? 'TRANSCRIPT' : null,
    e.people.length ? `${e.people.length} ${e.people.length === 1 ? 'GUEST' : 'GUESTS'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const isLive = (player: ReturnType<typeof usePodcastPlayer>, e: PodcastEpisode) =>
  player.episode?.slug === e.slug && player.isPlaying;

function playLabel(player: ReturnType<typeof usePodcastPlayer>, e: PodcastEpisode): string {
  if (isLive(player, e)) return 'Pause';
  const at = player.positions[e.slug] ?? 0;
  return at > 0 ? `Resume at ${formatTime(at)}` : 'Play episode';
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 28 },

  head: { paddingHorizontal: 20, paddingBottom: 10 },
  pageTitle: {
    fontFamily: sans(600),
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: trackDisplay(28),
  },
  pageMeta: { marginTop: 6 },

  hubCards: { paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  hubCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  hubBand: {
    height: 96,
    justifyContent: 'flex-end',
    padding: 14,
    borderBottomWidth: 2,
  },
  hubGlyph: {
    position: 'absolute',
    right: 14,
    top: 10,
    fontSize: 46,
    lineHeight: 52,
    opacity: 0.85,
  },
  hubLabel: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  hubLabelText: {
    fontFamily: sans(600),
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
  },
  hubBody: { padding: 16, paddingTop: 14 },
  hubTitle: {
    fontFamily: sans(600),
    fontSize: 17,
    letterSpacing: trackDisplay(17),
  },
  hubText: {
    marginTop: 5,
    fontFamily: sans(400),
    fontSize: 12.5,
    lineHeight: 19,
  },
  hubFoot: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    fontFamily: sans(600),
    fontSize: 20,
    letterSpacing: trackDisplay(20),
  },

  controls: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: sans(400),
    fontSize: 13.5,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  podControls: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentBtn: {
    minHeight: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 11.5 },

  band: { marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1 },

  docRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  glyph: {
    width: 26,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 24,
    opacity: 0.85,
  },
  docBody: { flex: 1 },
  docTitle: {
    fontFamily: sans(600),
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: trackDisplay(14),
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  typeChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  typeChipText: {
    fontFamily: sans(600),
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.76,
  },

  empty: { paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: { fontFamily: sans(500), fontSize: 14 },
  emptyBody: {
    marginTop: 6,
    fontFamily: sans(400),
    fontSize: 12.5,
    textAlign: 'center',
  },

  featuredWrap: { paddingHorizontal: 20, paddingTop: 14 },
  featured: { borderWidth: 1, borderRadius: 8, padding: 16 },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  newChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  newChipText: {
    fontFamily: sans(600),
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  featuredTitle: {
    marginTop: 10,
    fontFamily: sans(600),
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: trackDisplay(19),
  },
  featuredBody: {
    marginTop: 8,
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20.8,
  },
  featuredFoot: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  people: { flex: 1, fontFamily: sans(400), fontSize: 12 },
  featuredPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  epRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  epPlay: {
    width: 44,
    height: 44,
    marginLeft: -6,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  epBody: { flex: 1, minWidth: 0 },
  epTitle: {
    fontFamily: sans(500),
    fontSize: 13.5,
    lineHeight: 18,
  },
  epFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  epProgress: {
    fontFamily: sans(500),
    fontSize: 10.5,
  },

  sheetWrap: { ...StyleSheet.absoluteFillObject, zIndex: 80, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(19,35,41,.44)' },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  sheetKicker: { letterSpacing: 0.8 },
  sheetBodyWrap: { paddingHorizontal: 18, paddingTop: 16 },
  sheetTitle: {
    marginTop: 10,
    fontFamily: sans(600),
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: trackDisplay(20),
  },
  sheetMeta: { marginTop: 6 },
  sheetBody: {
    marginTop: 12,
    fontFamily: sans(400),
    fontSize: 13.5,
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  tagText: { fontFamily: sans(400), fontSize: 10.5 },

  peopleBlock: { marginTop: 18, paddingTop: 14, borderTopWidth: 1 },
  peopleList: { marginTop: 10, gap: 10 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personBody: { flex: 1 },
  personName: { fontFamily: sans(600), fontSize: 13 },
  personRole: { fontFamily: sans(400), fontSize: 11.5 },

  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 8,
  },
  primaryBtnText: {
    fontFamily: sans(500),
    fontSize: 13.5,
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  secondaryBtnText: { fontFamily: sans(400), fontSize: 13 },
  iconBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
