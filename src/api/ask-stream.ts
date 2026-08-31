import type {
  AskConversationSummary,
  AskMessage,
  AskSource,
  AskSourceState,
  AskSourceType,
  AskStreamEvent,
  AskTraceRow,
  AskResearchPhase,
} from './types';

const SOURCE_TYPES = new Set<AskSourceType>([
  'event',
  'discussion',
  'reply',
  'working_group_activity',
  'member',
  'leader',
  'organization',
  'resource',
  'podcast',
  'article',
  'news',
  'intelligence',
  'public_content',
  'file_material',
]);

const SOURCE_STATES = new Set<AskSourceState>([
  'ready',
  'partial',
  'failed',
  'not_applicable',
]);

const SOURCE_ROUTES: Record<AskSourceType, RegExp> = {
  event: /^\/members\/events(?:\/|\?|$)/,
  discussion: /^\/members\/groups(?:\/|\?|$)/,
  reply: /^\/members\/groups(?:\/|\?|$)/,
  working_group_activity: /^\/members\/groups(?:\/|\?|$)/,
  member: /^\/members\/directory\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
  leader: /^\/about\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
  organization: /^\/members\/(?:directory|organizations)(?:\/|\?|$)/,
  resource: /^\/members\/library(?:\/|\?|$)/,
  podcast: /^\/members\/podcasts(?:\/|\?|$)/,
  article: /^\/members\/(?:library|news)(?:\/|\?|$)/,
  news: /^\/members\/news(?:\/|\?|$)/,
  intelligence: /^\/members\/news(?:\/|\?|$)/,
  public_content:
    /^\/members\/(?:announcements|annual-meeting|directory|events|job-board|library|news|podcasts|polls|surveys)(?:\/|\?|$)/,
  file_material: /^\/members\/(?:knowledge|library)(?:\/|\?|$)/,
};

const UUID_SUFFIX = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHASE_ORDER: AskResearchPhase[] = ['thinking', 'searching', 'reviewing', 'answering'];

export function advanceAskResearchPhase(
  current: AskResearchPhase,
  next: AskResearchPhase
): AskResearchPhase {
  return PHASE_ORDER.indexOf(next) > PHASE_ORDER.indexOf(current) ? next : current;
}

export function completeAskTraceRow(trace: AskTraceRow[], name: string): AskTraceRow[] {
  const index = trace.findLastIndex((row) => row.name === name && row.status === 'pending');
  if (index < 0) return trace;
  return trace.map((row, rowIndex) =>
    rowIndex === index ? { ...row, status: 'done' as const } : row
  );
}

export function finalizeAskTrace(trace: AskTraceRow[]): AskTraceRow[] {
  return trace.map((row) => (row.status === 'pending' ? { ...row, status: 'done' as const } : row));
}

export function askDurationSeconds(startedAt: number): number {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
}

export function normalizeAskConversation(value: unknown): AskConversationSummary {
  const record = objectRecord(value, 'conversation');
  const id = requiredString(record.id, 'conversation id');
  const title = requiredString(record.title, 'conversation title');
  const updatedAt = requiredDate(record.updatedAt, 'conversation updatedAt');
  return { id, title, updatedAt };
}

