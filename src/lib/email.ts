// src/lib/email.ts
// SERVER-ONLY: plain-text email through Resend's HTTP API (no SDK needed).
// Sign-in emails are Supabase's job; this is for mail Supabase cannot send -
// to a parent, who has no account, and receipts a law requires.
//
// Needs RESEND_API_KEY and EMAIL_FROM (e.g. "Deadeye <no-reply@deadeye.ie>").
// Resend only delivers to other people once the sending domain is verified, so
// until the domain is bought this stays off and callers fall back.

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: { to: string; subject: string; text: string }): Promise<void> {
  if (!emailConfigured()) throw new Error('Email is not configured (RESEND_API_KEY / EMAIL_FROM).');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      reply_to: process.env.SUPPORT_EMAIL || undefined,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Email send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}
