import { Platform, View, useColorScheme } from "react-native";
import { colors, neoShadow } from "@aaram/config";
import type { NeoSurfaceProps } from "./NeoSurface.types";

const VARIANT_SHADOW = {
  out: neoShadow.out,
  "out-sm": neoShadow.outSm,
  in: neoShadow.in,
} as const;

// RN has no multi-shadow box-shadow equivalent on iOS, and Android's
// `elevation` only renders a single, uncolored shadow — so "out"/"out-sm"
// are approximated on iOS by stacking a light and a dark single-direction
// shadow behind the surface, and on Android by falling back to elevation
// alone (closest available, not a true dual-tone neumorphic shadow).
export function NeoSurface({
  children,
  variant = "out",
  radius = 16,
  style,
}: NeoSurfaceProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const palette = colors[scheme];
  const { offset, blur } = VARIANT_SHADOW[variant];
  const inset = variant === "in";

  if (Platform.OS === "android") {
    return (
      <View
        style={[
          {
            backgroundColor: palette.background,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: inset ? 0 : offset,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: radius }, style]}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          backgroundColor: palette.background,
          shadowColor: inset ? "transparent" : palette.neoDark,
          shadowOffset: { width: offset, height: offset },
          shadowOpacity: inset ? 0 : 1,
          shadowRadius: blur / 2,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          shadowColor: inset ? "transparent" : palette.neoLight,
          shadowOffset: { width: -offset, height: -offset },
          shadowOpacity: inset ? 0 : 1,
          shadowRadius: blur / 2,
        }}
      />
      <View
        style={{
          backgroundColor: palette.background,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}
