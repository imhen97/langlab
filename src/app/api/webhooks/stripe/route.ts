import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  // Initialize Stripe only when needed
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe configuration not found" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature found" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          stripe
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          stripe
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("✅ Checkout session completed:", session.id);

  if (!session.metadata?.userId || !session.metadata?.planId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // 사용자의 구독 상태를 업데이트
  await prisma.subscription.upsert({
    where: { userId: session.metadata.userId },
    update: {
      plan: session.metadata.planId === "pro" ? "PRO" : "PREMIUM",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      startDate: new Date(),
      endDate: null, // 활성 구독
    },
    create: {
      userId: session.metadata.userId,
      plan: session.metadata.planId === "pro" ? "PRO" : "PREMIUM",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      startDate: new Date(),
      endDate: null,
    },
  });

  // 사용자 크레딧 업데이트
  const credits = session.metadata.planId === "premium" ? 999999 : 1000;
  await prisma.user.update({
    where: { id: session.metadata.userId },
    data: { credits: credits },
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("🆕 Subscription created:", subscription.id);

  if (!subscription.metadata?.userId || !subscription.metadata?.planId) {
    console.error("Missing metadata in subscription");
    return;
  }

  await prisma.subscription.upsert({
    where: { userId: subscription.metadata.userId },
    update: {
      plan: subscription.metadata.planId === "pro" ? "PRO" : "PREMIUM",
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      startDate: new Date((subscription as any).current_period_start * 1000),
      endDate: new Date((subscription as any).current_period_end * 1000),
    },
    create: {
      userId: subscription.metadata.userId,
      plan: subscription.metadata.planId === "pro" ? "PRO" : "PREMIUM",
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      startDate: new Date((subscription as any).current_period_start * 1000),
      endDate: new Date((subscription as any).current_period_end * 1000),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("🔄 Subscription updated:", subscription.id);

  if (!subscription.metadata?.userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  const isActive = subscription.status === "active";
  const endDate = isActive ? null : new Date();

  await prisma.subscription.update({
    where: { userId: subscription.metadata.userId },
    data: {
      endDate: endDate,
    },
  });

  // 구독이 비활성화된 경우 크레딧을 기본값으로 재설정
  if (!isActive) {
    await prisma.user.update({
      where: { id: subscription.metadata.userId },
      data: { credits: 5 }, // 기본 무료 크레딧
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("❌ Subscription deleted:", subscription.id);

  if (!subscription.metadata?.userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // 구독 종료 처리
  await prisma.subscription.update({
    where: { userId: subscription.metadata.userId },
    data: {
      endDate: new Date(),
    },
  });

  // 사용자 크레딧을 기본값으로 재설정
  await prisma.user.update({
    where: { id: subscription.metadata.userId },
    data: { credits: 5 },
  });
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe
) {
  console.log("💰 Invoice payment succeeded:", invoice.id);

  if (!(invoice as any).subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    (invoice as any).subscription as string
  );

  if (!subscription.metadata?.userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // 결제 성공 시 구독 연장
  await prisma.subscription.update({
    where: { userId: subscription.metadata.userId },
    data: {
      endDate: new Date((subscription as any).current_period_end * 1000),
    },
  });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe
) {
  console.log("💸 Invoice payment failed:", invoice.id);

  if (!(invoice as any).subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    (invoice as any).subscription as string
  );

  if (!subscription.metadata?.userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // 결제 실패 시 사용자에게 알림 (향후 이메일 알림 기능 추가 가능)
  console.log(`Payment failed for user: ${subscription.metadata.userId}`);
}
