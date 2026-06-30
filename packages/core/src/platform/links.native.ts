import { Linking } from "react-native";

export async function openUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
