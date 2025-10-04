import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

    // 사용자의 추천 코드 생성 (이메일 기반)
    const referralCode = generateReferralCode(session.user.email!);
    const referralLink = `${process.env.NEXTAUTH_URL}/signup?ref=${referralCode}`;

    // 추천 통계 계산
    const totalReferrals = await prisma.user.count({
      where: {
        referredBy: session.user.id,
      },
    });

    const activeReferrals = await prisma.user.count({
      where: {
        referredBy: session.user.id,
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 최근 30일
        },
      },
    });

    // 추천 보상 내역 조회
    const rewards = await prisma.referralReward.findMany({
      where: {
        referrerId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    const totalEarnings = rewards
      .filter((reward) => reward.status === "COMPLETED")
      .reduce((sum, reward) => sum + reward.amount, 0);

    const pendingRewards = rewards
      .filter((reward) => reward.status === "PENDING")
      .reduce((sum, reward) => sum + reward.amount, 0);

    const stats = {
      totalReferrals,
      activeReferrals,
      totalEarnings,
      pendingRewards,
      referralCode,
      referralLink,
    };

    return NextResponse.json({
      success: true,
      stats,
      rewards: rewards.map((reward) => ({
        id: reward.id,
        type: reward.type.toLowerCase(),
        amount: reward.amount,
        description: reward.description,
        status: reward.status.toLowerCase(),
        createdAt: reward.createdAt,
        completedAt: reward.completedAt,
      })),
    });
  } catch (error: any) {
    console.error("Referral stats error:", error);
    return NextResponse.json(
      {
        error: "추천 통계를 불러오는 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function generateReferralCode(email: string): string {
  // 이메일 기반으로 안정적인 추천 코드 생성
  const hash = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${hash}${randomSuffix}`;
}




