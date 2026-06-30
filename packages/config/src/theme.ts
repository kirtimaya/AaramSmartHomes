export const colors = {
  light: {
    background: "#F2EEE6",
    foreground: "#3D3D3D",
    primary: "#D67D61",
    secondary: "#8BA88E",
    accent: "#E8E1D5",
    border: "#DBD1C1",
    neoLight: "#FFFFFF",
    neoDark: "#E0D9CD",
  },
  dark: {
    background: "#1C1D26",
    foreground: "#E2D9CC",
    primary: "#E08B6C",
    secondary: "#8BA88E",
    accent: "#23242F",
    border: "#2E2F3C",
    neoLight: "#272835",
    neoDark: "#131419",
  },
} as const;

export const radii = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const neoShadow = {
  out: { offset: 6, blur: 12 },
  outSm: { offset: 4, blur: 8 },
  in: { offset: 4, blur: 8 },
} as const;

export type ColorScheme = keyof typeof colors;
