import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BlockedMemberListItem } from '../../api/types';
import { Avatar } from '../../ds/primitives';
import { useTheme } from '../../ds/ThemeProvider';
import { sans, trackDisplay } from '../../ds/tokens';
import { initials } from '../../lib/format';
import BlockMemberAction from './BlockMemberAction';

export interface BlockedMembersPanelProps {
  members: BlockedMemberListItem[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  nextCursor: string | null;
  pendingMemberId: string | null;
  onRetry: () => void;
  onLoadMore: () => Promise<void>;
  onUnblock: (memberId: string) => Promise<void>;
}

export default function BlockedMembersPanel({
  members,
  loading,
  loadingMore,
  error,
  nextCursor,
  pendingMemberId,
  onRetry,
  onLoadMore,
  onUnblock,
}: BlockedMembersPanelProps) {
  const { t } = useTheme();

  return (
    <View style={styles.section}>
      <View>
        <Text style={[styles.heading, { color: t.inkStrong }]}>Blocked members</Text>
        <Text style={[styles.help, { color: t.inkMuted }]}>Manage members you have blocked. Other members’ choices are private.</Text>
      </View>

      {loading && members.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={t.brandGreen} />
          <Text style={[styles.stateText, { color: t.inkMuted }]}>Loading blocked members…</Text>
        </View>
      ) : error && members.length === 0 ? (
        <View accessibilityRole="alert" style={[styles.state, styles.stateCard, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
          <Text style={[styles.stateTitle, { color: t.inkStrong }]}>Blocked members unavailable</Text>
          <Text style={[styles.stateText, { color: t.inkMuted }]}>{error.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={[styles.retry, { borderColor: t.ruleStrong }]}
          >
            <Text style={[styles.retryText, { color: t.inkStrong }]}>Try again</Text>
          </Pressable>
        </View>
      ) : members.length === 0 ? (
        <View style={[styles.stateCard, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
          <Text style={[styles.stateText, { color: t.inkMuted }]}>You have not blocked any members.</Text>
        </View>
      ) : (
        <View style={[styles.list, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
          {members.map((member) => {
            const available = member.availability === 'active';
            const name = available ? member.name : 'Unavailable member';
            return (
              <View key={member.memberId} style={[styles.row, { borderBottomColor: t.ruleHairline }]}>
                <Avatar
                  initials={available ? initials(member.name) : '—'}
                  photoUrl={available ? member.avatarUrl ?? undefined : undefined}
                  size={40}
                />
                <View style={styles.identity}>
                  <Text numberOfLines={1} style={[styles.name, { color: t.inkStrong }]}>{name}</Text>
                  <Text numberOfLines={1} style={[styles.meta, { color: t.inkMuted }]}>
                    {available ? member.organizationName ?? 'GPFA member' : 'Profile unavailable'}
                  </Text>
                </View>
                <BlockMemberAction
                  member={{ id: member.memberId, name }}
                  mode="unblock"
                  pending={pendingMemberId === member.memberId}
                  onBlock={async () => undefined}
                  onUnblock={onUnblock}
                />
              </View>
            );
          })}
        </View>
      )}

      {error && members.length > 0 ? (
        <View accessibilityRole="alert" style={styles.inlineError}>
          <Text style={[styles.stateText, { color: t.brandRed }]}>The list could not be refreshed.</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
            <Text style={[styles.retryText, { color: t.brandGreen }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {nextCursor ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
          disabled={loadingMore}
          onPress={() => void onLoadMore()}
          style={[styles.loadMore, { borderColor: t.ruleStrong, opacity: loadingMore ? 0.55 : 1 }]}
        >
          {loadingMore ? <ActivityIndicator size="small" color={t.brandGreen} /> : null}
          <Text style={[styles.retryText, { color: t.inkStrong }]}>{loadingMore ? 'Loading…' : 'Load more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 30, gap: 12 },
  heading: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  help: { marginTop: 5, fontFamily: sans(400), fontSize: 12, lineHeight: 18 },
  state: { alignItems: 'center', gap: 8, paddingVertical: 18 },
  stateCard: { borderWidth: 1, borderRadius: 8, padding: 16 },
  stateTitle: { fontFamily: sans(600), fontSize: 13.5 },
  stateText: { fontFamily: sans(400), fontSize: 12, lineHeight: 18, textAlign: 'center' },
  retry: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderRadius: 7, paddingHorizontal: 14 },
  retryText: { fontFamily: sans(600), fontSize: 12 },
  list: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, padding: 12 },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: sans(600), fontSize: 13.5 },
  meta: { marginTop: 3, fontFamily: sans(400), fontSize: 11.5 },
  inlineError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  loadMore: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 7 },
});
