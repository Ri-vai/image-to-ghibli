import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserUuid } from '@/services/user';
import { getLastSubscriptionByUserUuid } from '@/services/subscription';

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

console.log('Stripe key prefix:', process.env.STRIPE_PRIVATE_KEY?.substring(0, 7));

export async function POST(request: NextRequest) {
  try {
    const user_uuid = await getUserUuid();
    
    if (!user_uuid) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const subscription = await getLastSubscriptionByUserUuid(user_uuid);
    
    if (!subscription?.customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    console.log('Customer ID:', subscription.customer_id);

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer_id,
      return_url: `${process.env.NEXT_PUBLIC_WEB_URL}/my-subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}