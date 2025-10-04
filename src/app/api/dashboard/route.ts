import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's lessons
    const lessons = await prisma.lesson.findMany({
      where: { userId: user.id },
      include: {
        source: true,
        progress: {
          where: { userId: user.id },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get user's progress stats
    const totalLessons = await prisma.lesson.count({
      where: { userId: session.user.id },
    });

    const completedLessons = await prisma.progress.count({
      where: {
        userId: session.user.id,
        state: "DONE",
      },
    });

    // Get user's streak
    const streak = await prisma.streak.findUnique({
      where: { userId: session.user.id },
    });

    // Get user's total XP (mock calculation)
    const totalXP = completedLessons * 150; // 150 XP per completed lesson

    // Get weekly XP (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyProgress = await prisma.progress.count({
      where: {
        userId: session.user.id,
        state: "DONE",
        updatedAt: {
          gte: weekAgo,
        },
      },
    });

    const weeklyXP = weeklyProgress * 150;

    return NextResponse.json({
      lessons,
      stats: {
        totalLessons,
        completedLessons,
        currentStreak: streak?.count || 0,
        totalXP,
        weeklyXP,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
