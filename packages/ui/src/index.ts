export { NeoSurface } from "./NeoSurface";
export type { NeoSurfaceProps, NeoSurfaceVariant } from "./NeoSurface.types";
export * from "./auth";
export * from "./icons";

// Native-only screens (no web counterpart yet) are intentionally NOT
// re-exported here. Importing them from the root barrel would force
// Next.js/webpack to parse react-native/Flow-syntax source and native-only
// deps (e.g. react-native-gifted-charts) for every page that imports
// anything from '@aaram/ui', even pages that never touch these screens.
// Import from the specific subpath instead: '@aaram/ui/tenant', etc.
