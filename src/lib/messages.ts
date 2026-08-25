import type { ConversationDetail, ConversationSummary, MessagingParticipant } from '../api/types';

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
