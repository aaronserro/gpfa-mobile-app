import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Icon } from '../ds/icons';
import { Buildings, ChatCircleDots, DotsThree, House, UsersThree } from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans } from '../ds/tokens';

export type TabId = 'home' | 'groups' | 'directory' | 'ask' | 'more';

interface TabDef {
  id: TabId;
  label: string;
  Icon: Icon;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'groups', label: 'Groups', Icon: UsersThree },
  { id: 'directory', label: 'Directory', Icon: Buildings },
  { id: 'ask', label: 'Ask GPFA', Icon: ChatCircleDots },
  { id: 'more', label: 'More', Icon: DotsThree },
];

export default function PortalTabBar({
  tab,
  onSelect,
  showBadges,
  badges = {},
}: {
  tab: TabId;
  onSelect: (tab: TabId) => void;
  showBadges: boolean;
  badges?: Partial<Record<TabId, number>>;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          // The design blurs the bar; RN can't blur a translucent fill without a
          // dedicated view, so this is the resolved 92% paper tint.
          backgroundColor: alpha(t.surfacePaper, 0.92),
          borderTopColor: t.ruleHairline,
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        const color = active ? t.brandGreen : t.inkFaint;
        const badge = badges[id] ?? 0;
        return (
          <Pressable key={id} style={styles.tab} onPress={() => onSelect(id)}>
            <Icon size={23} color={color} weight={active ? 'fill' : 'regular'} />
            <Text style={[styles.label, { color }]}>{label}</Text>
            {showBadges && !!badge && (
              <View style={[styles.badge, { backgroundColor: t.brandBrickInk }]}>
                <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    minHeight: 50,
    paddingTop: 7,
    paddingBottom: 3,
  },
  label: {
    fontFamily: sans(600),
    fontSize: 10,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: 3,
    left: '50%',
    marginLeft: 7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: sans(600),
    fontSize: 9.5,
    color: '#fff',
  },
});
