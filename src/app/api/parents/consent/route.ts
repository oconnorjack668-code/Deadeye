// src/app/api/parents/consent/route.ts
// A parent submits the approval form from the link their child sent them. No
// login: the request token in the link is the access.
//
// With email set up, the approval is not final until the parent taps the link
// we email them - that is the "reasonable effort" to check a parent is behind
// it. Without email (before the domain exists) the form approves directly and
// the row records approval_method = 'link', so those approvals can be found
// and re-confirmed later.
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured, sendEmail } from '@/lib/email';
import { CONFIRM_LINK_DAYS, firstName, isToken, parseParentDetails } from '@/lib/parentApproval';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const token = body?.token;
  if (!isToken(token)) return Response.json({ error: 'This approval link is not valid.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: check } = await admin
    .from('age_checks')
    .select('user_id, consent_status, confirm_sent_at')
    .eq('request_token', token)
    .maybeSingle();
  if (!check) return Response.json({ error: 'This approval link is not valid. Ask for a new one.' }, { status: 404 });
  if (check.consent_status === 'approved') return Response.json({ status: 'approved' });

  const { data: player } = await admin.auth.admin.getUserById(check.user_id);
  const parsed = parseParentDetails(body, player?.user?.email ?? null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { parentName, parentEmail } = parsed.value;

  if (!emailConfigured()) {
    const { error } = await admin
      .from('age_checks')
      .update({
        consent_status: 'approved',
        parent_name: parentName,
        parent_email: parentEmail,
        approved_at: new Date().toISOString(),
        approval_method: 'link',
        withdrawn_at: null,
      })
      .eq('user_id', check.user_id);
    if (error) {
      console.error('Parent approval failed', error);
      return Response.json({ error: 'Could not save your approval. Please try again.' }, { status: 500 });
    }
    return Response.json({ status: 'approved' });
  }

  // One email a minute per child, so the form cannot be used to flood an inbox
  if (check.confirm_sent_at && Date.now() - new Date(check.confirm_sent_at).getTime() < 60_000) {
    return Response.json({ error: 'We just sent an email. Please wait a minute before trying again.' }, { status: 429 });
  }

  const confirmToken = crypto.randomUUID();
  const { error } = await admin
    .from('age_checks')
    .update({
      parent_name: parentName,
      parent_email: parentEmail,
      confirm_token: confirmToken,
      confirm_sent_at: new Date().toISOString(),
    })
    .eq('user_id', check.user_id);
  if (error) {
    console.error('Parent approval: saving details failed', error);
    return Response.json({ error: 'Could not save your details. Please try again.' }, { status: 500 });
  }

  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', check.user_id).maybeSingle();
  const child = firstName(profile?.display_name);
  const link = `${new URL(request.url).origin}/parents/confirm/${confirmToken}`;
  try {
    await sendEmail({
      to: parentEmail,
      subject: `Approve ${child}'s Deadeye account`,
      text: [
        `Hi ${parentName},`,
        '',
        `You asked to approve ${child}'s account on Deadeye, a basketball training app. To finish, open this link within ${CONFIRM_LINK_DAYS} days:`,
        '',
        link,
        '',
        'Keep this email: the same link lets you withdraw your approval at any time.',
        '',
        `If you did not ask for this, ignore this email and ${child}'s account will not be approved.`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Parent approval email failed', err);
    return Response.json({ error: 'We could not send the email. Please check the address and try again.' }, { status: 502 });
  }

  return Response.json({ status: 'email_sent' });
}
