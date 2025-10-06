import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 오늘의 단어장 조회 (오늘 추가된 단어들)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // 오늘 날짜 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      userId: session.user.id,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    };

    if (lessonId) {
      where.lessonId = lessonId;
    }

    const todayVocabulary = await prisma.wordbookItem.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // 통계 계산
    const stats = await prisma.wordbookItem.groupBy({
      by: ["isLearned"],
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        ...(lessonId && { lessonId }),
      },
      _count: {
        id: true,
      },
    });

    const totalCount = todayVocabulary.length;
    const learnedCount = stats.find(stat => stat.isLearned)?._count.id || 0;
    const unlearnedCount = totalCount - learnedCount;

    return NextResponse.json({
      items: todayVocabulary,
      stats: {
        total: totalCount,
        learned: learnedCount,
        unlearned: unlearnedCount,
      },
      date: today.toISOString().split('T')[0],
    });

  } catch (error) {
    console.error("오늘의 단어장 조회 오류:", error);
    return NextResponse.json(
      { error: "오늘의 단어장 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}


