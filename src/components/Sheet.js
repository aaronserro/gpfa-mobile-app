import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/**
 * Bottom sheet shell shared by the compose and "more" sheets. Reproduces the
 * design's `sheetUp` + `fadeIn` pair: scrim fades, panel slides from below.
 */
export default function Sheet({ onClose, children, panelStyle }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(p, {
      toValue: 1,
      duration: 350,
      easing: Easing.bezier(0.32, 0.72, 0.25, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [p]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: p }]}>
        <Pressable style={styles.scrim} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          panelStyle,
          { transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] },
        ]}
      >
        <View style={styles.grabber} />
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(4,10,8,0.65)',
  },
  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 8,
  },
});
