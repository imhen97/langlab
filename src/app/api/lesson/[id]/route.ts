import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth";
import { SessionWithUser } from "@/types/session";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cache, generateCacheKey } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as SessionWithUser;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id: lessonId } = await params;
    const cacheKey = generateCacheKey("lesson", lessonId);

    // 캐시에서 먼저 확인
    const cachedLesson = cache.get(cacheKey);
    if (cachedLesson) {
      return NextResponse.json({
        success: true,
        lesson: cachedLesson,
        cached: true,
      });
    }

    // 데이터베이스에서 레슨 조회
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        source: true,
        progress: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "레슨을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 캐시에 저장 (10분간)
    cache.set(cacheKey, lesson, 600);

    return NextResponse.json({
      success: true,
      lesson,
      cached: false,
    });
  } catch (error: any) {
    console.error("Get lesson error:", error);
    return NextResponse.json(
      {
        error: "레슨을 불러오는 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as SessionWithUser;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id: lessonId } = await params;
    const { progress, score, detail } = await request.json();

    // 진행률 업데이트
    const updatedProgress = await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: lessonId,
        },
      },
      update: {
        state: progress,
        score: score,
        detail: detail,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        lessonId: lessonId,
        state: progress,
        score: score,
        detail: detail,
      },
    });

    // 관련 캐시 무효화
    const cacheKey = generateCacheKey("lesson", lessonId);
    cache.delete(cacheKey);

    // 사용자 통계 캐시도 무효화
    const userStatsKey = generateCacheKey("user-stats", session.user.id);
    cache.delete(userStatsKey);

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
    });
  } catch (error: any) {
    console.error("Update lesson progress error:", error);
    return NextResponse.json(
      {
        error: "진행률 업데이트 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
