/**
 * Domain types for the member portal.
 *
 * These are the contract between the UI and whatever supplies the data — the
 * local fixtures today, a remote API once EXPO_PUBLIC_API_URL is set. Response
 * shapes that differ from these should be mapped in src/api/portal.ts rather
 * than leaking into screens.
 */
import type { JobFunctionKey, OrgSector, WgRuleClass } from '../ds/tokens';

export interface HomeMasthead {
  title: string;
  italic: string;
  edition: string;
}

export type HomeImmediateActionKind = 'annual-meeting' | 'survey' | 'mention' | 'announcement';

export interface HomeImmediateAction {
  id: string;
  kind: HomeImmediateActionKind;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  notificationId?: string;
}

export interface HomeImmediateActionsResponse {
  status: 'success';
  masthead: HomeMasthead;
  actions: HomeImmediateAction[];
}

export interface HomeGroupPreview {
  slug: string;
  href: string;
  name: string;
  unread: number | null;
}

export interface HomeThreadPreview {
  id: string;
  href: string;
  title: string;
  groupName: string;
  authorName: string;
  authorId?: string;
  replies: number;
  age: string;
  unread: boolean;
  participants: Array<{ id: string; name: string; initials: string }>;
}

export interface WorkingGroupsData {
  groups: Group[];
  home: {
    groups: HomeGroupPreview[];
    threads: HomeThreadPreview[];
  };
}

export type EventRsvpState = 'attending' | 'not-attending' | 'not-responded';

export interface MobileEventAttendee {
  id?: string;
  name: string;
  org?: string;
}

export interface MobileEventPreview {
  id: string;
  contentItemId: string | null;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  datePrecision?: 'day' | 'datetime';
  detailsUrl: string;
  month: string;
  day: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  format: 'In person' | 'Virtual' | 'Hybrid';
  type: string;
  status: 'upcoming' | 'past';
  rsvp: EventRsvpState;
  registrationOpen: boolean;
  summary: string;
  attendeeCount: number;
  attendees: MobileEventAttendee[];
  joinUrl?: string;
  agenda: { time: string; title: string; detail?: string }[];
}

export interface MobileAnnouncementPreview {
  id: string;
  notificationId: string;
  title: string;
  summary: string;
  body: string[];
  dateLabel: string;
  unread: boolean;
  important?: boolean;
}

export type MobileSurveyStatus = 'not-started' | 'in-progress' | 'submitted' | 'closed';

export interface MobileSurveyOption {
  id: string;
  label: string;
  isOther: boolean;
}

export interface MobileSurveyQuestion {
  id: string;
  prompt: string;
  context?: string;
  options: MobileSurveyOption[];
  statements: { id: string; text: string }[];
}

export interface MobileSurveyAnswer {
  questionId: string;
  statementId: string;
  optionId: string;
  otherText?: string | null;
}

export interface MobileSurveyPreview {
  id: string;
  title: string;
  description: string;
  closesLabel: string;
  status: MobileSurveyStatus;
  questions: MobileSurveyQuestion[];
  answers: MobileSurveyAnswer[];
}

export interface MemberUpdates {
  announcements: MobileAnnouncementPreview[];
  surveys: MobileSurveyPreview[];
}

export type AnnualMeetingAnswerValue = string | boolean | string[];

export interface AnnualMeetingFormField {
  id: string;
  type: 'short_text' | 'long_text' | 'yes_no' | 'single_choice' | 'multiple_choice' | 'information';
  label: string;
  helpText: string;
  required: boolean;
  options: { id: string; label: string }[];
}

export interface AnnualMeetingPreview {
  draftId: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  location: string;
  timezone: string;
  summary: string;
  registrationStatus: 'Registered' | 'Not registered' | 'Waitlisted';
  registrationOpen: boolean;
  allowsMemberEdits: boolean;
  expectedUpdatedAt: string | null;
  formFields: AnnualMeetingFormField[];
  answers: { fieldId: string; value: AnnualMeetingAnswerValue }[];
  agenda: {
    id: string;
    label: string;
    date: string;
    sessions: { time: string; title: string; detail: string; location: string }[];
  }[];
  logistics: { title: string; detail: string }[];
}

export interface AnnualMeetingRegistrationInput {
  draftId: string;
  expectedUpdatedAt?: string | null;
  answers: { fieldId: string; value: AnnualMeetingAnswerValue }[];
}

export interface AnnualMeetingRegistrationState {
  registrationStatus: 'Registered' | 'Not registered' | 'Waitlisted';
  registrationOpen: boolean;
  allowsMemberEdits: boolean;
  expectedUpdatedAt: string | null;
  answers: { fieldId: string; value: AnnualMeetingAnswerValue }[];
}

