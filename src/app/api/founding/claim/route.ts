// src/app/api/founding/claim/route.ts
// Claims the founding member offer: FOUNDING_MONTHS of Pro free, for the first
// FOUNDING_PLACES players to tap the button (src/lib/founding.ts). The count
// and the claim happen together under a lock in claim_founding_pro() (00037),
// so two players racing for the last place cannot both get it.
import { getCurrentUser, checkIsOwner, awaitingParentApproval, PARENT_APPROVAL_NEEDED } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { FOUNDING_MONTHS, FOUNDING_PLACES, foundingOfferSwitchedOff } from '@/lib/founding';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await awaitingParentApproval()) return Response.json({ error: PARENT_APPROVAL_NEEDED }, { status: 403 });
  if (foundingOfferSwitchedOff()) {
    return Response.json({ error: 'The founding member offer has closed.' }, { status: 410 });
  }
  if (await checkIsOwner()) {
    return Response.json({ error: 'Owner accounts already have everything in Pro.' }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_founding_pro', {
    p_user: user.id,
    p_limit: FOUNDING_PLACES,
    p_months: FOUNDING_MONTHS,
  });
  if (error) {
    console.error('Founding claim failed', error);
    return Response.json({ error: 'Could not claim it just now. Please try again.' }, { status: 500 });
  }

  switch (data) {
    case 'claimed':
    case 'already': {
      const { data: sub } = await admin.from('subscriptions').select('founding_pro_until').eq('user_id', user.id).maybeSingle();
      return Response.json({ status: data, until: sub?.founding_pro_until ?? null });
    }
    case 'has_pro':
      return Response.json({ error: 'You already have Pro.' }, { status: 409 });
    case 'full':
      return Response.json(
        { error: `All ${FOUNDING_PLACES} founding member places have been claimed.` },
        { status: 410 }
      );
    default:
      return Response.json({ error: 'Could not claim it just now. Please try again.' }, { status: 500 });
  }
}
