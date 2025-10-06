import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 사용자 정보와 구독 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 구독 상태 계산
    let subscriptionData = {
      id: "trial",
      plan: "TRIAL" as const,
      startDate: user.createdAt,
      endDate: null as Date | null,
      isActive: true,
      credits: user.credits,
    };

    if (user.subscription) {
      const now = new Date();
      const isActive =
        user.subscription.endDate === null || user.subscription.endDate > now;

      subscriptionData = {
        id: user.subscription.id,
        plan: user.subscription.plan as any,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
        isActive: isActive,
        credits: user.credits,
      };
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
    });
  } catch (error: any) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      {
        error: "구독 상태를 확인하는 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
