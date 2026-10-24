import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  AccessibilityInfo,
} from "react-native";

/**
 * Native take on the web filament: moss-like specks along curving veins.
 * Each vein is one animated layer (sway + grow-in), so it stays cheap on low-end phones.
 */
const PALETTE = ["#3F7A4F", "#6FA35A", "#A6CF5F", "#D4F36B", "#EAF9B5"];

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
function bez(p: number[], t: number) {
  const u = 1 - t;
  return [
    u * u * u * p[0] +
      3 * u * u * t * p[2] +
      3 * u * t * t * p[4] +
      t * t * t * p[6],
    u * u * u * p[1] +
      3 * u * u * t * p[3] +
      3 * u * t * t * p[5] +
      t * t * t * p[7],
  ];
}

export function Filament({
  width,
  height,
  seed = 4,
  veins = 4,
  density = 70,
}: {
  width: number;
  height: number;
  seed?: number;
  veins?: number;
  density?: number;
}) {
  const layers = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: veins }, () => {
      const sx = r(),
        ex = r();
      const p = [
        sx,
        1.05,
        sx - 0.3 + r() * 0.6,
        0.7,
        ex - 0.3 + r() * 0.6,
        0.35,
        ex,
        -0.05,
      ];
      const freq = 5 + r() * 6,
        phase = r() * 6;
      return Array.from({ length: density }, () => {
        const t = r();
        const [x, y] = bez(p, t);
        const off =
          (r() + r() + r() - 1.5) * 0.05 + Math.sin(t * freq + phase) * 0.03;
        return {
          x: (x + off) * width,
          y: y * height,
          s: 1 + r() * r() * 3,
          c: PALETTE[Math.min(4, Math.floor(r() * r() * 5))],
          o: 0.35 + r() * 0.65,
        };
      });
    });
  }, [width, height, seed, veins, density]);

  const sway = useState(() => layers.map(() => new Animated.Value(0)))[0];
  const grow = useState(() => layers.map(() => new Animated.Value(0)))[0];
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        grow.forEach((g) => g.setValue(1));
        return;
      }
      Animated.stagger(
        180,
        grow.map((g) =>
          Animated.timing(g, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ).start();
      loops = sway.map((v, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, {
              toValue: 1,
              duration: 3200 + i * 500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: -1,
              duration: 3200 + i * 500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ),
      );
      loops.forEach((l) => l.start());
    });
    return () => loops.forEach((l) => l.stop());
  }, [grow, sway]);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
      accessible={false}
    >
      {layers.map((dots, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: grow[i],
              transform: [
                {
                  translateX: sway[i].interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-6, 6],
                  }),
                },
                {
                  translateY: grow[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [height * 0.15, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {dots.map((d, j) => (
            <View
              key={j}
              style={{
                position: "absolute",
                left: d.x,
                top: d.y,
                width: d.s,
                height: d.s,
                borderRadius: d.s,
                backgroundColor: d.c,
                opacity: d.o,
              }}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}
