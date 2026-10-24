import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import {
  useFonts,
  HankenGrotesk_300Light,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import { colors } from "../theme";
import "../background-sync";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

export default function Layout() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.content.data?.scan_id;
        if (typeof id === "string")
          router.push({ pathname: "/result", params: { scan_id: id } });
      },
    );
    return () => subscription.remove();
  }, []);
  const [loaded, error] = useFonts({
    HankenGrotesk_300Light,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  if (!loaded && !error)
    return <View style={{ flex: 1, backgroundColor: colors.dark }} />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "AgroSentinel · Field" }}
        />
        <Stack.Screen
          name="capture"
          options={{ title: "Capture a leaf", animation: "fade_from_bottom" }}
        />
        <Stack.Screen
          name="analyze"
          options={{
            title: "Agent activity",
            animation: "fade",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="result"
          options={{ title: "Field decision", animation: "slide_from_bottom" }}
        />
      </Stack>
    </>
  );
}
