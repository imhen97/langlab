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

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "구독 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자의 구독 정보 확인
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!userSubscription || userSubscription.id !== subscriptionId) {
      return NextResponse.json(
        { error: "구독을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Stripe에서 구독 취소
    if (userSubscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "구독이 취소되었습니다. 현재 결제 기간까지는 모든 기능을 사용할 수 있습니다.",
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      {
        error: "구독 취소 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
