import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, USING_REMOTE_API } from './config';
import { getSessionForRequest } from './session';
import { memberRealtimeRetryDelayMs } from '../lib/realtime-state';

export type MemberRealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

export interface MemberRealtimeSubscription {
  close: () => Promise<void>;
}

export function canSubscribeToMemberRealtime() {
  return USING_REMOTE_API && Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function isMemberRealtimeStatus(status: string): status is MemberRealtimeStatus {
  return (
    status === 'SUBSCRIBED' ||
    status === 'TIMED_OUT' ||
    status === 'CLOSED' ||
    status === 'CHANNEL_ERROR'
  );
}

/** Owns one authenticated private channel and reconnects without retaining stale joins. */
export function subscribeToPrivateBroadcasts({
  topic,
  events,
  onBroadcast,
  onSubscribed,
  onRecoveryNeeded,
}: {
  topic: string;
  events: readonly string[];
  onBroadcast: (event: string, payload: unknown) => void;
  onSubscribed: () => void;
  onRecoveryNeeded: () => void;
}): MemberRealtimeSubscription | null {
  if (!canSubscribeToMemberRealtime()) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    accessToken: async () => (await getSessionForRequest())?.accessToken ?? null,
  });

  let channel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let connectId = 0;
  let closed = false;

  const scheduleReconnect = () => {
    if (closed || retryTimer) return;
    const delay = memberRealtimeRetryDelayMs(attempt++);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  };

  const connect = async () => {
    const id = ++connectId;
    try {
      const session = await getSessionForRequest();
      if (closed || id !== connectId) return;
      if (!session?.accessToken) {
        onRecoveryNeeded();
        scheduleReconnect();
        return;
      }

      await client.realtime.setAuth(session.accessToken);
      if (closed || id !== connectId) return;

      if (channel) {
        const stale = channel;
        channel = null;
        await client.removeChannel(stale);
        if (closed || id !== connectId) return;
      }

      const currentChannel = client.channel(topic, { config: { private: true } });
      channel = currentChannel;
      for (const event of events) {
        currentChannel.on('broadcast', { event }, ({ payload }) => onBroadcast(event, payload));
      }
      currentChannel.subscribe((status) => {
        if (closed || id !== connectId || channel !== currentChannel || !isMemberRealtimeStatus(status)) return;
        if (status === 'SUBSCRIBED') {
          attempt = 0;
          onSubscribed();
          return;
        }
        onRecoveryNeeded();
        scheduleReconnect();
      });
    } catch {
      if (closed || id !== connectId) return;
      onRecoveryNeeded();
      scheduleReconnect();
    }
  };

  void connect();

  return {
    close: async () => {
      if (closed) return;
      closed = true;
      connectId += 1;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      if (!channel) return;
      const current = channel;
      channel = null;
      await client.removeChannel(current);
    },
  };
}
