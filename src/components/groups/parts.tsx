/**
 * Pieces shared by the group directory, a group's tabs, and a post detail.
 *
 * The post-type chip and the #topic chip appear at four sizes between them, so
 * both take a `size` and scale their icon with it rather than being forked.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import {
  CalendarDots,
  ChartBar,
  ChatCircle,
  Hash,
  MapPin,
  Megaphone,
  UsersThree,
  type Icon,
} from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, postTypeStyle, sans } from '../../ds/tokens';
import type { EventRow, PostType } from '../../api/types';

export const TYPE_ICON: Record<PostType, Icon> = {
  discussion: ChatCircle,
  poll: ChartBar,
  announcement: Megaphone,
  event: CalendarDots,
};

export const ROW_ICON: Record<EventRow['icon'], Icon> = {
  calendar: CalendarDots,
  pin: MapPin,
  people: UsersThree,
};

/** The post type as a bordered pill: icon, label, type colour. */
export function TypeChip({ type, size = 9.5 }: { type: PostType; size?: number }) {
  const { t } = useTheme();
  const kind = postTypeStyle(t, type);
  const TypeIcon = TYPE_ICON[type];
  return (
    <View style={[styles.typeChip, { borderColor: kind.chipBd, backgroundColor: kind.chipBg }]}>
      <TypeIcon size={size + 1.5} color={kind.ink} />
      <Text style={[styles.typeChipText, { fontSize: size, letterSpacing: size * 0.05, color: kind.ink }]}>
        {kind.label}
      </Text>
    </View>
  );
}

/** A #topic pill. Heights come from the design: 19 in a feed card, 20–24 elsewhere. */
export function TagChip({
  label,
  size = 10,
  height = 19,
}: {
  label: string;
  size?: number;
  height?: number;
}) {
  const { t } = useTheme();
  return (
    <View style={[styles.tagChip, { height, backgroundColor: t.surfaceSoft }]}>
      <Hash size={size + 0.5} color={t.inkMuted} />
      <Text style={[styles.tagChipText, { fontSize: size, color: t.inkMuted }]}>{label}</Text>
    </View>
  );
}

/**
 * The directory card's banner: `repeating-linear-gradient(45deg, …)` as an SVG
 * pattern.
 *
 * CSS measures that gradient along its own axis — a 10px band on a 20px period,
 * both perpendicular to the stripes. A 45° tile that repeats at the same rate
 * is therefore 20·√2 on a side, carrying one band plus the two that straddle
 * its corners, so the tiling reads as continuous.
 */
const HATCH_TILE = 28.284;

export function HatchBanner({ height = 96 }: { height?: number }) {
  const { t } = useTheme();
  const T = HATCH_TILE;
  return (
    <View style={[styles.banner, { height, backgroundColor: t.surfaceSoft }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="hatch" width={T} height={T} patternUnits="userSpaceOnUse">
            <Path
              d={`M${-T} ${T} L${T} ${-T} M0 ${T} L${T} 0 M0 ${2 * T} L${2 * T} 0`}
              stroke={alpha(t.surfaceAnchor, 0.1)}
              strokeWidth={10}
            />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hatch)" />
      </Svg>
    </View>
  );
}

/** The "Co-lead" / "Author" marker beside a name. */
export function RoleBadge({ children }: { children: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.roleBadge, { backgroundColor: t.brandGreenSoft }]}>
      <Text style={[styles.roleBadgeText, { color: t.brandGreenStrong }]}>{children}</Text>
    </View>
  );
}

/** A round mark filled with the anchor surface — post and reply authors use it. */
export function AnchorAvatar({ initials, size = 36 }: { initials: string; size?: number }) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.anchorAvatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.surfaceAnchor },
      ]}
    >
      <Text style={[styles.anchorAvatarText, { fontSize: size <= 28 ? 9 : 12 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  typeChipText: { fontFamily: mono(400), textTransform: 'uppercase' },

  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 32,
    paddingHorizontal: 8,
  },
  tagChipText: { fontFamily: sans(400) },

  banner: { width: '100%', overflow: 'hidden' },

  roleBadge: { borderRadius: 3, paddingVertical: 1, paddingHorizontal: 6 },
  roleBadgeText: {
    fontFamily: sans(600),
    fontSize: 8.5,
    letterSpacing: 0.51,
    textTransform: 'uppercase',
  },

  anchorAvatar: { alignItems: 'center', justifyContent: 'center' },
  anchorAvatarText: { fontFamily: sans(600), color: '#fff' },
});
