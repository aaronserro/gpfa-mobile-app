import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard } from 'react-native';

import { useReducedMotion } from './useReducedMotion';

type CloseAction = () => void;

/** Coordinates a bottom sheet's entrance and exit before its parent unmounts it. */
export function useSheetTransition(defaultClose: CloseAction, measuredHeight: number) {
  const progress = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(defaultClose);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    closeRef.current = defaultClose;
  }, [defaultClose]);

  useEffect(() => {
    if (!measuredHeight) return;

    if (reducedMotion) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [measuredHeight, progress, reducedMotion]);

  const requestClose = useCallback((afterClose?: CloseAction) => {
    if (closingRef.current) return;

    Keyboard.dismiss();
    closingRef.current = true;
    setClosing(true);
    const finish = afterClose ?? closeRef.current;

    if (reducedMotion || !measuredHeight) {
      finish();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => finish());
  }, [measuredHeight, progress, reducedMotion]);

  return { closing, progress, requestClose };
}
