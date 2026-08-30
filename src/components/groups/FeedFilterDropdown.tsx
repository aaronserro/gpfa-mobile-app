import { useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CaretDown, CheckCircle } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, sans } from '../../ds/tokens';

export interface FeedFilterOption<T extends string> {
  id: T;
  label: string;
}

interface MenuAnchor {
  left: number;
  top: number;
  width: number;
}

const SCREEN_MARGIN = 16;
const MENU_GAP = 6;
const MENU_ITEM_HEIGHT = 44;
const MENU_PADDING = 4;
const MIN_MENU_WIDTH = 196;

export default function FeedFilterDropdown<T extends string>({
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly FeedFilterOption<T>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: T) => void;
}) {
  const { t } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const selected = options.find((option) => option.id === value);

  if (!selected) {
    throw new Error(`Unknown ${label.toLowerCase()} filter value: ${value}`);
  }

  function toggleMenu() {
    if (open) {
      onOpenChange(false);
      return;
    }

    Keyboard.dismiss();
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = Math.min(
        Math.max(width, MIN_MENU_WIDTH),
        windowWidth - SCREEN_MARGIN * 2
      );
      const menuHeight = options.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2;
      const below = y + height + MENU_GAP;
      const top =
        below + menuHeight <= windowHeight - SCREEN_MARGIN
          ? below
          : Math.max(SCREEN_MARGIN, y - menuHeight - MENU_GAP);
      const left = Math.min(
        Math.max(SCREEN_MARGIN, x),
        windowWidth - menuWidth - SCREEN_MARGIN
      );

      setAnchor({ left, top, width: menuWidth });
      onOpenChange(true);
    });
  }

  return (
    <View style={styles.root}>
      <Pressable
        ref={triggerRef}
        onPress={toggleMenu}
        accessibilityRole="button"
        accessibilityLabel={`${label} filter, ${selected.label}`}
        accessibilityHint={`Shows ${label.toLowerCase()} filter options`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: open ? t.surfaceAnchor : t.ruleHairline,
            backgroundColor: pressed ? alpha(t.surfaceSoft, 0.65) : t.surfacePaper,
          },
        ]}
      >
        <View style={styles.triggerText}>
          <Text numberOfLines={1} style={[styles.label, { color: t.inkFaint }]}>
            {label}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.value, { color: t.inkStrong }]}
          >
            {selected.label}
          </Text>
        </View>
        <CaretDown
          size={13}
          weight="bold"
          color={open ? t.surfaceAnchor : t.inkMuted}
        />
      </Pressable>

      <Modal
        visible={open && anchor !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => onOpenChange(false)}
      >
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => onOpenChange(false)}
            accessibilityRole="button"
            accessibilityLabel={`Close ${label.toLowerCase()} filter options`}
          />
          {anchor && (
            <View
              style={[
                styles.menu,
                {
                  left: anchor.left,
                  top: anchor.top,
                  width: anchor.width,
                  borderColor: t.ruleHairline,
                  backgroundColor: t.surfacePaper,
                  shadowColor: t.inkStrong,
                },
              ]}
            >
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      onChange(option.id);
                      onOpenChange(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label}, ${label.toLowerCase()} filter`}
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor:
                          pressed || isSelected ? alpha(t.surfaceSoft, 0.72) : t.surfacePaper,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: t.inkStrong }]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <CheckCircle size={17} weight="fill" color={t.surfaceAnchor} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0 },
  trigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  triggerText: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontFamily: sans(500), fontSize: 9.5 },
  value: { fontFamily: sans(600), fontSize: 11.5 },
  modalRoot: { flex: 1 },
  menu: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 10,
    padding: MENU_PADDING,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  option: {
    minHeight: MENU_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionText: { flex: 1, fontFamily: sans(500), fontSize: 13 },
});
