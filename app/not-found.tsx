import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="font-heading text-3xl">Event not found</h1>
      <p className="mt-3 text-muted-foreground">
        That share link does not match a dietre event on this server.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
