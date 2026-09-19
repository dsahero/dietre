"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firebaseOn = firebaseConfigured();

  async function establishSession(payload: { email?: string; firebaseToken?: string; name?: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || "Could not start a host session.");
    router.push("/events");
    router.refresh();
  }

  async function mockLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await establishSession({ email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function firebaseEmail(mode: "in" | "up") {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setBusy(true);
    setError(null);
    try {
      const cred =
        mode === "in"
          ? await signInWithEmailAndPassword(auth, email, password)
          : await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await establishSession({
        email: cred.user.email || email,
        firebaseToken: token,
        name: cred.user.displayName || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firebase auth failed.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setBusy(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await cred.user.getIdToken();
      await establishSession({
        email: cred.user.email || undefined,
        firebaseToken: token,
        name: cred.user.displayName || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

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
      <form className="space-y-4" onSubmit={firebaseOn ? (event) => { event.preventDefault(); void firebaseEmail("in"); } : mockLogin}>
        <div className="space-y-2">
          <Label htmlFor="email">Host email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@vt.edu"
          />
        </div>
        {firebaseOn && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Firebase password"
            />
          </div>
        )}
        {firebaseOn ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              Sign in
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void firebaseEmail("up")}>
              Create host
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void google()}>
              Continue with Google
            </Button>
          </div>
        ) : (
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Continue as host"}
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
