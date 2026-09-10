import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans } from '../ds/tokens';

/**
 * v2 order, matching the web portal: Home · Groups · Ask GPFA · Directory ·
 * Menu. The previous build ran Directory before Ask and closed with a "More"
 * overflow; both are gone. `more` is still the id behind Menu so the tab's
 * deep links and return-tab bookkeeping keep working.
 */
export const TAB_IDS = ['home', 'groups', 'ask', 'directory', 'more'] as const;
export type TabId = (typeof TAB_IDS)[number];

/**
 * Ionicons rather than Phosphor here: this is the one piece of chrome that
 * should read as the platform's own, and Ionicons ships the filled/outline pair
 * iOS tab bars are built on.
 */
interface TabDef {
  id: TabId;
  label: string;
  /** The outline name; the filled variant is the same name without `-outline`. */
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'groups', label: 'Groups', icon: 'chatbubbles-outline' },
  { id: 'ask', label: 'Ask GPFA', icon: 'sparkles-outline' },
  { id: 'directory', label: 'Directory', icon: 'people-outline' },
  { id: 'more', label: 'Menu', icon: 'menu-outline' },
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
  const { t, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      // The design calls for a blurred bar. `expo-blur` is the real thing on
      // iOS; Android's implementation is experimental and expensive, so it
      // falls back to the resolved 94% page tint it used before.
      intensity={Platform.OS === 'ios' ? 60 : 0}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.bar,
        {
          backgroundColor:
            Platform.OS === 'ios' ? alpha(t.surfacePage, 0.72) : alpha(t.surfacePage, 0.94),
          borderTopColor: t.rule,
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      {TABS.map(({ id, label, icon }) => {
        const active = tab === id;
        // v2 marks the active tab with the filled glyph in ink, not in teal —
        // teal-on-teal was losing the distinction against the anchor button.
        const color = active ? t.inkStrong : t.inkMuted;
        const badge = badges[id] ?? 0;
        return (
          <Pressable
            key={id}
            style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.6 } : null]}
            android_ripple={{ color: alpha(t.inkStrong, 0.12), borderless: true, radius: 40 }}
            onPress={() => onSelect(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Ionicons
              name={active ? (icon.replace('-outline', '') as typeof icon) : icon}
              size={24}
              color={color}
            />
            <Text style={[styles.label, { color, fontFamily: sans(active ? 600 : 400) }]}>
              {label}
            </Text>
            {showBadges && !!badge && (
              <View style={[styles.badge, { backgroundColor: t.brandBrickInk }]}>
                <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    minHeight: 52,
    paddingTop: 6,
    paddingBottom: 2,
  },
  label: {
    fontSize: 12,
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
