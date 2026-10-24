import { Text, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { PressableScale } from "./motion";
import { colors, fonts, theme } from "../theme";

/** The pill with a round nub, the reference's signature control. */
export function Button({
  title,
  onPress,
  disabled = false,
  variant = "primary",
  glyph = "→",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "lime" | "ghost";
  glyph?: string | null;
}) {
  const primary = variant === "primary";
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={title}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[
        styles.button,
        variant === "lime" && styles.lime,
        variant === "ghost" && styles.ghost,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={[styles.text, !primary && { color: colors.ink }]}>
        {title}
      </Text>
      {glyph && variant !== "ghost" ? (
        <View
          style={[styles.nub, !primary && { backgroundColor: colors.forest }]}
        >
          <Text style={[styles.glyph, !primary && { color: colors.lime }]}>
            {glyph}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    backgroundColor: colors.forest,
    borderRadius: theme.radius.pill,
    paddingLeft: 24,
    paddingRight: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  lime: { backgroundColor: colors.lime },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingRight: 24,
  },
  text: { color: colors.surface, fontSize: 16, fontFamily: fonts.medium },
  nub: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { fontSize: 18, color: colors.ink, fontFamily: fonts.semibold },
});