export function normalizeAskSource(value: unknown): AskSource {
  const record = objectRecord(value, 'source');
  const type = record.type;
  const rank = record.rank;
  const label = requiredString(record.label, 'source label');
  const title = requiredString(record.title, 'source title');
  const href = requiredString(record.href, 'source href');

  if (typeof type !== 'string' || !SOURCE_TYPES.has(type as AskSourceType)) {
    throw new Error('Ask GPFA returned an unsupported source type.');
  }
  if (!Number.isInteger(rank) || (rank as number) < 1 || (rank as number) > 8) {
    throw new Error('Ask GPFA returned an invalid source rank.');
  }
  if (label.length > 120 || title.length > 240 || href.length > 2048) {
    throw new Error('Ask GPFA returned an oversized source.');
  }
  const sourceType = type as AskSourceType;
  if (
    !SOURCE_ROUTES[sourceType].test(href) ||
    /[\\#]/.test(href) ||
    href.startsWith('//') ||
    href.includes('..') ||
    /%(?:2e|2f|5c)/i.test(href) ||
    (sourceType === 'member' && UUID_SUFFIX.test(href))
  ) {
    throw new Error('Ask GPFA returned an invalid source destination.');
  }

  const excerpt = nullableString(record.excerpt, 'source excerpt');
  const updatedAt = nullableDate(record.updatedAt, 'source updatedAt');
  return { rank: rank as number, type: sourceType, label, title, href, excerpt, updatedAt };
}

export function normalizeAskSources(value: unknown): AskSource[] {
  if (!Array.isArray(value)) throw new Error('Ask GPFA returned invalid sources.');
  const seen = new Set<string>();
  return value
    .map(normalizeAskSource)
    .sort((a, b) => a.rank - b.rank)
    .filter((source) => {
      const key = `${source.type}:${source.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeAskMessage(value: unknown): AskMessage {
  const record = objectRecord(value, 'message');
  const id = requiredString(record.id, 'message id');
  const role = record.role === 'user' || record.role === 'ai' ? record.role : null;
  if (!role) throw new Error('Ask GPFA returned an invalid message role.');
  if (typeof record.text !== 'string') throw new Error('Ask GPFA returned invalid message text.');
  const createdAt = requiredDate(record.createdAt, 'message createdAt');
  const sourceState = optionalSourceState(record.sourceState);
  return {
    id,
    role,
    text: record.text,
    createdAt,
    sources: record.sources === undefined ? [] : normalizeAskSources(record.sources),
    ...(sourceState ? { sourceState } : {}),
  };
}

export function normalizeAskStreamEvent(value: unknown, eventName?: string): AskStreamEvent | null {
  const record = objectRecord(value, 'stream event');
  const type = typeof record.type === 'string' ? record.type : eventName;
  if (!type) throw new Error('Ask GPFA returned an unnamed stream event.');

  if (type === 'ready') {
    return {
      type,
      conversationId: requiredString(record.conversationId, 'conversation id'),
      conversationTitle: requiredString(record.conversationTitle, 'conversation title'),
      userMessage: normalizeAskMessage(record.userMessage),
    };
  }
  if (type === 'tool_call' || type === 'tool_result') {
    return {
      type,
      name: requiredString(record.name, 'tool name'),
      summary: requiredString(record.summary, 'tool summary'),
    };
  }
  if (type === 'text_delta') {
    if (typeof record.text !== 'string') throw new Error('Ask GPFA returned an invalid text update.');
    return { type, text: record.text };
  }
  if (type === 'done') {
    const answer = objectRecord(record.answer, 'answer');
    return {
      type,
      answer: {
        content: requiredString(answer.content, 'answer content'),
        sources: normalizeAskSources(answer.sources),
        sourceState: requiredSourceState(answer.sourceState),
      },
    };
  }
  if (type === 'persisted') {
    return {
      type,
      conversation: normalizeAskConversation(record.conversation),
      assistantMessage: normalizeAskMessage(record.assistantMessage),
    };
  }
  if (type === 'error') return { type, message: requiredString(record.message, 'error message') };

  // Future optional events can be ignored without making current clients unusable.
  return null;
}

export interface AskSseParser {
  push(chunk: Uint8Array): void;
  finish(): void;
}

export function createAskSseParser(onEvent: (event: AskStreamEvent) => void): AskSseParser {
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatchFrame = (frame: string) => {
    let eventName: string | undefined;
    const data: string[] = [];
    for (const rawLine of frame.split(/\r?\n/)) {
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
      if (!line || line.startsWith(':')) continue;
      const separator = line.indexOf(':');
      const field = separator < 0 ? line : line.slice(0, separator);
      let fieldValue = separator < 0 ? '' : line.slice(separator + 1);
      if (fieldValue.startsWith(' ')) fieldValue = fieldValue.slice(1);
      if (field === 'event') eventName = fieldValue;
      if (field === 'data') data.push(fieldValue);
    }
    if (data.length === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(data.join('\n'));
    } catch {
      throw new Error('Ask GPFA returned a malformed stream event.');
    }
    const event = normalizeAskStreamEvent(parsed, eventName);
    if (event) onEvent(event);
  };

  const drain = () => {
    while (true) {
      const boundary = /\r?\n\r?\n/.exec(buffer);
      if (!boundary || boundary.index === undefined) return;
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      dispatchFrame(frame);
    }
  };

  return {
    push(chunk) {
      buffer += decoder.decode(chunk, { stream: true });
      drain();
    },
    finish() {
      buffer += decoder.decode();
      drain();
      // A frame is only complete after its blank-line delimiter. Native
      // transports can close between bytes, so parsing a trailing fragment
      // would turn a recoverable dropped final event into a malformed-stream
      // failure after the answer is already visible.
      buffer = '';
    },
  };
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Ask GPFA returned an invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Ask GPFA returned an invalid ${label}.`);
  }
  return value;
}

function requiredDate(value: unknown, label: string): string {
  const date = requiredString(value, label);
  if (!Number.isFinite(Date.parse(date))) throw new Error(`Ask GPFA returned an invalid ${label}.`);
  return date;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Ask GPFA returned an invalid ${label}.`);
  return value;
}

function nullableDate(value: unknown, label: string): string | null {
  const date = nullableString(value, label);
  if (date !== null && !Number.isFinite(Date.parse(date))) {
    throw new Error(`Ask GPFA returned an invalid ${label}.`);
  }
  return date;
}

function requiredSourceState(value: unknown): AskSourceState {
  if (typeof value !== 'string' || !SOURCE_STATES.has(value as AskSourceState)) {
    throw new Error('Ask GPFA returned an invalid source state.');
  }
  return value as AskSourceState;
}

function optionalSourceState(value: unknown): AskSourceState | null {
  return value === null || value === undefined ? null : requiredSourceState(value);
}
