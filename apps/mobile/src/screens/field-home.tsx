import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  AppState,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getConnection, api, disconnect } from "../api";
import {
  readCaptures,
  syncQueue,
  readOfflinePlans,
  type Capture,
} from "../queue";
import type { Scan } from "../../../../shared/contracts";
import { Rise, PressableScale } from "../components/motion";
import { Button } from "../components/button";
import { registerBackgroundSync } from "../background-sync";
import { colors, fonts } from "../theme";
function PlanChange({ alert }: { alert: any }) {
  if (!alert.old_plan) return null;
  let old, update;
  try {
    old = JSON.parse(alert.old_plan);
    update = JSON.parse(alert.new_plan || "{}");
  } catch {
    return (
      <Text style={s.body}>
        Open the affected scan to review the changed plan.
      </Text>
    );
  }
  const plan = update.result || update;
  const nextId = update.scan_id || update.pending_scan_id;
  return (
    <View>
      <Text style={s.meta}>PREVIOUS PLAN · INVALIDATED</Text>
      <Text style={s.body}>{old.verdict}</Text>
      <Text style={s.meta}>CURRENT STATUS · CHANGED</Text>
      <Text style={s.body}>
        {plan.verdict ||
          "Updated analysis is queued. Do not apply the previous plan."}
      </Text>
      {nextId && (
        <Button
          title="View updated analysis"
          onPress={() =>
            router.push({ pathname: "/result", params: { scan_id: nextId } })
          }
        />
      )}
    </View>
  );
}
export default function FieldHome() {
  const [items, setItems] = useState<Capture[]>([]),
    [advisory, setAdvisory] = useState<any>(null),
    [alerts, setAlerts] = useState<any[]>([]),
    [assignments, setAssignments] = useState<any[]>([]),
    [offline, setOffline] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [region, setRegion] = useState("kaduna");
  const [remote, setRemote] = useState<Scan[]>([]);
  const [regionCatalog, setRegionCatalog] = useState<
    { id: string; label: string }[]
  >([{ id: "kaduna", label: "Kaduna" }]);
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const c = await getConnection();
      if (!c) {
        router.replace("/connect");
        return;
      }
      setName(c.user.name);
      const cachedRegions = await AsyncStorage.getItem("regions-" + c.user.id);
      if (cachedRegions) setRegionCatalog(JSON.parse(cachedRegions));
      const cachedAssignments = await AsyncStorage.getItem(
        "assignments-" + c.user.id,
      );
      if (cachedAssignments) setAssignments(JSON.parse(cachedAssignments));
      const cachedAlerts = await AsyncStorage.getItem("alerts-" + c.user.id);
      if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
      setItems(await readCaptures());
      setRemote(await readOfflinePlans());
      const network = await Network.getNetworkStateAsync();
      setOffline(!network.isConnected);
      const cached = await AsyncStorage.getItem("advisory-" + region);
      if (cached) setAdvisory(JSON.parse(cached));
      if (network.isConnected) {
        const regions = await api("regions");
        const settings = await api("settings");
        await AsyncStorage.setItem(
          "preferences-" + c.user.id,
          JSON.stringify(settings.preferences),
        );
        setRegionCatalog(regions);
        await AsyncStorage.setItem(
          "regions-" + c.user.id,
          JSON.stringify(regions),
        );
        await syncQueue();
        setItems(await readCaptures());
        const a = await api("advisory?region=" + region);
        setAdvisory(a);
        await AsyncStorage.setItem("advisory-" + region, JSON.stringify(a));
        const notices = await api("alerts");
        setAlerts(notices);
        await AsyncStorage.setItem(
          "alerts-" + c.user.id,
          JSON.stringify(notices.slice(0, 5)),
        );
        const tasks = await api("assignments");
        setAssignments(tasks);
        await AsyncStorage.setItem(
          "assignments-" + c.user.id,
          JSON.stringify(tasks),
        );
        setRemote(await api<Scan[]>("scans"));
        setError("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [region]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOffline(!state.isConnected);
      if (state.isConnected) void refresh();
    });
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      subscription.remove();
      app.remove();
    };
  }, [refresh]);
  useEffect(() => {
    registerBackgroundSync().catch(() => {});
  }, []);
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.screen}
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={refresh} />
        }
      >
        <Rise>
          <View style={s.top}>
            <Text style={s.brand}>
              agrosentinel<Text style={s.nexus}> NEXUS</Text>
            </Text>
            <PressableScale
              accessibilityRole="button"
              onPress={() => router.push("/queue")}
            >
              <Text style={s.meta}>
                {offline ? "Offline" : "Connected"} ·{" "}
                {items.filter((i) => !i.server).length} queued
              </Text>
            </PressableScale>
          </View>
        </Rise>
        <Rise index={1}>
          <Text style={s.eyebrow}>
            {region.toUpperCase()} · {name}
          </Text>
          <Text style={s.title}>Your field,{`\n`}in focus.</Text>
        </Rise>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {regionCatalog.map(({ id, label }) => (
            <PressableScale
              key={id}
              onPress={() => setRegion(id)}
              accessibilityRole="button"
              style={{
                padding: 12,
                borderWidth: 1,
                borderRadius: 8,
                borderColor: colors.border,
                backgroundColor: region === id ? colors.surface : colors.canvas,
              }}
            >
              <Text style={s.body}>{label}</Text>
            </PressableScale>
          ))}
        </View>
        {offline && (
          <View style={s.warning}>
            <Text style={s.body}>
              Offline · cached regional advisory. Captures remain on this device
              until the app reconnects.
            </Text>
          </View>
        )}
        {error && (
          <Text style={s.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <Rise index={2} style={s.advisory}>
          <Text style={s.lightLabel}>
            REGIONAL ADVISORY{offline ? " · CACHED" : ""}
          </Text>
          <Text style={s.advisoryTitle}>
            {advisory?.title ||
              "No analyzed field evidence in this region yet."}
          </Text>
          <Text style={s.light}>
            {advisory?.updated
              ? "Updated " + new Date(advisory.updated * 1000).toLocaleString()
              : "Awaiting first grounded scan"}
          </Text>
          {advisory?.sources?.map((source: any) => (
            <Text key={source.id} selectable style={s.light}>
              {source.title} · {source.provider} ·{" "}
              {new Date(source.retrieved * 1000).toLocaleString()}
              {"\n"}
              {source.url}
            </Text>
          ))}
          {advisory?.scan_id && (
            <Button
              title="View evidence"
              onPress={() =>
                router.push({
                  pathname: "/result",
                  params: { scan_id: advisory.scan_id },
                })
              }
            />
          )}
        </Rise>
        {assignments
          .filter((a) => a.status !== "completed")
          .map((a) => (
            <View key={a.id} style={s.warning}>
              <Text style={s.heading}>Field inspection · {a.region}</Text>
              <Text selectable style={s.body}>
                {a.cluster_key.split(":").join(" · ")}
              </Text>
              <Text style={s.body}>
                {a.note ||
                  "Inspect the assigned area and capture a new leaf sample."}
              </Text>
              <Text style={s.meta}>
                {a.status} · {new Date(a.created * 1000).toLocaleString()}
              </Text>
              <Button
                title={
                  a.status === "assigned"
                    ? "Accept inspection"
                    : "Mark inspection complete"
                }
                disabled={offline}
                onPress={async () => {
                  try {
                    await api("assignments/" + a.id + "/status", {
                      method: "POST",
                      body: JSON.stringify({
                        status:
                          a.status === "assigned" ? "accepted" : "completed",
                      }),
                    });
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </View>
          ))}
        {alerts
          .filter((a) => !a.acknowledged)
          .slice(0, 5)
          .map((a) => (
            <View key={a.id} style={s.warning}>
              <Text style={s.heading}>{a.title}</Text>
              <Text style={s.body}>{a.body}</Text>
              <PlanChange alert={a} />
              {a.scan_id && (
                <Button
                  title="View plan"
                  onPress={() =>
                    router.push({
                      pathname: "/result",
                      params: { scan_id: a.scan_id },
                    })
                  }
                />
              )}
              <Button
                title="Acknowledge"
                onPress={async () => {
                  try {
                    await api("alerts/" + a.id + "/acknowledge", {
                      method: "POST",
                    });
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </View>
          ))}
        <Text style={s.heading}>Recent captures</Text>
        {items.length ? (
          items.slice(0, 20).map((item) => (
            <PressableScale
              accessibilityRole="button"
              key={item.id}
              onPress={() =>
                router.push({
                  pathname:
                    item.server?.status === "complete" ||
                    item.server?.status === "invalidated"
                      ? "/result"
                      : "/analyze",
                  params: { id: item.id, uri: item.uri, crop: item.crop },
                })
              }
              style={s.row}
            >
              <View>
                <Text style={s.body}>
                  {item.crop} ·{" "}
                  {item.server?.result?.diagnosis.disease ||
                    item.status.replaceAll("_", " ")}
                </Text>
                <Text style={s.meta}>
                  {new Date(item.created).toLocaleString()}
                </Text>
              </View>
            </PressableScale>
          ))
        ) : (
          <Text style={s.body}>
            No captures yet. Scan your first leaf to begin.
          </Text>
        )}
        {remote
          .filter((scan) => !items.some((item) => item.server?.id === scan.id))
          .slice(0, 20)
          .map((scan) => (
            <PressableScale
              accessibilityRole="button"
              key={scan.id}
              style={s.row}
              onPress={() =>
                router.push({
                  pathname: "/result",
                  params: { scan_id: scan.id },
                })
              }
            >
              <View>
                <Text style={s.body}>
                  {scan.crop} ·{" "}
                  {scan.result?.diagnosis.disease ||
                    scan.status.replaceAll("_", " ")}
                </Text>
                <Text style={s.meta}>
                  {new Date(scan.created * 1000).toLocaleString()}
                </Text>
              </View>
            </PressableScale>
          ))}
        <Button
          title="Scan a leaf"
          onPress={() =>
            router.push({ pathname: "/capture", params: { region } })
          }
        />
        <Button
          title="Sync queue"
          variant="ghost"
          onPress={() => router.push("/queue")}
        />
        <Button
          title="Enable notifications"
          variant="ghost"
          onPress={async () => {
            try {
              await (await import("../notifications")).enableNotifications();
              setError("Notifications enabled.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        <Button
          title="Reconnect workspace"
          variant="ghost"
          onPress={() => router.push("/connect")}
        />
        <Button
          title="Sign out"
          variant="ghost"
          onPress={async () => {
            try {
              await disconnect();
            } catch {
              // disconnect always clears this device's credentials, even offline.
            } finally {
              router.replace("/connect");
            }
          }}
        />
        <Text style={s.meta}>
          Model results require both configured Nebius and Tavily accounts. No
          sample diagnoses or substitute models.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { padding: 20, paddingBottom: 40, gap: 14 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontFamily: fonts.semibold, fontSize: 21, color: colors.forest },
  nexus: { fontSize: 10, letterSpacing: 2 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.forest,
  },
  title: {
    fontFamily: fonts.light,
    fontSize: 46,
    lineHeight: 48,
    color: colors.ink,
    marginTop: 10,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  heading: {
    fontFamily: fonts.medium,
    fontSize: 22,
    color: colors.ink,
    marginTop: 16,
  },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.line },
  advisory: {
    backgroundColor: colors.dark,
    borderRadius: 26,
    padding: 24,
    gap: 14,
    marginTop: 12,
  },
  lightLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.surface,
  },
  advisoryTitle: {
    fontFamily: fonts.light,
    fontSize: 26,
    lineHeight: 32,
    color: colors.surface,
  },
  light: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: "#E9EEE9",
  },
  warning: {
    backgroundColor: colors.warningFill,
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  error: { fontFamily: fonts.regular, fontSize: 16, color: colors.critical },
});
