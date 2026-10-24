import { useState } from "react";
import { ScrollView, Text, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { connect, signIn, suggestedServer } from "../api";
import { Button } from "../components/button";
import { colors, fonts } from "../theme";
export default function Connect() {
  const [server, setServer] = useState(suggestedServer()),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [payload, setPayload] = useState(""),
    [scanning, setScanning] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [permission, request] = useCameraPermissions();
  async function pair(text: string) {
    setBusy(true);
    try {
      const data = JSON.parse(text);
      await connect(data.server, data.code);
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
      setScanning(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.screen}>
        <Text style={s.title}>Connect your field.</Text>
        <Text style={s.body}>
          Open Dashboard → Settings on your laptop, generate a pairing QR, then
          scan it here. Both devices must be able to reach the same workspace
          address.
        </Text>
        {scanning && permission?.granted ? (
          <CameraView
            style={{ height: 300 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              busy
                ? undefined
                : (event) => {
                    setScanning(false);
                    void pair(event.data);
                  }
            }
          />
        ) : (
          <Button
            title="Scan workspace pairing QR"
            onPress={async () => {
              if (!permission?.granted) await request();
              setScanning(true);
            }}
          />
        )}
        <Text style={s.body}>Or paste the single-use pairing value</Text>
        <TextInput
          style={s.input}
          multiline
          value={payload}
          onChangeText={setPayload}
          accessibilityLabel="Pairing value"
        />
        <Button
          title="Pair this device"
          disabled={busy || !payload}
          onPress={() => pair(payload)}
        />
        <Text style={s.body}>Or sign in directly</Text>
        <TextInput
          style={s.input}
          value={server}
          onChangeText={setServer}
          autoCapitalize="none"
          accessibilityLabel="Workspace URL"
          placeholder="https://your-workspace"
        />
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Email"
          placeholder="Email"
        />
        <TextInput
          style={s.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Password"
          placeholder="Password"
        />
        <Button
          title={busy ? "Connecting…" : "Sign in"}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await signIn(server, email, password);
              router.replace("/");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
        {error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { padding: 20, gap: 14 },
  title: { fontFamily: fonts.light, fontSize: 40, color: colors.ink },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    color: colors.ink,
  },
  error: { fontSize: 16, color: colors.critical },
});
