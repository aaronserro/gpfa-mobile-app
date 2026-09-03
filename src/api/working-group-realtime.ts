import type { WorkingGroupFeedRealtimeEvent } from './types';
import { subscribeToPrivateBroadcasts } from './member-realtime';
import { parseWorkingGroupFeedRealtimeEvent } from './realtime-events';

export function subscribeToWorkingGroupFeed({
  groupSlug,
  onEvent,
  onSubscribed,
  onRecoveryNeeded,
}: {
  groupSlug: string;
  onEvent: (event: WorkingGroupFeedRealtimeEvent) => void;
  onSubscribed: () => void;
  onRecoveryNeeded: () => void;
}) {
  return subscribeToPrivateBroadcasts({
    topic: `working-group:${groupSlug}`,
    events: ['working_group_feed_changed'],
    onBroadcast: (_event, payload) => {
      const parsed = parseWorkingGroupFeedRealtimeEvent(payload);
      if (parsed) onEvent(parsed);
    },
    onSubscribed,
    onRecoveryNeeded,
  });
}
