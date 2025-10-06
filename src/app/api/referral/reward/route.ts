import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { type, referredUserId, amount, description } = await request.json();

    if (!type || !referredUserId || !amount) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 추천 보상 생성
    const reward = await prisma.referralReward.create({
      data: {
        referrerId: session.user.id,
        referredUserId: referredUserId,
        type: type.toUpperCase(),
        amount: amount,
        description: description || getDefaultDescription(type),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      reward: {
        id: reward.id,
        type: reward.type.toLowerCase(),
        amount: reward.amount,
        description: reward.description,
        status: reward.status.toLowerCase(),
        createdAt: reward.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Referral reward error:", error);
    return NextResponse.json(
      {
        error: "추천 보상 생성 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { rewardId, status } = await request.json();

    if (!rewardId || !status) {
      return NextResponse.json(
        { error: "보상 ID와 상태가 필요합니다." },
        { status: 400 }
      );
    }

    // 보상 상태 업데이트
    const reward = await prisma.referralReward.update({
      where: {
        id: rewardId,
        referrerId: session.user.id,
      },
      data: {
        status: status.toUpperCase(),
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    // 보상이 완료되면 사용자 크레딧에 추가
    if (status === "completed") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          credits: {
            increment: reward.amount,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      reward: {
        id: reward.id,
        type: reward.type.toLowerCase(),
        amount: reward.amount,
        description: reward.description,
        status: reward.status.toLowerCase(),
        createdAt: reward.createdAt,
        completedAt: reward.completedAt,
      },
    });
  } catch (error: any) {
    console.error("Referral reward update error:", error);
    return NextResponse.json(
      {
        error: "추천 보상 업데이트 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function getDefaultDescription(type: string): string {
  switch (type.toLowerCase()) {
    case "signup":
      return "친구 가입 보상";
    case "subscription":
      return "친구 구독 보상";
    case "activity":
      return "친구 활동 보상";
    default:
      return "추천 보상";
  }
}




