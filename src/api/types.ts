/**
 * Domain types for the member portal.
 *
 * These are the contract between the UI and whatever supplies the data — the
 * local fixtures today, a remote API once EXPO_PUBLIC_API_URL is set. Response
 * shapes that differ from these should be mapped in src/api/portal.ts rather
 * than leaking into screens.
 */
import type { JobFunctionKey, OrgSector, WgRuleClass } from '../ds/tokens';

export interface Reply {
  /**
   * Stable id. Without one a reply can still be upvoted, but the toggle stays
   * on the device — there is no address to send it to.
   */
  id?: string;
  a: string;
  org: string;
  time: string;
  initials?: string;
  /** Rendered as a highlighted @-mention prefix before the body text. */
  mention?: string;
  text: string;
  /** Upvotes on the reply. Absent means none yet. */
  up?: number;
}

/** Post kinds from the WG Forum design; each carries its own rule colour and chip. */
export type PostType = 'discussion' | 'poll' | 'announcement' | 'event';

/** A labelled fact shown as a chip on an event post (date, location, headcount). */
export interface EventRow {
  icon: 'calendar' | 'pin' | 'people';
  text: string;
}

export interface PollOption {
  label: string;
  votes: number;
}

export interface Poll {
  q: string;
  closes: string;
  options: PollOption[];
}

export interface Thread {
  id: string;
  /** Defaults to 'discussion' when the source design didn't classify the post. */
  type?: PostType;
  title: string;
  author: string;
  initials?: string;
  org: string;
  time: string;
  /** Short status shown beside the type chip, e.g. 'Closes Mon' or 'Oct 8'. */
  state?: string;
  body: string;
  file?: string;
  fileMeta?: string;
  poll?: Poll;
  eventRows?: EventRow[];
  /** Absent means none yet. */
  upvotes?: number;
  /** Age in minutes — the feed's "Newest" sort key. */
  mins?: number;
  /** Topic labels, shown as #chips and collected into the group's About tab. */
  tags?: string[];
  replies: Reply[];
}

/** Someone in a working group, listed on its Members and About tabs. */
export interface GroupMember {
  name: string;
  /** Job title, e.g. "Portfolio Manager, Securities Lending". */
  role: string;
  /** Member organization, e.g. "APG". */
  org: string;
  /** Avatar fallback; derived from `name` when absent. */
  initials?: string;
  /** Co-leads carry a badge and fill the About tab's Co-leads list. */
  isLead?: boolean;
}

export interface Group {
  id: string;
  n: string;
  short: string;
  cls: WgRuleClass;
  unread: number;
  meta: string;
  /** Roster for the Members tab; its length is the members count everywhere. */
  members: GroupMember[];
  /** Whether the signed-in member is subscribed. Drives which directory section it lands in. */
  joined: boolean;
  /** Flags the group as trending in the directory. */
  trending?: boolean;
  threads: Thread[];
}

export interface Answer {
  /** Lowercased substrings matched against the question. */
  k: string[];
  text: string;
  sources: string[];
}

export type Relevance = 'high' | 'medium' | 'low';

/** Who published a story: the industry radar, or GPFA itself. */
export type NewsKind = 'radar' | 'gpfa';

/**
 * A story on the News Radar.
 *
 * One record serves both surfaces: the News screen renders the whole list, and
 * the Home digest renders the `radar` ones using `rel` and `tag`. The fields
 * below the divider apply to one kind only — a `radar` story has no `chip`, and
 * a `gpfa` story has no `ticker`.
 */
