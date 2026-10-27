import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";

/**
 * Outgoing email. Uses Resend when RESEND_API_KEY is set.
 * Without a key: in tests (E2E_OUTBOX set) each message is written to that folder as JSON;
 * otherwise it's logged, so local runs never send real mail.
 */
type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string };

const FROM = process.env.EMAIL_FROM || "GREP <onboarding@resend.dev>";

export async function sendMail(m: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const outbox = process.env.E2E_OUTBOX;
    if (outbox) {
      mkdirSync(outbox, { recursive: true });
      writeFileSync(join(outbox, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`), JSON.stringify({ from: FROM, ...m }, null, 2));
    } else {
      console.info(`[email:not-sent] to=${m.to} subject=${JSON.stringify(m.subject)}`);
    }
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from: FROM, to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo });
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#000;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 24px;font-weight:700;letter-spacing:.09em">GREP</p>
${body}
<p style="margin:32px 0 0;color:#6e6e73;font-size:13px">GREP · Built in Hyderabad</p>
</div></body></html>`;
}

export function confirmationEmail(a: { firstName: string; phone: string; cohortName?: string | null; site: string }) {
  const cohort = a.cohortName ? ` for ${a.cohortName}` : "";
  const text = [
    `Hi ${a.firstName},`,
    ``,
    `Thanks for applying to GREP${cohort}. We've got your details.`,
    `We'll message you on WhatsApp at ${a.phone} once we have your match.`,
    ``,
    `Know someone who'd train with you? Send them ${a.site}`,
    ``,
    `Didn't apply? Reply to this email and we'll delete your details.`,
    ``,
    `GREP`,
  ].join("\n");
  const html = layout(`
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.1">You're in, ${esc(a.firstName)}.</h1>
<p style="margin:0 0 12px;color:#a1a1a6">Thanks for applying to GREP${esc(cohort)}. We've got your details.</p>
<p style="margin:0 0 12px;color:#a1a1a6">We'll message you on WhatsApp at <span style="color:#f5f5f7">${esc(a.phone)}</span> once we have your match.</p>
<p style="margin:24px 0"><a href="${esc(a.site)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:12px 22px;border-radius:980px">Invite a training partner</a></p>
<p style="margin:0;color:#6e6e73;font-size:14px">Didn't apply? Reply to this email and we'll delete your details.</p>`);
  return { subject: "You're in. We'll message you with your match.", text, html };
}

export function adminAlertEmail(a: { name: string; phone: string; email: string; area: string; activity: string; target: string; cohortName?: string | null; adminUrl: string }) {
  const rows: [string, string][] = [
    ["Name", a.name], ["WhatsApp", a.phone], ["Email", a.email], ["Area", a.area],
    ["Activity", a.activity], ["Target", a.target], ["Cohort", a.cohortName || "None picked"],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nOpen /admin: ${a.adminUrl}`;
  const html = layout(`
<h1 style="margin:0 0 16px;font-size:22px">New application</h1>
<table style="border-collapse:collapse;width:100%">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#a1a1a6;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`)
    .join("")}</table>
<p style="margin:24px 0 0"><a href="${esc(a.adminUrl)}" style="color:#2997ff">Open the admin screen</a></p>`);
  return { subject: `New GREP application: ${a.name}${a.cohortName ? ` · ${a.cohortName}` : ""}`, text, html };
}
