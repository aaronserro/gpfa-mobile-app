import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Prohibit } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { sans } from '../../ds/tokens';

export interface BlockMemberActionProps {
  member: { id: string; name: string };
  mode: 'block' | 'unblock';
  pending: boolean;
  onBlock: (memberId: string) => Promise<void>;
  onUnblock: (memberId: string) => Promise<void>;
}

export default function BlockMemberAction({
  member,
  mode,
  pending,
  onBlock,
  onUnblock,
}: BlockMemberActionProps) {
  const { t } = useTheme();
  const blocking = mode === 'block';
  const label = blocking ? 'Block member' : 'Unblock';

  const confirm = () => {
    Alert.alert(
      blocking ? `Block ${member.name}?` : `Unblock ${member.name}?`,
      blocking
        ? 'You will no longer see each other in the member directory or profiles. Your direct message history will remain available but read-only, and future direct mentions and notifications will stop. Existing group conversations are not affected.'
        : 'This ends only your block. Messaging and profile access may remain unavailable if another restriction still applies.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: blocking ? 'Block' : 'Unblock',
          style: blocking ? 'destructive' : 'default',
          onPress: () => {
            const action = blocking ? onBlock : onUnblock;
            void action(member.id).catch(() => undefined);
          },
        },
      ]
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${member.name}`}
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={confirm}
      style={({ pressed }) => [
        styles.action,
        {
          borderColor: blocking ? t.brandRed : t.ruleStrong,
          backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper,
          opacity: pending ? 0.55 : 1,
        },
      ]}
    >
      <Prohibit size={16} color={blocking ? t.brandRed : t.inkStrong} />
      <Text style={[styles.label, { color: blocking ? t.brandRed : t.inkStrong }]}>
        {pending ? `${blocking ? 'Blocking' : 'Unblocking'}…` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 13,
  },
  label: { fontFamily: sans(600), fontSize: 12 },
});
