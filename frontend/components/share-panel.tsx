import QRCode from "qrcode";
import { headers } from "next/headers";
import { CopyLinkButton } from "@/frontend/components/copy-link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card";

async function eventShareUrl(eventId: string): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "127.0.0.1:4321";
  const proto = headerStore.get("x-forwarded-proto") || "http";
  return `${proto}://${host}/r/${eventId}`;
}

export async function SharePanel({ eventId, eventName }: { eventId: string; eventName: string }) {
  const url = await eventShareUrl(eventId);
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 240,
    color: { dark: "#5c1f1a", light: "#fffaf3" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share the anonymous form</CardTitle>
        <CardDescription>
          Guests never enter a name. Send this link or QR for {eventName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="size-40 shrink-0 overflow-hidden rounded-xl border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for the guest form" className="size-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <CopyLinkButton url={url} />
          <p className="text-sm text-muted-foreground">
            Print the QR at check-in, or drop the link in Slack. Responses show up on this dashboard after a refresh.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
