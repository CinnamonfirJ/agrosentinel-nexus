import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Linking,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../components/button";
import { Rise, PressableScale, Pulse } from "../components/motion";
import { queueCapture } from "../queue";
import { getConnection } from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { colors, fonts } from "../theme";

const CROPS = [
  "Tomato",
  "Maize",
  "Wheat",
  "Rice",
  "Coffee",
  "Cassava",
  "Sorghum",
  "Other",
];

function Back() {
  return (
    <PressableScale
      onPress={() => router.back()}
      style={s.back}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={s.backGlyph}>←</Text>
    </PressableScale>
  );
}

/** Corner brackets breathe and a scan line sweeps the leaf guide. */
function Guide() {
  const sweep = useState(() => new Animated.Value(0))[0];
  const breathe = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sweep, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    ];
    AccessibilityInfo.isReduceMotionEnabled().then(
      (r) => !r && loops.forEach((l) => l.start()),
    );
    return () => loops.forEach((l) => l.stop());
  }, [sweep, breathe]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.guide,
        {
          transform: [
            {
              scale: breathe.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.04],
              }),
            },
          ],
        },
      ]}
    >
      {[s.tl, s.tr, s.bl, s.br].map((c, i) => (
        <View key={i} style={[s.corner, c]} />
      ))}
      <Animated.View
        style={[
          s.scan,
          {
            transform: [
              {
                translateY: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 236],
                }),
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

export default function Capture() {
  const { region = "kaduna" } = useLocalSearchParams<{ region: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const flash = useState(() => new Animated.Value(0))[0];
  const [uri, setUri] = useState(""),
    [note, setNote] = useState(""),
    [crop, setCrop] = useState("Tomato"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [location, setLocation] = useState<
    { lat: number; lon: number } | undefined
  >();
  const [dataSaver, setDataSaver] = useState(true);
  useEffect(() => {
    getConnection()
      .then(async (c) => {
        if (c) {
          const text = await AsyncStorage.getItem("preferences-" + c.user.id);
          if (text) setDataSaver(JSON.parse(text).data_saver ?? true);
        }
      })
      .catch(() => {});
  }, []);

  async function capture() {
    setBusy(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start();
    try {
      const photo = await camera.current?.takePictureAsync();
      if (photo) {
        const context = ImageManipulator.manipulate(photo.uri);
        const edge = dataSaver ? 768 : 1024;
        context.resize(
          photo.width >= photo.height
            ? { width: Math.min(edge, photo.width) }
            : { height: Math.min(edge, photo.height) },
        );
        const rendered = await context.renderAsync();
        const image = await rendered.saveAsync({
          compress: dataSaver ? 0.45 : 0.6,
          format: SaveFormat.JPEG,
        });
        setUri(image.uri);
      }
    } catch {
      setError("Camera capture failed. Try again or import a photo.");
    } finally {
      setBusy(false);
    }
  }
  async function pick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
      });
      if (!result.canceled) {
        const context = ImageManipulator.manipulate(result.assets[0].uri);
        const asset = result.assets[0];
        const edge = dataSaver ? 768 : 1024;
        context.resize(
          asset.width >= asset.height
            ? { width: Math.min(edge, asset.width) }
            : { height: Math.min(edge, asset.height) },
        );
        const image = await context.renderAsync();
        const saved = await image.saveAsync({
          compress: dataSaver ? 0.45 : 0.6,
          format: SaveFormat.JPEG,
        });
        setUri(saved.uri);
      }
    } catch {
      setError("Photo import failed. Check photo permissions.");
    }
  }
  async function save() {
    setBusy(true);
    try {
      const item = await queueCapture(uri, crop, note, region, location);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      router.replace({
        pathname: "/analyze",
        params: { id: item.id, uri, crop },
      });
    } catch {
      setError("Could not save the capture. Keep this screen open and retry.");
    } finally {
      setBusy(false);
    }
  }

  if (!permission)
    return (
      <SafeAreaView style={s.safe}>
        <Text style={[s.body, { padding: 20 }]}>
          Checking camera permission…
        </Text>
      </SafeAreaView>
    );

  if (uri)
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.screen}
            keyboardShouldPersistTaps="handled"
          >
            <Rise style={s.headerRow}>
              <Back />
            </Rise>
            <Rise index={1}>
              <Text style={s.title}>Review your specimen.</Text>
            </Rise>
            <Rise index={2}>
              <View style={s.specimen}>
                <Image
                  source={{ uri }}
                  style={s.preview}
                  accessibilityLabel="Captured leaf"
                />
                <Text style={s.specMeta}>
                  {dataSaver
                    ? "768px maximum · JPEG 0.45"
                    : "1024px maximum · JPEG 0.6"}{" "}
                  · stored on device
                </Text>
              </View>
            </Rise>
            <Rise index={3}>
              <Text style={s.label}>Crop</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {CROPS.map((c) => (
                  <PressableScale
                    key={c}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setCrop(c);
                    }}
                    style={[s.chip, crop === c && s.chipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: crop === c }}
                  >
                    <Text
                      style={[
                        s.chipText,
                        crop === c && { color: colors.surface },
                      ]}
                    >
                      {c}
                    </Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </Rise>
            <Rise index={4}>
              <Text style={s.body}>
                Capture ready. Your photo is saved durably and uploaded for
                evidence-linked analysis.
              </Text>
              <Text style={s.label}>Field note</Text>
              <TextInput
                style={s.input}
                multiline
                value={note}
                onChangeText={setNote}
                placeholder="What did you observe?"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Field note"
              />
            </Rise>
            <Rise index={5}>
              <Button title="Analyze specimen" disabled={busy} onPress={save} />
              <Button
                title={
                  location
                    ? "GPS location attached"
                    : "Attach GPS for weather and regional map"
                }
                onPress={async () => {
                  try {
                    const permission =
                      await Location.requestForegroundPermissionsAsync();
                    if (permission.status !== "granted")
                      throw new Error("Location permission was not granted.");
                    const position = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced,
                    });
                    setLocation({
                      lat: position.coords.latitude,
                      lon: position.coords.longitude,
                    });
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              />
              <Button
                title={busy ? "Saving…" : "Save capture"}
                variant="lime"
                glyph="↓"
                disabled={busy}
                onPress={save}
              />
              <Button
                title="Retake"
                variant="ghost"
                disabled={busy}
                onPress={() => setUri("")}
              />
            </Rise>
            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );

  return permission.granted ? (
    <View style={s.cameraScreen}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#fff", opacity: flash },
        ]}
      />
      <SafeAreaView style={s.cameraOverlay}>
        <View style={s.headerRow}>
          <Back />
          <View style={s.camPill}>
            <Text style={s.camPillText}>LEAF CAPTURE</Text>
          </View>
        </View>
        <View style={s.guideWrap}>
          <Guide />
        </View>
        <View style={s.camBottom}>
          <Text style={s.hint}>
            Fill the frame with one leaf. Hold steady in daylight.
          </Text>
          <View style={s.shutterRow}>
            <PressableScale
              onPress={pick}
              style={s.sideBtn}
              accessibilityRole="button"
              accessibilityLabel="Import from photos"
            >
              <Text style={s.sideGlyph}>▦</Text>
            </PressableScale>
            <View style={s.shutterWrap}>
              <Pulse size={86} color={colors.lime} duration={2000} />
              <PressableScale
                onPress={capture}
                disabled={busy}
                style={s.shutter}
                scaleTo={0.86}
                accessibilityRole="button"
                accessibilityLabel={busy ? "Capturing…" : "Capture leaf"}
              >
                <View style={s.shutterInner} />
              </PressableScale>
            </View>
            <View style={s.sideBtn} />
          </View>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={[s.error, { color: "#FFB4A9", textAlign: "center" }]}
            >
              {error}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  ) : (
    <SafeAreaView style={s.safe}>
      <View style={s.screen}>
        <Rise style={s.headerRow}>
          <Back />
        </Rise>
        <Rise index={1}>
          <Text style={s.title}>A closer look starts here.</Text>
        </Rise>
        <Rise index={2}>
          <Text style={s.body}>
            Camera access lets you capture a leaf for field review. Attach
            location separately to obtain local weather and regional mapping.
          </Text>
        </Rise>
        <Rise index={3}>
          <Button
            title={
              permission.canAskAgain ? "Allow camera" : "Open device settings"
            }
            onPress={() => {
              if (permission.canAskAgain) void requestPermission();
              else void Linking.openSettings();
            }}
          />
          <Button title="Import from photos" variant="ghost" onPress={pick} />
        </Rise>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { fontSize: 20, color: colors.ink, fontFamily: fonts.medium },
  title: {
    fontSize: 36,
    lineHeight: 40,
    color: colors.ink,
    marginBottom: 20,
    fontFamily: fonts.light,
    letterSpacing: -1.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
    marginVertical: 12,
    fontFamily: fonts.regular,
  },
  label: {
    fontSize: 13,
    color: colors.secondary,
    fontFamily: fonts.medium,
    marginTop: 14,
    marginBottom: 8,
  },
  specimen: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  preview: { height: 300, width: "100%", borderRadius: 20 },
  specMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.muted,
    padding: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  error: {
    fontSize: 16,
    color: colors.critical,
    fontFamily: fonts.regular,
    marginTop: 8,
  },
  cameraScreen: { flex: 1, backgroundColor: "#000" },
  cameraOverlay: { flex: 1, padding: 20, justifyContent: "space-between" },
  camPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#0E2A1FCC",
  },
  camPillText: {
    color: colors.lime,
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  guideWrap: { alignItems: "center" },
  guide: { width: 200, height: 260, borderRadius: 100, overflow: "hidden" },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: colors.surface,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 18,
  },
  scan: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  camBottom: { gap: 18 },
  hint: {
    color: colors.surface,
    fontSize: 16,
    textAlign: "center",
    fontFamily: fonts.medium,
    backgroundColor: "#13211B99",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "center",
  },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF26",
    alignItems: "center",
    justifyContent: "center",
  },
  sideGlyph: { color: colors.surface, fontSize: 20 },
  shutterWrap: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
  },
});