/** A persisted forum file that can be shown and opened from a thread or reply. */
export interface ForumAttachment {
  id: string;
  name: string;
  contentType?: string;
  byteSize?: number;
  href?: string;
}

/** A device-local file selected for upload before creating a thread or reply. */
export interface ForumUploadFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface Reply {
  /** Stable backend id when the reply has been persisted. */
  id?: string;
  /** Canonical parent reply id; null/absent means a top-level reply. */
  parentPostId?: string | null;
  /** Canonical member id used only to expose author-owned reply actions. */
  authorId?: string;
  a: string;
  org: string;
  time: string;
  initials?: string;
  text: string;
  /** Legacy fixture count only; reply upvote mutations are not supported. */
  up?: number;
  attachments?: ForumAttachment[];
  /** Transient device files; uploaded before this reply is sent. */
  uploadFiles?: ForumUploadFile[];
}

/** Post kinds from the WG Forum design; each carries its own rule colour and chip. */
export type PostType = 'discussion' | 'poll' | 'announcement' | 'event';

/** A labelled fact shown as a chip on an event post (date, location, headcount). */
export interface EventRow {
  icon: 'calendar' | 'pin' | 'people';
  text: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

export interface PollQuestion {
  id: string;
  text: string;
  options: PollOption[];
}

export interface PollAnswer {
  questionId: string;
  optionId: string;
}

export interface Poll {
  id: string;
  closes: string;
  closesAt?: string | null;
  closedAt?: string | null;
  questions: PollQuestion[];
  answers: PollAnswer[];
  hasSubmitted: boolean;
  responseCount: number;
}

export interface Thread {
  id: string;
  /** Backend working-group slug for member scoped forum, poll, RSVP and content routes. */
  groupSlug?: string;
  /** Backend content target type used by saved/upvote routes. */
  targetType?: MemberContentTargetType;
  /** Canonical repost state returned by the working-group feed. */
  hasReposted?: boolean;
  /** Canonical repost total returned by the working-group feed. */
  repostCount?: number;
  /** Defaults to 'discussion' when the source design didn't classify the post. */
  type?: PostType;
  title: string;
  /** Active member UUID for profile navigation when the author has a directory profile. */
  authorId?: string;
  author: string;
  initials?: string;
  org: string;
  time: string;
  /** Short status shown beside the type chip, e.g. 'Closes Mon' or 'Oct 8'. */
  state?: string;
  lifecycle?: 'open' | 'resolved' | 'closed';
  body: string;
  attachments?: ForumAttachment[];
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
  canEdit?: boolean;
  canDelete?: boolean;
  canChangeStatus?: boolean;
  canReply?: boolean;
  replies: Reply[];
}

/** Someone in a working group, listed on its Members and About tabs. */
export interface GroupMember {
  /** Canonical member id when this row comes from the member directory. */
  id?: string;
  name: string;
  /** Job title, e.g. "Portfolio Manager, Securities Lending". */
  role: string;
  /** Member organization, e.g. "APG". */
  org: string;
  /** Avatar fallback; derived from `name` when absent. */
  initials?: string;
  photo?: string;
  /** Stable lowercase handle used for working-group mentions. */
  mentionHandle?: string;
  isCurrentMember?: boolean;
  /** Co-leads carry a badge and fill the About tab's Co-leads list. */
  isLead?: boolean;
}

export interface Group {
  id: string;
  /** Backend working-group slug, used by member-scoped group routes. */
  slug?: string;
  n: string;
  short: string;
  cls: WgRuleClass;
  /** Raster image for the working-group directory card; absent uses the hatch fallback. */
  cardImageUrl?: string;
  unread: number;
  meta: string;
  /** Authoritative count when the listing endpoint returns a summary only. */
  memberCount?: number;
  /** Roster for the Members tab; its length is the members count everywhere. */
  members: GroupMember[];
  /** Whether the signed-in member is subscribed. Drives which directory section it lands in. */
  joined: boolean;
  /** Flags the group as trending in the directory. */
  trending?: boolean;
  threads: Thread[];
}

export interface WorkingGroupMembership {
  id: number;
  memberId: string;
  workingGroupSlug: string;
  role: 'member' | 'co_lead';
  subscriptionStatus: 'subscribed' | 'unsubscribed';
  updatedAt: string;
}

export interface ApiSuccess {
  status: 'success';
}

export interface WorkingGroupCoLead {
  id: string;
  name: string;
  photo: string | null;
  role: string;
  organization: string;
  initials: string;
}

export interface FeedAuthor {
  id?: string;
  name: string;
  roleTitle?: string;
  photo?: string;
  profileHref?: string;
  organization: string;
  organizationAbbreviation?: string;
  organizationHref?: string;
}

interface FeedItemBase {
  id: string;
  groupSlug: string;
  groupName: string;
  href: string;
  postType: 'discussion' | 'announcement' | 'event' | 'poll';
  title: string;
  excerpt?: string;
  author: FeedAuthor;
  tags: string[];
  dateLabel: string;
  createdAt: string;
  activityAt: string;
  sortAt: string;
  isEdited: boolean;
  lifecycle: 'open' | 'resolved' | 'closed';
  upvoteCount: number;
  hasUpvoted: boolean;
  repostCount: number;
  hasReposted: boolean;
}

export type WorkingGroupFeedItem =
  | (FeedItemBase & { postType: 'discussion'; replyCount: number })
  | (FeedItemBase & { postType: 'announcement' })
  | (FeedItemBase & {
      postType: 'event';
      startsAt?: string;
      startsAtLabel?: string;
      endsAt?: string;
      endsAtLabel?: string;
      timezone?: string;
      location?: string;
      registrationUrl?: string;
      isVirtual?: boolean;
    })
  | (FeedItemBase & {
      postType: 'poll';
      closesAt?: string;
      closedAt?: string;
      questionCount: number;
      responseCount: number;
      hasAnswered: boolean;
    });

export interface WorkingGroupFeedQuery {
  query?: string;
  type?: 'all' | 'discussion' | 'announcement' | 'event' | 'poll';
  status?: 'any' | 'open' | 'closed';
  sort?: 'newest' | 'oldest' | 'recently_active' | 'most_upvoted';
  limit?: number;
  snapshotAt?: string;
  cursor?: string;
}

/** Applied server-side controls for one working-group feed. */
export type WorkingGroupFeedControls = Required<
  Pick<WorkingGroupFeedQuery, 'query' | 'type' | 'status' | 'sort'>
>;

export interface WorkingGroupFeedResponse {
  status: 'success';
  items: WorkingGroupFeedItem[];
  nextCursor: string | null;
  snapshotAt: string;
  totalMatching: number;
}

/** Minimal private broadcast emitted when a working-group feed item changes. */
export interface WorkingGroupFeedRealtimeEvent {
  eventId: string;
  groupSlug: string;
  itemType: 'discussion' | 'announcement' | 'event' | 'poll';
  itemId: string;
  changeType: 'created' | 'updated' | 'deleted';
  occurredAt: string;
}

export interface WorkingGroupDetailAttachment {
  id: string;
  title: string;
  originalFilename?: string;
  contentType?: string;
  byteSize?: number;
  createdAt: string;
  href?: string;
  viewerHref?: string;
  downloadUrl?: string;
}

export interface WorkingGroupDetailAuthor {
  id: string | null;
  name: string;
  initials: string;
  photo: string | null;
  profileHref?: string | null;
  organization: string;
  organizationHref?: string | null;
}

export interface WorkingGroupDetailReply {
  id: string;
  parentPostId: string | null;
  body: string;
  author: WorkingGroupDetailAuthor;
  createdAt: string;
  attachments: WorkingGroupDetailAttachment[];
}

export interface WorkingGroupDetailPermissions {
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
}

export interface WorkingGroupThreadDetail {
  kind: 'thread';
  thread: Record<string, unknown> & {
    id: string;
    postType: 'discussion' | 'announcement' | 'event';
    groupSlug: string;
    title: string;
    body: string;
    attachments?: WorkingGroupDetailAttachment[];
    hasSaved?: boolean;
    savedCount?: number;
    hasReposted?: boolean;
    repostCount?: number;
  };
  replies: WorkingGroupDetailReply[];
  participants: Array<{ name: string; initials: string; photo: string | null }>;
  permissions: WorkingGroupDetailPermissions;
}

export interface WorkingGroupPollDetail {
  kind: 'poll';
  poll: Record<string, unknown> & {
    id: string;
    groupSlug?: string;
    title: string;
    description?: string;
    hasSaved?: boolean;
    savedCount?: number;
    hasReposted?: boolean;
    repostCount?: number;
  };
  results: unknown[];
  answers: unknown[];
  permissions: WorkingGroupDetailPermissions;
}

export type WorkingGroupFeedItemDetail = WorkingGroupThreadDetail | WorkingGroupPollDetail;

export interface WorkingGroupFeedItemResponse {
  status: 'success';
  item: WorkingGroupFeedItem;
  detail: WorkingGroupFeedItemDetail;
}

export interface WorkingGroupTagUsageResponse {
  status: 'success';
  group: { slug: string; name: string };
  tags: Array<{ key: string; label: string; count: number }>;
}

export type WorkingGroupResourceType =
  | 'document'
  | 'meeting_material'
  | 'agenda'
  | 'minutes'
  | 'template'
  | 'report'
  | 'whitepaper'
  | 'presentation'
  | 'external_link'
  | 'guide'
  | 'other';

export interface WorkingGroupResourceSubmissionInput {
  title: string;
  resourceType?: WorkingGroupResourceType;
  sourceUrl?: string;
  summary?: string;
  contributorNotes?: string;
  tags?: string | string[];
  files?: WorkingGroupResourceSubmissionFile[];
}

export interface WorkingGroupResourceSubmissionFile {
  uri?: string;
  name?: string;
  type?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface WorkingGroupResourceUploadPrepareInput {
  fileName: string;
  contentType: string;
  byteSize: number;
}

export interface WorkingGroupResourceUploadPrepareResponse {
  status: 'success';
  assetId?: string;
  attachmentId?: string;
  fileId?: string;
  uploadId?: string;
  signedUrl: string;
  expectedContentType?: string;
  expectedByteSize?: number;
}

export interface WorkingGroupResourceUploadFinalizeInput {
  assetId?: string;
  attachmentId?: string;
  fileId?: string;
  uploadId?: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

export interface WorkingGroupResourceUploadFinalizeResponse {
  status: 'success';
  assetId?: string;
  attachmentId?: string;
  fileId?: string;
  id?: string;
}

export interface WorkingGroupResourceSubmissionResponse {
  status: 'success';
  submission: { id: string; status: string; submittedAt: string };
}

export type WorkingGroupResourceModerationStatus =
  | 'pending'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

export type WorkingGroupResourceModerationFilter =
  | 'all'
  | WorkingGroupResourceModerationStatus
  | 'removed';

export interface WorkingGroupResourceModerationPerson {
  id: string;
  fullName: string;
  roleTitle: string;
}

export interface WorkingGroupResourceModerationFile {
  id: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  downloadUrl: string | null;
}

export interface WorkingGroupResourceModerationSubmission {
  id: string;
  workingGroupSlug: string;
  title: string;
  resourceType: WorkingGroupResourceType;
  status: WorkingGroupResourceModerationStatus;
  isRemoved: boolean;
  submittedAt: string;
  reviewedAt: string | null;
  summary: string | null;
  contributorNotes: string | null;
  sourceUrl: string | null;
  tags: string[];
  reviewerNotes: string | null;
  submitter: WorkingGroupResourceModerationPerson | null;
  reviewer: WorkingGroupResourceModerationPerson | null;
  files: WorkingGroupResourceModerationFile[];
}

export interface WorkingGroupResourceModerationResponse {
  status: 'success';
  submissions: WorkingGroupResourceModerationSubmission[];
}

export interface WorkingGroupResourceReviewInput {
  status: Exclude<WorkingGroupResourceModerationStatus, 'pending'>;
  reviewerNotes?: string;
}

export interface WorkingGroupResourceReviewResponse {
  status: 'success';
  approvedContentItemId?: string;
}

export interface WorkingGroupEventRsvpInput {
  threadId: string;
  groupSlug: string;
  status: 'attending' | 'not_attending';
}

export interface MessageResponse {
  status: 'success';
  message: string;
}

export interface RedirectResponse {
  status: 'success';
  redirectTo: string;
}

export interface StatusResponse {
  status: 'success';
}

export interface ForumThreadCreateInput {
  groupSlug: string;
  postType?: 'discussion' | 'announcement' | 'event';
  title: string;
  body?: string;
  tags?: string;
  attachmentIds?: string[];
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  location?: string;
  registrationUrl?: string;
  isVirtual?: 'on' | 'true' | boolean;
}

export interface ForumThreadUpdateInput {
  body?: string;
  title?: string;
  tags?: string;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  location?: string;
  registrationUrl?: string;
  isVirtual?: boolean;
}

export interface ForumThreadStatusResponse {
  status: 'success';
  threadStatus: 'open' | 'answered' | 'closed';
}

export interface ForumReplyInput {
  threadId: string;
  groupSlug: string;
  body: string;
  attachmentIds?: string[];
  parentPostId?: string | null;
}

export interface ForumUploadPrepareInput {
  groupSlug: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

export interface ForumUploadPrepareResponse {
  status: 'success';
  assetId: string;
  bucket: 'content-assets-private';
  storagePath: string;
  signedUrl: string;
  expectedContentType: string;
  expectedByteSize: number;
}

export interface ForumUploadFinalizeInput {
  groupSlug: string;
  assetId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

export interface ForumUploadFinalizeResponse {
  status: 'success';
  assetId: string;
  title: string;
  bucket: string;
  storagePath: string;
}

export interface ForumSummarizeInput {
  threadId: string;
  groupSlug: string;
}

export interface ForumSummarizeResponse extends MessageResponse {
  summary: string;
}

export interface PollQuestionInput {
  text: string;
  options: Array<{ label: string }>;
}

export interface MemberPollOption {
  id: string;
  label: string;
}

export interface MemberPollQuestion {
  id: string;
  text: string;
  options: MemberPollOption[];
}

export interface MemberPollCreateInput {
  title: string;
  description?: string | null;
  tags?: string[];
  closesAt: string;
  groupSlug?: string;
  questions: PollQuestionInput[];
}

export interface MemberPollUpdateInput {
  title?: string;
  description?: string | null;
  tags?: string[];
  closesAt?: string;
  status?: 'active' | 'closed';
  questions?: PollQuestionInput[];
}

export interface MemberPoll {
  id: string;
  title: string;
  description?: string | null;
  tags: string[];
  status: 'active' | 'closed';
  createdBy: string;
  authorId?: string;
  createdAt: string;
  updatedAt?: string;
  closesAt?: string | null;
  closedAt?: string | null;
  totalResponses: number;
  hasSubmitted?: boolean;
  groupSlug?: string | null;
  groupName?: string | null;
  questions: MemberPollQuestion[];
  upvoteCount: number;
  hasUpvoted: boolean;
  repostCount: number;
  hasReposted: boolean;
}

export interface MemberPollsResponse {
  status: 'success';
  polls: MemberPoll[];
  resultsByPoll: Record<string, unknown[]>;
  answersByPoll: Record<string, unknown[]>;
  member: { id: string; name: string };
}

export interface MemberPollResponse {
  status: 'success';
  poll: MemberPoll;
}

export interface MemberPollCreateResponse {
  status: 'success';
  pollId: string;
}

export interface MemberPollVoteInput {
  pollId: string;
  groupSlug?: string;
  answers: Array<{ questionId: string; optionId: string }>;
}

export type MemberContentTargetType = 'thread' | 'event' | 'announcement' | 'poll';

export interface MemberContentTargetInput {
  targetType: MemberContentTargetType;
  targetId: string;
}

export interface MemberContentQuery {
  targetType?: string;
  targetId?: string;
  groupSlug?: string;
  limit?: number;
  offset?: number;
}

export interface MemberContentItem {
  id: string;
  member_id: string;
  target_type: MemberContentTargetType;
  target_id: string;
  created_at: string;
}

export interface MemberContentListResponse {
  status: 'success';
  items: MemberContentItem[];
  meta: {
    targetType: string | null;
    targetId: string | null;
    groupSlug: string | null;
    limit: number;
    offset: number;
    count: number;
  };
}

export interface MemberContentMutationResponse extends MemberContentTargetInput {
  status: 'success';
  message: string;
}

/** A current member's repost, hydrated into a post card from the WG feed. */
export interface MemberRepost {
  id: string;
  repostedAt: string;
  groupName: string;
  entry: FeedEntry;
}

export interface Answer {
  /** Lowercased substrings matched against the question. */
  k: string[];
  text: string;
  sources: AskSource[];
  sourceState: AskSourceState;
}

export type Relevance = 'high' | 'medium' | 'low';

/** Who published a story: the industry radar, or GPFA itself. */
export type NewsKind = 'radar' | 'gpfa';

export type NewsSourceFilter = 'all' | 'gpfa' | 'industry';

export interface RadarNewsStory {
  kind: 'radar';
  id: string;
  title: string;
  sourceName: string;
  url: string;
  summary: string;
  whyItMatters: string;
  topic: string;
  relevance: Relevance;
  publishedAt: string;
  publishedAtISO?: string;
  imageUrl?: string;
  tickerTag?: string;
  relatedThreadIds?: string[];
}

export interface GpfaNewsStory {
  kind: 'gpfa';
  id: string;
  slug: string;
  title: string;
  articleType: 'GPFA Update' | 'Industry Article' | 'Member Announcement' | 'Award';
  topic?: string;
  topics: string[];
  excerpt: string;
  body?: string;
  sourceName: string;
  publishedAt: string;
  publishedAtISO?: string;
  imageUrl?: string;
  externalUrl?: string;
  isMemberOnly: boolean;
}

export type NewsFeedItem = RadarNewsStory | GpfaNewsStory;

export interface RelatedNewsThread {
  id: string;
  groupSlug: string;
  title: string;
}

export interface NewsFeedFacets {
  topics: Array<{ value: string; count: number }>;
  sources: { gpfa: number; industry: number };
  allTopicsCount: number;
  allSourcesCount: number;
}

export interface NewsFeedPage {
  status: 'success';
  items: NewsFeedItem[];
  relatedThreads: RelatedNewsThread[];
  nextCursor: string | null;
  snapshotAt: string;
  totalMatching: number;
  totalAvailable: number;
  facets: NewsFeedFacets;
  selectedItem: NewsFeedItem | null;
}

export interface NewsFeedRequest {
  topic?: string;
  source?: NewsSourceFilter;
  limit?: number;
  cursor?: string | null;
  snapshotAt?: string;
  story?: string | null;
}

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
  /** Website-provided publication label used by the Home digest. */
  publishedAt?: string;
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

export interface ResourceHubData {
  resources: LibraryResource[];
  newsRadar: NewsStory[];
}


/** A post paired with the working group it belongs to. */
export interface FeedEntry {
  post: Thread;
  groupId: string;
}

export interface WorkingGroupThreadFeed {
  items: FeedEntry[];
  nextCursor: string | null;
  snapshotAt: string;
  totalMatching: number;
}

/** What the composer collects; the server assigns id, author and timestamps. */
export interface NewPostInput {
  groupId: string;
  groupSlug?: string;
  type: PostType;
  title: string;
  body: string;
  tags?: string[];
  attachmentIds?: string[];
  files?: ForumUploadFile[];
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  location?: string;
  registrationUrl?: string;
  isVirtual?: boolean;
  pollQuestions?: PollQuestionInput[];
  closesAt?: string;
}

/** A saved Ask GPFA conversation, newest activity first in history lists. */
export interface AskConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export type AskSourceType =
  | 'event'
  | 'discussion'
  | 'reply'
  | 'working_group_activity'
  | 'member'
  | 'leader'
  | 'organization'
  | 'resource'
  | 'podcast'
  | 'article'
  | 'news'
  | 'intelligence'
  | 'public_content'
  | 'file_material';

export type AskSourceState = 'ready' | 'partial' | 'failed' | 'not_applicable';

/** A server-validated supporting source attached to a saved Ask GPFA answer. */
export interface AskSource {
  rank: number;
  type: AskSourceType;
  label: string;
  title: string;
  href: string;
  excerpt: string | null;
  updatedAt: string | null;
}

/** A saved member question or Ask GPFA response. */
export interface AskMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  createdAt: string;
  sources: AskSource[];
  sourceState?: AskSourceState | null;
}

export type AskResearchPhase = 'thinking' | 'searching' | 'reviewing' | 'answering';
export type AskStreamStatus = 'generating' | 'saving' | 'complete' | 'stopped' | 'failed';

export interface AskTraceRow {
  id: string;
  name: string;
  summary: string;
  status: 'pending' | 'done';
}

/** Device-only state for the assistant row currently being generated. */
export interface AskDisplayMessage extends AskMessage {
  stream?: {
    status: AskStreamStatus;
    phase: AskResearchPhase;
    trace: AskTraceRow[];
    startedAt: number;
    durationSeconds?: number;
    /** The answer rendered, but the durable history write was not confirmed. */
    saveWarning?: string;
  };
}

/** One chronological page from a saved Ask GPFA conversation. */
export interface AskConversationPage {
  conversation: AskConversationSummary;
  messages: AskMessage[];
  hasEarlier: boolean;
  earlierCursor: string | null;
}

/** An answer from Ask GPFA, with the persisted records used to reconcile history. */
export interface AskAnswer {
  text: string;
  sources: AskSource[];
  sourceState?: AskSourceState | null;
  conversationId?: string;
  conversation?: AskConversationSummary;
  userMessage?: AskMessage;
  assistantMessage?: AskMessage;
}

export type AskStreamEvent =
  | {
      type: 'ready';
      conversationId: string;
      conversationTitle: string;
      userMessage: AskMessage;
    }
  | { type: 'tool_call'; name: string; summary: string }
  | { type: 'tool_result'; name: string; summary: string }
  | { type: 'text_delta'; text: string }
  | {
      type: 'done';
      answer: { content: string; sources: AskSource[]; sourceState: AskSourceState };
    }
  | {
      type: 'persisted';
      conversation: AskConversationSummary;
      assistantMessage: AskMessage;
    }
  | { type: 'error'; message: string };

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
  avatarUrl?: string | null;
}

/** Editable details returned only for the signed-in member. */
export interface OwnProfile extends Member {
  avatarUrl: string | null;
  country: string;
  bio: string;
  skills: string[];
  mentionHandle: string;
  organizationSlug: string | null;
}

export interface OwnProfileUpdateInput {
  fullName: string;
  roleTitle: string;
  country: string;
  bio: string;
  skills: string[];
}

export interface DirectoryMemberProfileOrganization {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
  country: string;
  organizationType: string;
  assetsLabel: string | null;
  description: string | null;
}

export interface DirectoryMemberProfileWorkingGroup {
  slug: string;
  name: string;
  description: string;
  leadLabel: string;
  cardImageUrl?: string;
  memberCount: number;
  role: string;
  joinedAt: string;
  postCount: number;
}

export interface DirectoryMemberProfileEvent {
  id: string;
  source: 'member_event' | 'working_group_event';
  title: string;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  datePrecision?: 'day' | 'datetime';
  location: string;
  sourceLabel: string;
  formatLabel: string;
  lifecycleLabel: string;
  timing: 'upcoming' | 'past';
  summary?: string;
  canUpdateRsvp: boolean;
  contentItemId?: string;
  threadId?: string;
  groupSlug?: string;
}

export interface DirectoryMemberProfile {
  id: string;
  mentionHandle: string;
  fullName: string;
  roleTitle: string;
  country: string;
  avatarUrl: string | null;
  bio: string | null;
  memberSince: string;
  skills: string[];
  organization: DirectoryMemberProfileOrganization;
  workingGroups: DirectoryMemberProfileWorkingGroup[];
  isSelf: boolean;
  /** Present only when viewing your own profile. */
  events?: DirectoryMemberProfileEvent[];
}

export type MemberProfileActivityKind = 'posts' | 'replies' | 'reposts';

export interface MemberProfileActivityItem {
  activityId: string;
  kind: 'post' | 'reply' | 'repost';
  postType: 'discussion' | 'poll' | 'announcement' | 'event';
  targetType: 'thread' | 'poll' | 'event' | 'announcement';
  targetId: string;
  groupSlug: string;
  groupName: string;
  title: string;
  excerpt: string;
  createdAt: string;
  parentTitle?: string;
  parentAuthorName?: string;
  upvoteCount?: number;
  replyCount?: number;
  repostCount?: number;
}

export interface MemberProfileActivityPage {
  kind: MemberProfileActivityKind;
  items: MemberProfileActivityItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  hasMore: boolean;
}

export type MemberEmailPreferenceKey =
  | 'workingGroupPosts'
  | 'siteEvents'
  | 'siteAnnouncements'
  | 'surveyEmails'
  | 'marketingCampaigns';

export type MemberEmailPreferences = Record<MemberEmailPreferenceKey, boolean>;

export interface MemberMentionActivity {
  id: string;
  context: string;
  targetType: 'thread' | 'reply';
  targetId: string;
  workingGroupSlug: string;
  groupName: string;
  postType: string | null;
  title: string;
  excerpt: string | null;
  createdAt: string;
}

/** A notification addressed to the signed-in member. */
export interface MemberNotification {
  id: string;
  /** Backend category for the event, e.g. reply, mention, saved item. */
  kind?: string;
  title: string;
  /** Supporting copy under the title. Omit when the title carries the whole message. */
  body?: string;
  /** Display string, e.g. "2h ago" or "Aug 20". The app never parses it. */
  time?: string;
  /** Canonical server timestamp used for ordering and membership-boundary checks. */
  createdAt?: string;
  /** False means it contributes to the bell badge. Missing is treated as unread. */
  read?: boolean;
  /** Optional deep link or web URL for a later open action. */
  href?: string;
  targetType?: string;
  targetId?: string;
  contentType?: string;
  contentId?: string;
  contentDeletedAt?: string | null;
}

export interface MemberNotificationsResponse {
  memberCreatedAt: string | null;
  notifications: MemberNotification[];
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

export type ResourceArtifact =
  | {
      kind: 'file';
      href: string;
      fileName?: string;
      contentType?: string;
      byteSize?: number;
      previewable: boolean;
    }
  | { kind: 'external'; href: string }
  | { kind: 'none' };

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
  artifact: ResourceArtifact;
  /** Compatibility destination for older callers; new actions use `artifact`. */
  href?: string;
}

/** A guest or host on an episode. */
export interface PodcastPerson {
  name: string;
  role?: string;
  /** Avatar fallback; derived from `name` when absent. */
  initials?: string;
  avatarUrl?: string | null;
  memberHref?: string | null;
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
  countryCode?: string;
  /** Head office, e.g. "Toronto". Joined with `country` in the profile masthead. */
  city?: string;
  /**
   * Headcount for the row and the profile stat. Authoritative — `people` may
   * carry fewer than this, and the profile shows both without contradiction.
   */
  members: number;
  /** Working groups the organization sits on. Profile stat only. */
  workingGroups?: number;
  /** One or two sentences on the profile masthead. */
  blurb?: string;
  /** Raster logo. RN's Image can't decode SVG; absent falls back to initials. */
  logoUrl?: string;
}

/** A named individual in the directory, belonging to exactly one member org. */
export interface DirectoryPerson {
  id: string;
  /** `MemberOrg.id` — the profile's People list and the search meta both key off it. */
  orgId: string;
  /** Stable directory route handle used for direct profile navigation. */
  mentionHandle?: string;
  name: string;
  /** Job title, e.g. "Assistant VP, Treasury & Liquidity". */
  role: string;
  /** Avatar fallback; derived from `name` when absent. */
  initials?: string;
  /** Raster portrait. RN's Image can't decode SVG; absent falls back to initials. */
  photoUrl?: string;
}

/** Viewer-scoped details for one active directory member. */
export interface DirectoryMemberSummary {
  id: string;
  roleTitle: string | null;
  region: string | null;
  organization: string | null;
  organizationSlug: string | null;
  threadCount: number | null;
  replyCount: number | null;
  sharedGroupCount: number;
}

/** A member as exposed by the private messaging service. */
export interface MessagingParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  organizationName: string | null;
  isCurrentMember: boolean;
  isAvailable: boolean;
  hasLeft: boolean;
}

export type MessageReaction = '👍' | '❤️' | '😂' | '😮' | '😢' | '🎉';

export interface MessageReactionAggregate {
  emoji: MessageReaction;
  count: number;
  reactedByCurrentMember: boolean;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  clientNonce: string;
  ordinal: number;
  createdAt: string;
  editedAt: string | null;
  kind: 'text' | 'system';
  reactions: MessageReactionAggregate[];
}

export interface ConversationSummary {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  participants: MessagingParticipant[];
  lastMessage: MessageItem | null;
  lastMessageAt: string;
  lastReaction: {
    emoji: MessageReaction;
    reactorId: string;
    messageSenderId: string;
    createdAt: string;
  } | null;
  lastReadOrdinal: number;
  unreadCount: number;
}

export interface ConversationDetail {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  participants: MessagingParticipant[];
  lastReadOrdinal: number;
}

export interface ConversationListResponse {
  status: 'success';
  conversations: ConversationSummary[];
  totalUnread: number;
}

export interface ConversationDetailResponse {
  status: 'success';
  conversation: ConversationDetail;
  messages: MessageItem[];
  latestOrdinal: number;
}

export interface MessageWindowQuery {
  beforeOrdinal?: number;
  afterOrdinal?: number;
  limit?: number;
}

/** Private broadcast events are invalidation hints; message content is never included. */
export type MessagingRealtimeEvent =
  | { type: 'conversation.created'; conversationId: string }
  | { type: 'conversation.member_left'; conversationId: string }
  | { type: 'conversation.members_added'; conversationId: string }
  | { type: 'conversation.renamed'; conversationId: string }
  | { type: 'message.created'; conversationId: string; messageId: string; ordinal: number }
  | { type: 'message.updated'; conversationId: string; messageId: string }
  | { type: 'reaction.changed'; conversationId: string; messageId: string };

export interface DirectConversationResponse {
  status: 'success';
  conversationId: string | null;
  recipient: MessagingParticipant;
}

export interface GroupConversationResponse {
  status: 'success';
  conversationId: string | null;
}

export interface SendMessageInput {
  conversationId?: string;
  participantIds?: string[];
  content: string;
  clientNonce: string;
}

export interface SendMessageResponse {
  status: 'success';
  conversationId: string;
  conversationCreated: boolean;
  message: MessageItem;
}

export interface EditMessageResponse {
  status: 'success';
  conversationId: string;
  message: MessageItem;
}

export interface UnsendMessageResponse {
  status: 'success';
  conversationId: string;
  message: MessageItem;
}

export interface MessageReactionInput {
  messageId: string;
  emoji: MessageReaction;
  active: boolean;
}

export interface MessageReactionResponse extends MessageReactionInput {
  status: 'success';
  conversationId: string;
}

export interface AddConversationMembersResponse {
  status: 'success';
  conversationId: string;
  participantIds: string[];
}

export interface LeaveConversationResponse {
  status: 'success';
  conversationId: string;
}

export interface RenameConversationResponse {
  status: 'success';
  conversationId: string;
  title: string | null;
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
  /** Full Markdown episode notes when distinct from the short summary. */
  showNotes?: string;
  hasTranscript: boolean;
  /** Authenticated JSON endpoint used to load synchronized transcript segments. */
  transcriptEndpoint?: string;
  /** Authenticated plain-text download URL. */
  transcriptUrl?: string;
  audioUrl?: string;
  /** Expiry for an object-scoped signed audio URL. Public URLs omit it. */
  audioExpiresAt?: string;
  /** 0–1 amplitudes, at most 48. Absent falls back to seeded peaks. */
  peaks?: number[];
  people: PodcastPerson[];
}

export interface PodcastTranscriptSegment {
  start: number;
  text: string;
}
