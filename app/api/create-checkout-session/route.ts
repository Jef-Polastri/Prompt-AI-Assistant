import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    const session = await stripe.checkout.sessions.create({
  // Ao remover payment_method_types, o Stripe ativa automaticamente os métodos configurados no seu Dashboard (Cartão, PIX, etc.)
  line_items: [
    {
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1,
    },
  ],
  mode: 'subscription',
  success_url: `${req.headers.get('origin')}/chat?success=true`,
  cancel_url: `${req.headers.get('origin')}/chat?canceled=true`,
  customer_email: email,
  metadata: {
    userId,
  },
});

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}