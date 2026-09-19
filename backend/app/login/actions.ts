"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hostIdFromEmail, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return { error: "Enter a valid email to continue as a host." };
  }

  const session = {
    host_id: hostIdFromEmail(email),
    email,
    provider: "mock" as const,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(session), sessionCookieOptions());
  redirect("/events");
}
