import { useState, useCallback } from "react";
import { ScrollView, Text, View, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import {
  readCaptures,
  syncQueue,
  retryCapture,
  discardCapture,
  type Capture,
} from "../queue";
import { Button } from "../components/button";
import { colors, fonts } from "../theme";
export default function Queue() {
  const [items, setItems] = useState<Capture[]>([]),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      readCaptures()
        .then(setItems)
        .catch((e) => setError(e.message)),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screen}>
        <Text style={s.title}>Sync queue.</Text>
        <Text style={s.body}>
          Images are saved in private device storage. Automatic upload retries
          stop after three failures.
        </Text>
        <Button
          title="Sync now"
          onPress={async () => {
            try {
              await syncQueue();
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        {items
          .filter(
            (i) =>
              !i.server ||
              ["failed", "awaiting_services", "invalidated"].includes(i.status),
          )
          .map((item) => (
            <View style={s.card} key={item.id}>
              <Text style={s.body}>
                {item.crop} · {item.status.replaceAll("_", " ")}
              </Text>
              <Text style={s.body}>
                {item.error ||
                  item.server?.error ||
                  `${item.attempts} upload attempts`}
              </Text>
              <Button
                title="Retry"
                onPress={async () => {
                  try {
                    await retryCapture(item.id);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
              {!item.server && (
                <Button
                  title="Discard queued photo"
                  variant="ghost"
                  onPress={() =>
                    Alert.alert(
                      "Discard capture?",
                      "This removes the unsent photo from this device.",
                      [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Discard",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await discardCapture(item.id);
                              await load();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          },
                        },
                      ],
                    )
                  }
                />
              )}
            </View>
          ))}
        {!items.length && <Text style={s.body}>No queued captures.</Text>}
        {error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
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
  screen: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.light, fontSize: 40, color: colors.ink },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
  },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
  error: { fontSize: 16, color: colors.critical },
});