export interface NewsStory {
  id: string;
  kind: NewsKind;
  /** Full topic name, e.g. "Regulation & Policy". Drives the topic filter and its counts. */
  topic: string;
  title: string;
  /** Provenance line, rendered as sent, e.g. "RISK.NET · 5H". The app never parses it. */
  meta: string;
  /** Standfirst paragraph. Clamped to three or four lines on the card. */
  body: string;
  /** Relevance dot on the Home digest. Absent reads as 'low'. */
  rel?: Relevance;
  /** Short label for the Home digest's chip, e.g. "Sec Finance". Falls back to `topic`. */
  tag?: string;
  /** Raster hero image. RN's Image can't decode SVG; absent falls back to the soft fill. */
  imageUrl?: string;
  /** Where Open / Read goes. Absent makes the action inert. */
  url?: string;

  /* ── radar only ── */
  /** Issuer or regime shorthand above the headline, e.g. "CDCC". */
  ticker?: string;
  /** Member discussions referencing the story, shown in the card footer. Absent reads as 0. */
  threads?: number;

  /* ── gpfa only ── */
  /** Type chip over the image, e.g. "Working Paper". A radar story shows its `topic` there. */
  chip?: string;
  /** Topic tags listed under the body. */
  topics?: string[];
  /** Gated to members: the card shows a lock and offers no action. */
  memberOnly?: boolean;
}


/** A post paired with the working group it belongs to. */
export interface FeedEntry {
  post: Thread;
  groupId: string;
}

/** What the composer collects; the server assigns id, author and timestamps. */
export interface NewPostInput {
  groupId: string;
  type: PostType;
  title: string;
  body: string;
}

/** An answer from Ask GPFA, with the member material it cites. */
export interface AskAnswer {
  text: string;
  sources: string[];
}

/** RSVP state for an event post. */
export type RsvpChoice = 'yes' | 'no';

/** The signed-in member. Drives the greeting, avatars, and authorship. */
export interface Member {
  id: string;
  /** Full name, e.g. "Robert Goobie". */
  name: string;
  /** Used in the Home greeting: "Good morning, Robert." */
  firstName: string;
  /** Avatar fallback, e.g. "RG". Derived from `name` if omitted. */
  initials?: string;
  /** Member organization, e.g. "HOOPP". */
  org: string;
  /** Job title, e.g. "Assistant VP, Treasury & Liquidity". The profile omits the line without it. */
  role?: string;
  /**
   * `MemberOrg.id` — joins the member to their organization for the profile's
   * Organization card. Absent falls back to matching `org` against the
   * directory's names, which only works while the strings agree.
   */
  orgId?: string;
}

/** A badge on the calendar card. */
export interface EventTag {
  label: string;
  tone: 'green' | 'default';
}

/** The "Next on the calendar" card on Home. */
export interface CalendarEvent {
  id: string;
  /** Short month, e.g. "Sep". */
  month: string;
  /** Day of month as a string, e.g. "17". */
  day: string;
  title: string;
  /** "Toronto, Canada · registration open" */
  meta: string;
  tags: EventTag[];
}

/** Library type; drives the type chip colour and the corner glyph. */
export type ResourceType =
  | 'Working Paper'
  | 'Podcast'
  | 'Briefing'
  | 'Template'
  | 'External Link'
  | 'Explainer'
  | 'Event Notes';

/** A document in the member library. */
export interface LibraryResource {
  id: string;
  title: string;
  type: ResourceType;
  summary: string;
  /** Byline, e.g. "Collateral & Liquidity WG". */
  authors: string;
  /** Display string, e.g. "Aug 12". The app never parses it. */
  updatedAt: string;
  /** Age in minutes — the Newest/Oldest sort key. Send it or ordering is undefined. */
  mins?: number;
  pages?: number;
  tags: string[];
  /** Where Open goes. Absent hides the action. */
  href?: string;
}

/** A guest or host on an episode. */
export interface PodcastPerson {
  name: string;
  role: string;
  /** Avatar fallback; derived from `name` when absent. */
  initials?: string;
}

/** Who published a job listing: a member organization, or the secretariat. */
export type JobSource = 'member' | 'curated';

/** A labelled fact in a posting's organization strip, e.g. { label: 'AUM', value: '$112B' }. */
export interface JobStat {
  label: string;
  value: string;
}

