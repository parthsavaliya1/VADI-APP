import { getThemeKey, type ThemeKey } from "@/constants/theme";
import { useEffect, useMemo , useState } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";

const SEASONS = ["winter", "summer", "monsoon"] as const;
type Season = (typeof SEASONS)[number];

function isSeason(key: ThemeKey): key is Season {
  return (SEASONS as readonly string[]).includes(key);
}

function Particle({
  season,
  index,
  height,
}: {
  season: Season;
  index: number;
  height: number;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const left = (index * 37) % 100;
  const delay = (index * 220) % 1800;
  const duration =
    season === "monsoon"
      ? 700 + (index % 5) * 140
      : season === "winter"
        ? 7000 + (index % 6) * 900
        : 8000;
  const size = season === "monsoon" ? 5 + (index % 3) : 14 + (index % 5) * 3;
  const drift = index % 2 === 0 ? 22 : -22;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, duration, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, height + 30],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: season === "monsoon" ? [10, -8, -28] : [0, drift, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (season === "winter") {
    return (
      <Animated.Text
        style={{
          position: "absolute",
          left: `${left}%`,
          top: 0,
          fontSize: size,
          color: "#F4FAFF",
          textShadowColor: "rgba(40, 80, 120, 0.45)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
          transform: [{ translateY }, { translateX }, { rotate }],
        }}
      >
        ❄
      </Animated.Text>
    );
  }

  if (season === "summer") return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${left}%`,
        top: 0,
        width: size,
        height: size,
        backgroundColor: "rgba(70, 168, 214, 0.82)",
        borderTopLeftRadius: size,
        borderTopRightRadius: size,
        borderBottomLeftRadius: size,
        borderBottomRightRadius: 1,
        transform: [{ translateY }, { translateX }, { rotate: "45deg" }],
      }}
    />
  );
}

/**
 * Snowflakes, raindrops or a sun for Winter, Summer and Monsoon.
 * Chosen in Admin → Theme. Touches pass through.
 */
export default function SeasonalAtmosphere() {
  const key = getThemeKey();
  const { height } = useWindowDimensions();
  const count = key === "monsoon" ? 12 : key === "winter" ? 22 : 0;
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  if (!isSeason(key)) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      {key === "summer" && <View style={styles.sun} />}
      {pieces.map((index) => (
        <Particle key={index} season={key} index={index} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sun: {
    position: "absolute",
    top: -36,
    right: -24,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,186,48,0.32)",
  },
});
