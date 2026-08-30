import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, USING_REMOTE_API } from './config';
import { getSessionForRequest } from './session';

export interface NotificationRealtimeSubscription {
  close: () => Promise<void>;
}

export function canSubscribeToNotificationRealtime() {
  return USING_REMOTE_API && Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/** Uses the app's existing single-flight token lifecycle; Supabase owns only the socket. */
export function subscribeToNotificationInserts({
  onInsert,
  onRecoveryNeeded,
}: {
  onInsert: (row: unknown) => void;
  onRecoveryNeeded: () => void;
}): NotificationRealtimeSubscription | null {
  if (!canSubscribeToNotificationRealtime()) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    accessToken: async () => (await getSessionForRequest())?.accessToken ?? null,
  });

  let channel: RealtimeChannel | null = client
    .channel('mobile-member-notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => onInsert(payload.new)
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onRecoveryNeeded();
    });

  return {
    close: async () => {
      if (!channel) return;
      const current = channel;
      channel = null;
      await client.removeChannel(current);
    },
  };
}
