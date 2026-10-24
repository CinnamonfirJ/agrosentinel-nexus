import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  syncQueue,
  refreshCapture,
  readCaptures,
  retryCapture,
  type Capture,
} from "../queue";
import { Button } from "../components/button";
import { Rise } from "../components/motion";
import { Filament } from "../components/filament";
import { colors, fonts } from "../theme";
export default function Analyze() {
  const { id, uri } = useLocalSearchParams<{ id: string; uri: string }>();
  const [capture, setCapture] = useState<Capture | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    let running = false;
    async function check() {
      if (running) return;
      running = true;
      try {
        await syncQueue();
        const item =
          (await refreshCapture(id)) ||
          (await readCaptures()).find((x) => x.id === id);
        if (alive && item) {
          setCapture(item);
          if (
            item.server?.status === "complete" ||
            item.server?.status === "invalidated"
          ) {
            AccessibilityInfo.announceForAccessibility(
              item.server.result?.verdict || "Analysis complete",
            );
            router.replace({ pathname: "/result", params: { id } });
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        running = false;
      }
    }
    void check();
    const timer = setInterval(check, 2500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);
  const scan = capture?.server;
  const active = scan?.status === "analyzing" || scan?.status === "queued";
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screen}>
        <Rise>
          <Text style={s.eyebrow}>
            AGENT ACTIVITY ·{" "}
            {scan?.status.replaceAll("_", " ").toUpperCase() ||
              "QUEUED ON DEVICE"}
          </Text>
        </Rise>
        <View style={s.stage}>
          {uri && (
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Your leaf specimen"
            />
          )}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "#0E2A1F99" }]}
          />
          {active && (
            <Filament
              width={320}
              height={300}
              seed={21}
              veins={5}
              density={70}
            />
          )}
        </View>
        {[
          "Visual triage",
          "Tavily weather and market grounding",
          "Evidence-linked decision",
        ].map((label, i) => (
          <View style={s.step} key={label}>
            <Text style={s.icon}>{scan && scan.stage > i ? "✓" : i + 1}</Text>
            <Text style={s.body}>
              {label}
              {active && scan?.stage === i
                ? " · running"
                : scan && scan.stage > i
                  ? " · complete"
                  : " · waiting"}
            </Text>
          </View>
        ))}
        {scan?.status === "awaiting_services" && (
          <View style={s.warning}>
            <Text style={s.body}>
              Capture uploaded and stored. Waiting for required Nebius, Tavily
              and model configuration. No diagnosis has been generated.
            </Text>
          </View>
        )}
        {(error || capture?.error || scan?.error) && (
          <Text accessibilityRole="alert" style={s.error}>
            {error || capture?.error || scan?.error}
          </Text>
        )}
        {["failed", "awaiting_services", "invalidated"].includes(
          scan?.status || "",
        ) && (
          <Button
            title="Retry analysis"
            onPress={async () => {
              try {
                await retryCapture(id);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
        )}
        <Text style={s.body}>
          Progress reflects actual backend activity. You can leave this screen;
          uploaded work continues on the server.
        </Text>
        <Button
          title="Back to field home"
          variant="ghost"
          onPress={() => router.replace("/")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { padding: 20, gap: 20 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.forest,
  },
  stage: {
    height: 300,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.dark,
  },
  step: { flexDirection: "row", gap: 14, alignItems: "center" },
  icon: { fontSize: 20, color: colors.forest },
  body: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
  },
  warning: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.warningFill,
  },
  error: { fontSize: 16, color: colors.critical },
});
