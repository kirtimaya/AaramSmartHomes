// Design tokens — mirroring the web app's colour palette
export const colors = {
  background: '#F2EEE6',
  backgroundDark: '#1C1D26',
  foreground: '#3D3D3D',
  foregroundDark: '#E2D9CC',
  primary: '#D67D61',        // Terracotta
  primaryLight: 'rgba(214,125,97,0.12)',
  secondary: '#8BA88E',      // Sage green
  secondaryLight: 'rgba(139,168,142,0.12)',
  border: '#DBD1C1',
  borderDark: '#2E2F3C',
  white: '#FFFFFF',
  muted: '#9CA3AF',
  surface: '#FFFFFF',
  surfaceDark: '#23242F',
  error: '#EF4444',
};

export const fonts = {
  regular: 'System',
  bold: 'System',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
};
