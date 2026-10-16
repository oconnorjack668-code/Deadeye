// src/lib/legal.ts
// Who runs Deadeye, for the privacy policy and terms. The GDPR requires a
// privacy policy to name the controller and give an address, and EU consumer
// law asks the same of a trader. Set in the environment rather than written
// here so it can change - it is a parent's name until the founder is 18 (the
// accounts with Stripe and Google Play have to be held by an adult), and the
// founder's own after that.
//
//   LEGAL_NAME     e.g. "Mary O Connor, trading as Deadeye"
//   LEGAL_ADDRESS  a postal address on one line

export function operator(): { name: string; address: string | null } | null {
  const name = process.env.LEGAL_NAME?.trim();
  if (!name) return null;
  return { name, address: process.env.LEGAL_ADDRESS?.trim() || null };
}
