import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
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

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "세션 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Stripe에서 결제 세션 확인
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "결제가 완료되지 않았습니다." },
        { status: 400 }
      );
    }

    // 구독 정보 가져오기
    const subscription = await stripe.subscriptions.retrieve(
      checkoutSession.subscription as string
    );

    const planId = subscription.metadata.planId;
    const userId = subscription.metadata.userId;

    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "사용자 정보가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    // 데이터베이스에 구독 정보 저장/업데이트
    const subscriptionData = {
      userId: userId,
      plan: (planId === "pro" ? "PRO" : "PREMIUM") as any,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      startDate: new Date((subscription as any).current_period_start * 1000),
      endDate: new Date((subscription as any).current_period_end * 1000),
    };

    await prisma.subscription.upsert({
      where: { userId: userId },
      update: subscriptionData,
      create: subscriptionData,
    });

    // 사용자 크레딧 업데이트 (프리미엄 플랜은 무제한)
    const credits = planId === "premium" ? 999999 : 1000;

    await prisma.user.update({
      where: { id: userId },
      data: { credits: credits },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planId,
        metadata: subscription.metadata,
        current_period_end: (subscription as any).current_period_end,
      },
    });
  } catch (error: any) {
    console.error("Verify session error:", error);
    return NextResponse.json(
      {
        error: "결제 검증 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
