import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "./api";
import * as SecureStore from "expo-secure-store";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function enableNotifications() {
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!Device.isDevice)
    throw new Error("Push notifications require a physical phone.");
  if (!projectId)
    throw new Error(
      "Remote push requires an EAS project and a development or store build. In-app alerts work without it.",
    );
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Notification permission was not granted.");
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("devices", {
    method: "POST",
    body: JSON.stringify({ token: token.data }),
  });
  await SecureStore.setItemAsync("agro-push-token", token.data);
  return true;
}
