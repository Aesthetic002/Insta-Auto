// Generic transactional email sender.
//
// Picks the transport based on env config:
//   • If SMTP_HOST is set → send via SMTP (e.g. Gmail with an app password).
//     Easiest path: no domain/DNS setup, delivers to any recipient.
//   • Otherwise → send via Resend (requires a verified domain to reach
//     arbitrary recipients; the sandbox sender only reaches the account owner).
//
// Callers keep importing { sendEmail } — the transport is an internal detail.

import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";

let resendClient: Resend | null = null;
let smtpTransport: Transporter | null = null;

function fromAddress(): string {
  // Over Gmail SMTP the From must match the authenticated account, so prefer
  // SMTP_FROM when SMTP is the active transport. Otherwise use the Resend
  // verified-domain address.
  const from = process.env.SMTP_HOST
    ? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.RESEND_FROM_EMAIL
    : process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("No from-address set (SMTP_FROM/SMTP_USER or RESEND_FROM_EMAIL)");
  }
  return from;
}

function getSmtpTransport(): Transporter {
  if (!smtpTransport) {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      throw new Error("SMTP_USER and SMTP_PASS are required when SMTP_HOST is set");
    }
    smtpTransport = nodemailer.createTransport({
      host,
      port,
      // 465 = implicit TLS; 587 = STARTTLS (Gmail default).
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return smtpTransport;
}

function getResendClient(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(key);
  }
  return resendClient;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const from = fromAddress();

  if (process.env.SMTP_HOST) {
    await getSmtpTransport().sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return;
  }

  const { error } = await getResendClient().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
