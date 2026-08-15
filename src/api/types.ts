/**
 * Domain types for the member portal.
 *
 * These are the contract between the UI and whatever supplies the data — the
 * local fixtures today, a remote API once EXPO_PUBLIC_API_URL is set. Response
 * shapes that differ from these should be mapped in src/api/portal.ts rather
 * than leaking into screens.
 */
import type { WgRuleClass } from '../ds/tokens';

export interface Reply {
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
  replies: Reply[];
}

export interface Group {
  id: string;
  n: string;
  short: string;
  cls: WgRuleClass;
  unread: number;
  meta: string;
  threads: Thread[];
}

export interface Answer {
  /** Lowercased substrings matched against the question. */
  k: string[];
  text: string;
  sources: string[];
}

export type Relevance = 'high' | 'medium' | 'low';

export interface NewsItem {
  rel: Relevance;
  tag: string;
  t: string;
  src: string;
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