/** An open role on the member job board. */
export interface JobListing {
  id: string;
  title: string;
  org: string;
  /** Avatar fallback, e.g. "HP". Derived from `org` when absent. */
  initials?: string;
  /** Second line under the org, e.g. "MEMBER ORG · TORONTO". Rendered as sent. */
  orgMeta: string;
  source: JobSource;
  /** Display label for the function, e.g. "Collateral & liquidity". */
  fn: string;
  /** Filter key; also picks the listing's left rule colour. */
  fnKey: JobFunctionKey;
  /** Display string, e.g. "Toronto, hybrid". */
  loc: string;
  /** Display string, e.g. "CAD 280–340k + bonus". Never parsed. */
  comp: string;
  /** Display string, e.g. "12 Aug". */
  posted: string;
  /** Display string including the verb, e.g. "Closes 30 Sep". */
  closes: string;
  /** Age in minutes — the board's newest-first sort key. Send it or ordering is undefined. */
  mins?: number;
  /** One-paragraph summary shown on the card and above the bullets. */
  blurb: string;
  /** What the role covers, one line each. */
  bullets: string[];
  /** A paragraph about the posting organization. */
  about: string;
  /** Up to three facts shown as a strip under `about`. */
  stats: JobStat[];
  /** Where Apply goes — the employer's own posting. Absent makes Apply inert. */
  applyUrl?: string;
}

/**
 * A member institution in the directory.
 *
 * The index lists these alphabetically by `name` and groups them under the
 * initial letter, so send them sorted — the screen does not re-sort.
 */
export interface MemberOrg {
  id: string;
  /** The name the index lists and sorts by — however the membership writes it, e.g. "HOOPP". */
  name: string;
  /** Formal name for the profile masthead, e.g. "Healthcare of Ontario Pension Plan". Defaults to `name`. */
  fullName?: string;
  /** Acronym for the profile's meta line, e.g. "HOOPP". */
  short: string;
  sector: OrgSector;
  /** Display country, e.g. "Canada". Searchable alongside the name. */
  country: string;
  /** ISO 3166-1 alpha-3, shown in the row's right rail, e.g. "CAN". */
  countryCode: string;
  /** Head office, e.g. "Toronto". Joined with `country` in the profile masthead. */
  city: string;
  /**
   * Headcount for the row and the profile stat. Authoritative — `people` may
   * carry fewer than this, and the profile shows both without contradiction.
   */
  members: number;
  /** Working groups the organization sits on. Profile stat only. */
  workingGroups: number;
  /** One or two sentences on the profile masthead. */
  blurb: string;
  /** Raster logo. RN's Image can't decode SVG; absent falls back to initials. */
  logoUrl?: string;
}

/** A named individual in the directory, belonging to exactly one member org. */
export interface DirectoryPerson {
  id: string;
  /** `MemberOrg.id` — the profile's People list and the search meta both key off it. */
  orgId: string;
  name: string;
  /** Job title, e.g. "Assistant VP, Treasury & Liquidity". */
  role: string;
  /** Avatar fallback; derived from `name` when absent. */
  initials?: string;
  /** Raster portrait. RN's Image can't decode SVG; absent falls back to initials. */
  photoUrl?: string;
}

export interface PodcastEpisode {
  slug: string;
  title: string;
  /** Display string, e.g. "Aug 11". */
  date: string;
  /** Age in minutes — the Newest/Oldest sort key. */
  mins?: number;
  /** Display duration, e.g. "38 min". */
  duration: string;
  /** Duration in seconds — drives the transport, resume label and waveform fill. */
  durationSeconds: number;
  summary: string;
  hasTranscript: boolean;
  transcriptUrl?: string;
  audioUrl?: string;
  /** 0–1 amplitudes, 24–32 of them. Absent falls back to seeded peaks. */
  peaks?: number[];
  people: PodcastPerson[];
}
