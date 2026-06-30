"use client";

import { NeoSurface } from "@aaram/ui";
import { useSystemColorScheme } from "@aaram/core";

export default function UiTestPage() {
  const scheme = useSystemColorScheme();
  return (
    <div style={{ padding: 48, display: "flex", gap: 24, flexWrap: "wrap" }}>
      <NeoSurface variant="out">
        <div style={{ padding: 24, width: 200 }}>out</div>
      </NeoSurface>
      <NeoSurface variant="out-sm">
        <div style={{ padding: 24, width: 200 }}>out-sm</div>
      </NeoSurface>
      <NeoSurface variant="in">
        <div style={{ padding: 24, width: 200 }}>in (scheme: {scheme})</div>
      </NeoSurface>
    </div>
  );
}
