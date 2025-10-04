import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: {
          include: {
            lesson: true,
          },
        },
        streaks: true,
        lessons: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate XP and level
    const completedProgress = user.progress.filter((p) => p.state === "DONE");

    const totalXP = completedProgress.reduce(
      (sum, p) => sum + (p.score || 0),
      0
    );

    // Level calculation: 100 XP per level
    const level = Math.floor(totalXP / 100) + 1;
    const xpToNextLevel = 100;

    // Calculate streak
    const currentStreak = user.streaks[0]?.count || 0;
    const longestStreak = Math.max(
      currentStreak,
      ...user.streaks.map((s) => s.count)
    );

    // Calculate study time (estimate: 5 minutes per completed lesson)
    const totalStudyTime = completedProgress.length * 5;

    // Total lessons vs completed
    const totalLessons = user.lessons.length;
    const completedLessons = completedProgress.length;

    // Generate badges based on achievements
    const badges = [];

    if (completedLessons >= 1) {
      badges.push({
        id: "first-lesson",
        name: "첫 걸음",
        description: "첫 레슨 완료",
        icon: "🎯",
        earnedAt: completedProgress[0]?.createdAt || new Date(),
      });
    }

    if (completedLessons >= 10) {
      badges.push({
        id: "ten-lessons",
        name: "열정가",
        description: "10개 레슨 완료",
        icon: "🔥",
        earnedAt: completedProgress[9]?.createdAt || new Date(),
      });
    }

    if (currentStreak >= 7) {
      badges.push({
        id: "week-streak",
        name: "일주일 연속",
        description: "7일 연속 학습",
        icon: "⭐",
        earnedAt: user.streaks[0]?.updatedAt || new Date(),
      });
    }

    if (totalXP >= 500) {
      badges.push({
        id: "xp-500",
        name: "XP 마스터",
        description: "500 XP 달성",
        icon: "💎",
        earnedAt: new Date(),
      });
    }

    if (level >= 5) {
      badges.push({
        id: "level-5",
        name: "숙련자",
        description: "레벨 5 달성",
        icon: "🏆",
        earnedAt: new Date(),
      });
    }

    // Recent activity
    const recentActivity = completedProgress
      .slice(-10)
      .reverse()
      .map((p) => ({
        id: p.id,
        type: "lesson_complete" as const,
        description: `"${p.lesson.title || "Lesson"}" 완료`,
        xpEarned: p.score || 0,
        timestamp: p.updatedAt,
      }));

    const stats = {
      xp: totalXP,
      level,
      xpToNextLevel,
      streak: currentStreak,
      longestStreak,
      totalLessons,
      completedLessons,
      totalStudyTime,
      badges,
      recentActivity,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Error fetching progress stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress stats", details: error?.message },
      { status: 500 }
    );
  }
}



