export async function openUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
