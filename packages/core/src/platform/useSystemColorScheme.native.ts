import { useColorScheme } from "react-native";

export function useSystemColorScheme(): "light" | "dark" {
  return useColorScheme() === "dark" ? "dark" : "light";
}
