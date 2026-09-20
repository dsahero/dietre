import { withTimeout } from "@/backend/lib/with-timeout";

export type MailResult = { sent: boolean; reason?: string };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

export function appUrl(request?: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "http://localhost:4321";
}

/**
 * Sends the "X invited you to collaborate on Y" email through Resend. Never
 * throws: when RESEND_API_KEY / MAIL_FROM aren't configured the invite is still
 * saved (the invitee sees it as a notification after logging in) and the
 * caller is told the email wasn't sent.
 */
export async function sendCollaborationInvite(input: {
  to: string;
  inviterName: string;
  eventName: string;
  baseUrl: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "Email isn't configured (set RESEND_API_KEY and MAIL_FROM)." };

  const loginUrl = `${input.baseUrl}/login`;
  const signupUrl = `${input.baseUrl}/signup`;
  const subject = `${input.inviterName} invited you to collaborate on ${input.eventName}`;
  const text =
    `${input.inviterName} invited you to collaborate on ${input.eventName}, log in to collab.\n\n` +
    `Log in: ${loginUrl}\nNew to dietre? Sign up with this email address: ${signupUrl}\n`;
  const html =
    `<p><strong>${escapeHtml(input.inviterName)}</strong> invited you to collaborate on ` +
    `<strong>${escapeHtml(input.eventName)}</strong>, log in to collab.</p>` +
    `<p><a href="${loginUrl}">Log in to collab</a></p>` +
    `<p style="color:#666;font-size:12px">New to dietre? <a href="${signupUrl}">Sign up</a> with this email address and the invitation will be waiting for you.</p>`;

  try {
    const res = await withTimeout(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [input.to], subject, text, html }),
      }),
      8000,
      "resend send email"
    );
    if (!res.ok) {
      const raw = (await res.text().catch(() => "")).slice(0, 400);
      let message = "";
      try {
        message = (JSON.parse(raw) as { message?: string }).message ?? "";
      } catch {
        message = raw;
      }
      console.warn("[mail] Resend rejected the invite email:", res.status, message || raw);
      // Resend's shared test sender only delivers to the Resend account's own address.
      if (/@resend\.dev\b/i.test(from) && (res.status === 403 || res.status === 422)) {
        return {
          sent: false,
          reason:
            "Resend's test sender (onboarding@resend.dev) only delivers to your own Resend account email. Verify your domain in Resend and set MAIL_FROM to an address on it.",
        };
      }
      return { sent: false, reason: message || `Email provider returned ${res.status}.` };
    }
    return { sent: true };
  } catch (err) {
    console.warn("[mail] invite email failed:", err instanceof Error ? err.message : err);
    return { sent: false, reason: "Couldn't reach the email provider." };
  }
}
