import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
import { Badge } from "@/frontend/components/ui/badge";
import type { ZeroMatchAlert } from "@/shared/lib/types";
import { TriangleAlertIcon } from "lucide-react";

export function ZeroMatchPanel({ alerts }: { alerts: ZeroMatchAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Alert>
        <AlertTitle>Everyone has at least one safe option</AlertTitle>
        <AlertDescription>
          Across in-range, in-budget restaurants, every submitted guest can eat something. Recheck after new responses.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
      <TriangleAlertIcon />
      <AlertTitle>
        {alerts.length} guest{alerts.length === 1 ? "" : "s"} with zero safe menu items
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          Labels stay anonymous. Email appears only if that guest opted in for follow-up.
        </p>
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.response_id} className="rounded-lg border border-destructive/20 bg-background/70 p-3 text-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{alert.anonymous_label}</p>
                <Badge variant="destructive">{alert.severity}</Badge>
              </div>
              <p className="mt-1 text-sm">
                Hard excludes: {alert.hard_excludes.length ? alert.hard_excludes.join(", ") : "none recorded"}
              </p>
              {alert.contact_email ? (
                <p className="mt-1 text-sm">
                  Optional contact:{" "}
                  <a className="underline" href={`mailto:${alert.contact_email}`}>
                    {alert.contact_email}
                  </a>
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No email on file. Do not try to identify this person.</p>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
