import { NeoSurface } from "@aaram/ui";

export default function UiTestPage() {
  return (
    <div style={{ padding: 48, display: "flex", gap: 24, flexWrap: "wrap" }}>
      <NeoSurface variant="out">
        <div style={{ padding: 24, width: 200 }}>out</div>
      </NeoSurface>
      <NeoSurface variant="out-sm">
        <div style={{ padding: 24, width: 200 }}>out-sm</div>
      </NeoSurface>
      <NeoSurface variant="in">
        <div style={{ padding: 24, width: 200 }}>in</div>
      </NeoSurface>
    </div>
  );
}
