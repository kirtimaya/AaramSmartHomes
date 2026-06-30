import type { NeoSurfaceProps } from "./NeoSurface.types";

const SHADOW_VAR: Record<NonNullable<NeoSurfaceProps["variant"]>, string> = {
  out: "var(--neo-out-shadow)",
  "out-sm": "var(--neo-out-shadow-sm)",
  in: "var(--neo-in-shadow)",
};

export function NeoSurface({
  children,
  variant = "out",
  radius = 16,
  style,
}: NeoSurfaceProps) {
  return (
    <div
      style={{
        background: "var(--background)",
        boxShadow: SHADOW_VAR[variant],
        borderRadius: radius,
        border: "1px solid var(--soft-card-border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
