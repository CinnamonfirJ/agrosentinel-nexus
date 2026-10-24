import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  Share,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { readCaptures, readOfflinePlans, saveOfflinePlan } from "../queue";
import { api, getConnection } from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "../components/button";
import { Rise, PressableScale } from "../components/motion";
import { colors, fonts } from "../theme";
import type { Scan, Receipt } from "../../../../shared/contracts";
export default function Result() {
  const { id, scan_id } = useLocalSearchParams<{
    id?: string;
    scan_id?: string;
  }>();
  const [scan, setScan] = useState<Scan | null>(null),
    [error, setError] = useState(""),
    [offline, setOffline] = useState(false),
    [trace, setTrace] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [saved, setSaved] = useState(false),
    [defaultCost, setDefaultCost] = useState(""),
    [planCost, setPlanCost] = useState("");
  const [currency, setCurrency] = useState("USD"),
    [units, setUnits] = useState("metric");
  useEffect(() => {
    getConnection()
      .then(async (c) => {
        if (c) {
          const text = await AsyncStorage.getItem("preferences-" + c.user.id);
          if (text) {
            const p = JSON.parse(text);
            setCurrency(p.currency || "USD");
            setUnits(p.units || "metric");
          }
        }
      })
      .catch(() => {});
  }, []);
  const load = useCallback(async () => {
    try {
      const local = id ? (await readCaptures()).find((x) => x.id === id) : null;
      const sid = scan_id || local?.server?.id;
      if (!sid) throw new Error("This scan has not been analyzed yet.");
      const cached =
        (await readOfflinePlans()).find((s) => s.id === sid) || local?.server;
      if (cached) setScan(cached);
      try {
        const result = await api<Scan>("scans/" + sid);
        setScan(result);
        setOffline(false);
        await saveOfflinePlan(result);
      } catch (e) {
        if (!cached) throw e;
        setOffline(true);
        setError((e as Error).message);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, scan_id]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const status = scan?.status;
  useEffect(() => {
    if (
      !status ||
      !["queued", "analyzing", "awaiting_services"].includes(status)
    )
      return;
    const timer = setInterval(
      () => void load(),
      status === "awaiting_services" ? 15000 : 2500,
    );
    return () => clearInterval(timer);
  }, [status, load]);
  const p = scan?.result;
  const weather = (p?.weather as { current?: Record<string, any> } | null)
    ?.current;
  const text = p
    ? [
        p.verdict,
        p.rationale,
        ...p.steps.map((s, i) => `${i + 1}. ${s.action}`),
        ...(scan?.sources || []).map((s) => s.url),
      ].join("\n")
    : "";
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screen}>
        <Button
          title="Back to field home"
          variant="ghost"
          onPress={() => router.replace("/")}
        />
        {offline && (
          <View style={s.warning}>
            <Text style={s.body}>
              Cached plan · offline. Verify current weather before applying any
              previous treatment advice.
            </Text>
          </View>
        )}
        {error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        {p && scan ? (
          <>
            {scan.revision_id && (
              <Button
                title="View updated plan"
                onPress={() =>
                  router.replace({
                    pathname: "/result",
                    params: { scan_id: scan.revision_id },
                  })
                }
              />
            )}
            <Rise>
              <Text style={s.eyebrow}>
                VISUAL HYPOTHESIS · {Math.round(p.diagnosis.confidence * 100)}%
                MODEL CONFIDENCE
              </Text>
              <Text style={s.title}>{p.diagnosis.disease}</Text>
            </Rise>
            <View style={s.warning}>
              <Text style={s.verdict}>
                {scan.status === "invalidated"
                  ? "Weather changed. Do not apply this old plan."
                  : p.verdict}
              </Text>
            </View>
            <Text style={s.body}>{p.rationale}</Text>
            {weather && (
              <View style={s.card}>
                <Text style={s.verdict}>Reported weather</Text>
                <Text style={s.body}>
                  {units === "imperial"
                    ? `${((weather.temperature_2m * 9) / 5 + 32).toFixed(1)} °F · ${(weather.wind_speed_10m / 1.609344).toFixed(1)} mph wind`
                    : `${weather.temperature_2m} °C · ${weather.wind_speed_10m} km/h wind`}
                </Text>
                <Text style={s.mono}>{weather.time} UTC · Open-Meteo</Text>
                <Button
                  title="Weather source"
                  variant="ghost"
                  onPress={() =>
                    setReceipt(
                      scan.sources?.find((s) => s.provider === "Open-Meteo") ||
                        null,
                    )
                  }
                />
              </View>
            )}
            {!p.grounded && (
              <Text style={s.body}>
                Not fully grounded against live weather and prices. Review
                missing evidence.
              </Text>
            )}
            <View style={s.card}>
              {p.steps.map((step, i) => (
                <View key={i}>
                  <Text style={s.body}>
                    {i + 1}. {step.action}
                  </Text>
                  {step.source_ids.map((sourceId) => (
                    <Button
                      key={sourceId}
                      title="Open source receipt"
                      variant="ghost"
                      onPress={async () => {
                        try {
                          setReceipt(
                            (scan.sources || []).find(
                              (s) => s.id === sourceId,
                            ) || (await api("sources/" + sourceId)),
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
            {p.warnings.map((w, i) => (
              <Text key={i} style={s.body}>
                {w}
              </Text>
            ))}
            <Text style={s.mono}>
              Triage: {p.diagnosis.model}
              {"\n"}Plan: {p.model}
            </Text>
            <Text style={s.mono}>
              Analyzed {new Date(p.created * 1000).toLocaleString()}
            </Text>
            <PressableScale
              onPress={() => setTrace(!trace)}
              accessibilityRole="button"
              accessibilityState={{ expanded: trace }}
              style={s.traceHead}
            >
              <Text style={s.body}>
                Agent activity · {scan.events?.length || 0} events
              </Text>
            </PressableScale>
            {trace &&
              scan.events?.map((e) => (
                <Text key={e.id} style={s.mono}>
                  {new Date(e.created * 1000).toLocaleTimeString()} ·{" "}
                  {String(e.payload.message || e.payload.query || e.kind)}
                </Text>
              ))}
            {(scan.sources || []).map((s) => (
              <Button
                key={s.id}
                title={`${s.provider} · ${s.kind}`}
                variant="ghost"
                onPress={() => setReceipt(s)}
              />
            ))}
            {receipt && (
              <View style={s.card}>
                <Text style={s.verdict}>{receipt.title}</Text>
                <Text style={s.mono}>
                  {receipt.query}
                  {"\n"}Retrieved{" "}
                  {new Date(receipt.retrieved * 1000).toLocaleString()}
                </Text>
                <Text style={s.body}>{receipt.content}</Text>
                <Button
                  title="Open original source"
                  onPress={() => {
                    if (receipt.url.startsWith("https://"))
                      void Linking.openURL(receipt.url);
                  }}
                />
                <Button
                  title="Close receipt"
                  variant="ghost"
                  onPress={() => setReceipt(null)}
                />
              </View>
            )}
            <Button
              title={saved ? "Saved for offline" : "Save plan offline"}
              onPress={async () => {
                try {
                  await saveOfflinePlan(scan);
                  setSaved(true);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
            <Button
              title="Share plan"
              variant="ghost"
              onPress={() => {
                void Share.share({ message: text });
              }}
            />
            {scan.status === "invalidated" && (
              <Button
                title="Request updated analysis"
                onPress={async () => {
                  try {
                    const revision = await api("scans/" + scan.id + "/retry", {
                      method: "POST",
                    });
                      router.replace({pathname:"/result", params:{scan_id:revision.scan_id || scan.id}});
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            )}
            <View style={s.card}>
              <Text style={s.verdict}>Cost comparison</Text>
              {p.economics && (
                <Text style={s.body}>
                  {p.economics.currency} {p.economics.saving} estimated saving ·{" "}
                  {p.economics.method}
                </Text>
              )}
              <Text style={s.body}>Default treatment cost ({currency})</Text>
              <TextInput
                keyboardType="decimal-pad"
                style={s.input}
                accessibilityLabel="Default cost"
                value={defaultCost}
                onChangeText={setDefaultCost}
              />
              <Text style={s.body}>Plan cost ({currency})</Text>
              <TextInput
                keyboardType="decimal-pad"
                style={s.input}
                accessibilityLabel="Plan cost"
                value={planCost}
                onChangeText={setPlanCost}
              />
              <Button
                title="Save cost estimate"
                onPress={async () => {
                  try {
                    if (!defaultCost.trim() || !planCost.trim())
                      throw new Error(
                        "Enter both costs before saving an estimate.",
                      );
                    await api("scans/" + scan.id + "/economics", {
                      method: "POST",
                      body: JSON.stringify({
                        default_cost: Number(defaultCost),
                        plan_cost: Number(planCost),
                        currency,
                      }),
                    });
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </View>
          </>
        ) : (
          <Text style={s.body}>
            {scan
              ? "No completed decision is available for this scan."
              : "Loading scan…"}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { padding: 20, gap: 16, paddingBottom: 40 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.forest,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: fonts.light,
    color: colors.ink,
  },
  verdict: {
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  warning: {
    backgroundColor: colors.warningFill,
    padding: 18,
    borderRadius: 14,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  traceHead: {
    minHeight: 56,
    justifyContent: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  error: { fontSize: 16, color: colors.critical },
  input: {
    fontSize: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
});
