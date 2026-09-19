"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function firebaseConfiguredInBrowser(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function LoginForm() {
  const router = useRouter();
  const firebaseOn = firebaseConfiguredInBrowser();
  const [state, formAction, pending] = useActionState(loginAction, {} as LoginState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function firebaseLogin(mode: "in" | "up" | "google") {
    setBusy(true);
    setClientError(null);
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const {
        GoogleAuthProvider,
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signInWithPopup,
      } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured in this browser.");
      const email = (document.getElementById("email") as HTMLInputElement | null)?.value ?? "";
      const password = (document.getElementById("password") as HTMLInputElement | null)?.value ?? "";
      const cred =
        mode === "google"
          ? await signInWithPopup(auth, new GoogleAuthProvider())
          : mode === "in"
            ? await signInWithEmailAndPassword(auth, email, password)
            : await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cred.user.email || email,
          firebaseToken: token,
          name: cred.user.displayName || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not start a host session.");
      router.push("/events");
      router.refresh();
    } catch (err) {
      setClientError(err instanceof Error ? err.message : "Firebase auth failed.");
    } finally {
      setBusy(false);
    }
  }

  const error = clientError || state.error;

  return (
    <div className="space-y-5">
      {!firebaseOn && (
        <Alert>
          <AlertTitle>Demo host login</AlertTitle>
          <AlertDescription>
            Firebase keys are not configured, so any email starts a local host session. Same email gets the same host id
            on this machine.
          </AlertDescription>
        </Alert>
      )}
      <form className="space-y-4" action={formAction} method="post">
        <div className="space-y-2">
          <Label htmlFor="email">Host email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@vt.edu"
          />
        </div>
        {firebaseOn && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Firebase password"
            />
          </div>
        )}
        {firebaseOn ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void firebaseLogin("in")}>
              Sign in
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void firebaseLogin("up")}>
              Create host
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void firebaseLogin("google")}>
              Continue with Google
            </Button>
          </div>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Continue as host"}
          </Button>
        )}
      </form>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not sign in</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
