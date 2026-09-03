import type {
  ConversationDetail,
  ConversationSummary,
  MessageItem,
  MessageWindowQuery,
  MessagingParticipant,
} from '../api/types';

export const MESSAGE_EDIT_WINDOW_MS = 5 * 60 * 1_000;

const DISALLOWED_C0_CONTROL_PATTERN = /[\u0000-\u0008\u000B-\u000D\u000E-\u001F\u007F]/u;

export function normalizeMessageContent(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

export function messageContentError(value: string): string | null {
  const normalized = normalizeMessageContent(value);
  if (!normalized) return 'Message content is required.';
  if (normalized.length > 4_000) return 'Message content must be 4,000 characters or fewer.';
  if (DISALLOWED_C0_CONTROL_PATTERN.test(normalized)) {
    return 'Message content contains unsupported control characters.';
  }
  return null;
}

export function isMessageWithinEditWindow(createdAt: string, now = Date.now()): boolean {
  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs) && now - createdAtMs < MESSAGE_EDIT_WINDOW_MS;
}

export function replaceMessageById(messages: MessageItem[], next: MessageItem): MessageItem[] {
  return messages.map((message) => message.id === next.id ? next : message);
}

export function replaceConversationLastMessage(
  conversations: ConversationSummary[],
  next: MessageItem
): ConversationSummary[] {
  return conversations.map((conversation) =>
    conversation.id === next.conversationId && conversation.lastMessage?.id === next.id
      ? { ...conversation, lastMessage: next }
      : conversation
  );
}

export function messageUpdatedWindowQuery(
  messages: MessageItem[],
  messageId: string
): MessageWindowQuery {
  const message = messages.find((candidate) => candidate.id === messageId);
  return message
    ? { beforeOrdinal: message.ordinal + 1, limit: 1 }
    : { limit: 50 };
}

export function messagingParticipantName(participant: MessagingParticipant): string {
  return participant.isAvailable ? participant.name : 'Unavailable';
}

export function conversationTitle(
  conversation: Pick<ConversationSummary | ConversationDetail, 'kind' | 'title' | 'participants'>
): string {
  if (conversation.kind === 'group' && conversation.title) return conversation.title;
  const names = conversation.participants
    .filter((participant) => !participant.isCurrentMember && !participant.hasLeft)
    .map(messagingParticipantName);
  if (!names.length) return 'No other active members';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

export function messageTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat('en-CA',
    sameDay
      ? { hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric' }
  ).format(date);
}
