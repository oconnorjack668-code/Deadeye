// src/lib/resendEmail.ts
// "Send it again" on the Check your email page (D3). Supabase allows one
// confirmation email per address every 60 seconds and answers sooner tries
// with `over_email_send_rate_limit` ("you can only request this after 37
// seconds"); the same code with no seconds means the project's hourly mail
// limit is used up. `over_request_rate_limit` is the per-IP limit on the
// resend endpoint (30 per 5 minutes by default).
// https://supabase.com/docs/guides/auth/rate-limits
// https://supabase.com/docs/guides/auth/debugging/error-codes

export const RESEND_COOLDOWN_S = 60;

export type ResendOutcome = {
  ok: boolean;
  /** Seconds before the button works again (0 = straight away). */
  cooldown: number;
  message: string;
};

export function resendOutcome(error: { code?: string; message?: string } | null): ResendOutcome {
  if (!error) {
    return { ok: true, cooldown: RESEND_COOLDOWN_S, message: 'Sent. Check your inbox, and spam or junk.' };
  }
  if (error.code === 'over_email_send_rate_limit') {
    const seconds = Number(/after (\d+) seconds?/i.exec(error.message ?? '')?.[1]);
    if (seconds > 0) {
      return { ok: false, cooldown: seconds, message: `The last one is still on its way. You can send another in ${seconds} seconds.` };
    }
    return { ok: false, cooldown: RESEND_COOLDOWN_S, message: "We can't send more emails right now. Try again in an hour." };
  }
  if (error.code === 'over_request_rate_limit') {
    return { ok: false, cooldown: RESEND_COOLDOWN_S, message: 'Too many tries from this device. Wait a few minutes and try again.' };
  }
  return { ok: false, cooldown: 0, message: "That didn't send. Check your connection and try again." };
}

/** Only resend to something that looks like an address (the email comes from the URL). */
export function looksLikeEmail(value: string | null): value is string {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
