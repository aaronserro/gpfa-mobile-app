import { request } from './client';
import { ROUTES, USING_REMOTE_API } from './config';
import type {
  AskAnswer,
  CalendarEvent,
  DirectoryPerson,
  FeedEntry,
  Group,
  JobListing,
  LibraryResource,
  NewPostInput,
  Member,
  MemberOrg,
  NewsStory,
  PodcastEpisode,
  Reply,
  RsvpChoice,
  Thread,
} from './types';
import {
  DIRECTORY_PEOPLE,
  findAnswer,
  GROUPS,
  JOBS,
  LIBRARY,
  MEMBER,
  MEMBER_ORGS,
  NEWS_STORIES,
  NEXT_EVENT,
  PODCASTS,
  SUGGESTIONS,
} from '../data/fixtures';

/**
 * The one place that decides where portal data comes from.
 *
 * Every function returns a Promise whether or not a backend is configured, so
 * screens are written against async data from the start and nothing changes in
 * the UI when EXPO_PUBLIC_API_URL is set.
 *
 * When wiring a real backend, adapt responses here — if the server's field
 * names differ from src/api/types.ts, map them in these functions rather than
 * reshaping the UI.
 */

/** Fixtures resolve immediately but still asynchronously. */
const local = <T>(value: T): Promise<T> => Promise.resolve(value);

/** The signed-in member. Everything that shows "who am I" reads this. */
export function getMe(): Promise<Member> {
  if (!USING_REMOTE_API) return local(MEMBER);
  return request<Member>(ROUTES.me);
}

/** The Home calendar card. Resolve null to hide it. */
export function getNextEvent(): Promise<CalendarEvent | null> {
  if (!USING_REMOTE_API) return local(NEXT_EVENT);
  return request<CalendarEvent | null>(ROUTES.nextEvent);
}

export function getGroups(): Promise<Group[]> {
  if (!USING_REMOTE_API) return local(GROUPS);
  return request<Group[]>(ROUTES.groups);
}

/**
 * Every post across every group, flattened. The fixtures nest posts inside
 * groups; a backend more likely returns a flat list, hence the shared shape.
 */
export function getFeed(): Promise<FeedEntry[]> {
  if (!USING_REMOTE_API) {
    return local(GROUPS.flatMap((g) => g.threads.map((post) => ({ post, groupId: g.id }))));
  }
  return request<FeedEntry[]>(ROUTES.feed);
}

/**
 * The News Radar, newest first. Serves both the News screen and the Home
 * digest — the digest picks the `radar` entries out of the same list.
 */
export function getNews(): Promise<NewsStory[]> {
  if (!USING_REMOTE_API) return local(NEWS_STORIES);
  return request<NewsStory[]>(ROUTES.news);
}

export function getLibrary(): Promise<LibraryResource[]> {
  if (!USING_REMOTE_API) return local(LIBRARY);
  return request<LibraryResource[]>(ROUTES.library);
}

/** Newest first — the screen features the first entry and never re-sorts it. */
export function getPodcasts(): Promise<PodcastEpisode[]> {
  if (!USING_REMOTE_API) return local(PODCASTS);
  return request<PodcastEpisode[]>(ROUTES.podcasts);
}

/** Open roles on the member job board. The screen sorts and filters them. */
export function getJobs(): Promise<JobListing[]> {
  if (!USING_REMOTE_API) return local(JOBS);
  return request<JobListing[]>(ROUTES.jobs);
}

/**
 * Member institutions, alphabetical by `name` — the directory index groups
 * consecutive entries by initial letter and never re-sorts them.
 */
export function getMemberOrgs(): Promise<MemberOrg[]> {
  if (!USING_REMOTE_API) return local(MEMBER_ORGS);
  return request<MemberOrg[]>(ROUTES.directoryOrgs);
}

/** Every named individual in the directory, flat. `orgId` joins to a MemberOrg. */
export function getDirectoryPeople(): Promise<DirectoryPerson[]> {
  if (!USING_REMOTE_API) return local(DIRECTORY_PEOPLE);
  return request<DirectoryPerson[]>(ROUTES.directoryPeople);
}

export function getAskSuggestions(): Promise<string[]> {
  if (!USING_REMOTE_API) return local(SUGGESTIONS);
  return request<string[]>(`${ROUTES.ask}/suggestions`);
}

export function askGpfa(question: string): Promise<AskAnswer> {
  if (!USING_REMOTE_API) {
    // Matches the design's 1100ms think before answering.
    return new Promise((resolve) => setTimeout(() => resolve(findAnswer(question)), 1100));
  }
  return request<AskAnswer>(ROUTES.ask, { method: 'POST', body: { question } });
}

/* ── mutations ───────────────────────────────────────────────────────────── */

/**
 * The caller applies these optimistically and keeps the result in session
 * state; against fixtures they are no-ops that resolve, so the UI behaves
 * identically either way.
 */

export function createPost(input: NewPostInput): Promise<Thread | null> {
  if (!USING_REMOTE_API) return local(null);
  return request<Thread>(ROUTES.feed, { method: 'POST', body: input });
}

export function createReply(postId: string, text: string): Promise<Reply | null> {
  if (!USING_REMOTE_API) return local(null);
  return request<Reply>(ROUTES.replies(postId), { method: 'POST', body: { text } });
}

export function setUpvote(postId: string, upvoted: boolean): Promise<void> {
  if (!USING_REMOTE_API) return local(undefined);
  return request<void>(ROUTES.upvote(postId), { method: upvoted ? 'POST' : 'DELETE' });
}

/** Bookmark a post to the member's saved list. */
export function setSaved(postId: string, saved: boolean): Promise<void> {
  if (!USING_REMOTE_API) return local(undefined);
  return request<void>(ROUTES.save(postId), { method: saved ? 'POST' : 'DELETE' });
}

/**
 * Upvote a reply. Replies without an `id` have no address, so the toggle stays
 * on the device and no request is made.
 */
export function setReplyUpvote(
  postId: string,
  replyId: string | undefined,
  upvoted: boolean
): Promise<void> {
  if (!USING_REMOTE_API || !replyId) return local(undefined);
  return request<void>(ROUTES.replyUpvote(postId, replyId), {
    method: upvoted ? 'POST' : 'DELETE',
  });
}

/** Subscribe to a working group's digest, or unsubscribe from it. */
export function setSubscribed(groupId: string, subscribed: boolean): Promise<void> {
  if (!USING_REMOTE_API) return local(undefined);
  return request<void>(ROUTES.subscribe(groupId), { method: subscribed ? 'POST' : 'DELETE' });
}

export function castVote(postId: string, option: number): Promise<void> {
  if (!USING_REMOTE_API) return local(undefined);
  return request<void>(ROUTES.vote(postId), { method: 'POST', body: { option } });
}

export function setRsvp(postId: string, choice: RsvpChoice): Promise<void> {
  if (!USING_REMOTE_API) return local(undefined);
  return request<void>(ROUTES.rsvp(postId), { method: 'POST', body: { choice } });
}
