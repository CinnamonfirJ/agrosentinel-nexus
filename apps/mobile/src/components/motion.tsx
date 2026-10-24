import { useEffect, useRef, type ReactNode, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  AccessibilityInfo,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Respect the OS "reduce motion" setting everywhere. */
export function useReducedMotion() {
  const reduced = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(
      (v) => (reduced.current = v),
    );
  }, []);
  return reduced;
}

/** Rises and fades in; pass `index` to stagger siblings. */
export function Rise({
  children,
  index = 0,
  delay = 0,
  distance = 22,
  style,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) return v.setValue(1);
      Animated.timing(v, {
        toValue: 1,
        duration: 700,
        delay: delay + index * 70,
        easing: ease,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [v, index, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            {
              translateY: v.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Springy press feedback for any tappable surface. */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  ...rest
}: PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const s = useState(() => new Animated.Value(1))[0];
  const to = (value: number) =>
    Animated.spring(s, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => (to(scaleTo), rest.onPressIn?.(e))}
      onPressOut={(e) => (to(1), rest.onPressOut?.(e))}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** A ring that breathes outward forever — used for "agent live" and the capture button. */
export function Pulse({
  size,
  color,
  duration = 2200,
  style,
}: {
  size: number;
  color: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    AccessibilityInfo.isReduceMotionEnabled().then((r) => !r && loop.start());
    return () => loop.stop();
  }, [v, duration]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
          transform: [
            {
              scale: v.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.55],
              }),
            },
          ],
        },
        style,
      ]}
    />
  );
}
