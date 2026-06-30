import type { ReactNode } from "react";

export type NeoSurfaceVariant = "out" | "out-sm" | "in";

export interface NeoSurfaceProps {
  children?: ReactNode;
  variant?: NeoSurfaceVariant;
  radius?: number;
  style?: Record<string, unknown>;
}
