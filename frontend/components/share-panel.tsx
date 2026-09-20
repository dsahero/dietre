import QRCode from "qrcode";
import { headers } from "next/headers";
import { SharePanelCollapsible } from "@/frontend/components/share-panel-collapsible";

async function eventShareUrl(eventId: string): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "127.0.0.1:4321";
  const proto = headerStore.get("x-forwarded-proto") || "http";
  return `${proto}://${host}/r/${eventId}`;
}

export async function SharePanel({ eventId }: { eventId: string }) {
  const url = await eventShareUrl(eventId);
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 240,
    color: { dark: "#5c1f1a", light: "#fffaf3" },
  });

  return (
    <SharePanelCollapsible url={url} qrDataUrl={qr} />
  );
}
