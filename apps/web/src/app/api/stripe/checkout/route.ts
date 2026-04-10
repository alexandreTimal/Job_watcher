import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@jobfindeer/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

const PLANS: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { plan } = (await request.json()) as { plan: string };
  const priceId = PLANS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId: session.user.id },
    subscription_data: { metadata: { userId: session.user.id } },
    success_url: `${process.env.AUTH_URL}/billing?success=true`,
    cancel_url: `${process.env.AUTH_URL}/billing?canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
