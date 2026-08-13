import { Pressable, StyleSheet, Text, View } from 'react-native';
import Sheet from './Sheet';
import { colors, mono } from '../theme';

const ITEMS = [
  { glyph: 'NW', label: 'News', screen: 'news' },
  { glyph: 'AN', label: 'Announcements', screen: 'announcements' },
  { glyph: 'PR', label: 'Profile & Organization', screen: 'profile' },
  { glyph: '→]', label: 'Sign out', screen: 'signin' },
];

export default function MoreSheet({ onClose, onNavigate }) {
  return (
    <Sheet onClose={onClose} panelStyle={styles.panel}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.screen}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => onNavigate(item.screen)}
        >
          <View style={styles.glyphBox}>
            <Text style={styles.glyph}>{item.glyph}</Text>
          </View>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingBottom: 110,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.fill,
  },
  rowPressed: {
    backgroundColor: 'rgba(169,217,164,0.12)',
  },
  glyphBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(169,217,164,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  chevron: {
    color: colors.dim,
    fontSize: 18,
  },
});
