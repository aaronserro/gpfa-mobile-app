import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const TABS = [
  { key: 'home', label: 'Home', d: 'M3 11 L12 3 L21 11 M5 10 V21 H10 V15 H14 V21 H19 V10' },
  { key: 'groups', label: 'Groups', d: 'M4 5 H20 V16 H12 L8 20 V16 H4 Z' },
  {
    key: 'directory',
    label: 'Directory',
    d: 'M9 11 a3.5 3.5 0 1 0 -0.1 0 Z M3 20 c0 -3.5 2.6 -5.4 6 -5.4 s6 1.9 6 5.4 M16 11.5 a3 3 0 1 0 -2 -5.3 M17 14.8 c2.4 0.4 4 2 4 4.8',
  },
  { key: 'ask', label: 'Ask', d: 'M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z' },
  { key: 'more', label: 'More', d: 'M5 12 h0.01 M12 12 h0.01 M19 12 h0.01' },
];

const MORE_SCREENS = ['news', 'announcements', 'profile'];
const GROUP_SCREENS = ['group', 'thread'];

export default function TabBar({ screen, showMore, onSelect }) {
  const isActive = (key) => {
    if (key === 'more') return showMore || MORE_SCREENS.includes(screen);
    if (key === 'groups') return screen === 'groups' || GROUP_SCREENS.includes(screen);
    return key === screen;
  };

  return (
    <View style={styles.wrap}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      {TABS.map((tab) => {
        const color = isActive(tab.key) ? colors.green : colors.dim;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => onSelect(tab.key)}
          >
            <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d={tab.d} />
            </Svg>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 22,
    zIndex: 30,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,30,25,0.82)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabPressed: {
    transform: [{ scale: 0.9 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
