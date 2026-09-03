import type { MessagingRealtimeEvent } from './types';
import { subscribeToPrivateBroadcasts } from './member-realtime';
import { parseMessagingRealtimeEvent } from './realtime-events';

export const MESSAGING_REALTIME_EVENTS = [
  'conversation.created',
  'conversation.member_left',
  'conversation.members_added',
  'conversation.renamed',
  'message.created',
  'message.updated',
  'reaction.changed',
] as const;

export function subscribeToMessaging({
  memberId,
  onEvent,
  onSubscribed,
  onRecoveryNeeded,
}: {
  memberId: string;
  onEvent: (event: MessagingRealtimeEvent) => void;
  onSubscribed: () => void;
  onRecoveryNeeded: () => void;
}) {
  return subscribeToPrivateBroadcasts({
    topic: `member:${memberId}:messaging`,
    events: MESSAGING_REALTIME_EVENTS,
    onBroadcast: (event, payload) => {
      const parsed = parseMessagingRealtimeEvent(event, payload);
      if (parsed) onEvent(parsed);
    },
    onSubscribed,
    onRecoveryNeeded,
  });
}
