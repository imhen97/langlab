"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Flame,
  Star,
  TrendingUp,
  Calendar,
  Target,
  Clock,
  BookOpen,
  Trophy,
  Zap,
} from "lucide-react";

interface ProgressStats {
  xp: number;
  level: number;
  xpToNextLevel: number;
  streak: number;
  longestStreak: number;
  totalLessons: number;
  completedLessons: number;
  totalStudyTime: number; // in minutes
  badges: Badge[];
  recentActivity: Activity[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

interface Activity {
  id: string;
  type: "lesson_complete" | "quiz_passed" | "streak_milestone" | "badge_earned";
  description: string;
  xpEarned: number;
  timestamp: Date;
}

interface ProgressDashboardProps {
  userId?: string;
}

export default function ProgressDashboard({ userId }: ProgressDashboardProps) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgressStats();
  }, [userId]);

  const fetchProgressStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/progress/stats${userId ? `?userId=${userId}` : ""}`
      );
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch progress stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          진행률 데이터를 불러올 수 없습니다.
        </CardContent>
      </Card>
    );
  }

  const xpProgress =
    ((stats.xp % stats.xpToNextLevel) / stats.xpToNextLevel) * 100;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* XP & Level */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-700 font-semibold">
                레벨 & XP
              </CardDescription>
              <Star className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold text-purple-900">
                {stats.level}
              </div>
              <div className="text-lg text-purple-700 mb-1">레벨</div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-700">{stats.xp} XP</span>
                <span className="text-purple-600">
                  {stats.xpToNextLevel} XP까지
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-orange-700 font-semibold">
                연속 학습
              </CardDescription>
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold text-orange-900">
                {stats.streak}
              </div>
              <div className="text-lg text-orange-700 mb-1">일</div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <Trophy className="w-4 h-4" />
                <span>최장 기록: {stats.longestStreak}일</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Completed */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700 font-semibold">
                완료한 레슨
              </CardDescription>
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold text-blue-900">
                {stats.completedLessons}
              </div>
              <div className="text-lg text-blue-700 mb-1">
                / {stats.totalLessons}
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      (stats.completedLessons / stats.totalLessons) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Time */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700 font-semibold">
                학습 시간
              </CardDescription>
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold text-green-900">
                {Math.floor(stats.totalStudyTime / 60)}
              </div>
              <div className="text-lg text-green-700 mb-1">시간</div>
            </div>
            <div className="mt-3 text-sm text-green-700">
              이번 주: {stats.totalStudyTime % 60}분
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      {stats.badges && stats.badges.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <CardTitle>획득한 배지</CardTitle>
            </div>
            <CardDescription>
              총 {stats.badges.length}개의 배지를 획득했습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="text-4xl">{badge.icon}</div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {badge.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {badge.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <CardTitle>최근 활동</CardTitle>
            </div>
            <CardDescription>최근 학습 활동을 확인해보세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
                    {activity.type === "lesson_complete" && (
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    )}
                    {activity.type === "quiz_passed" && (
                      <Target className="w-5 h-5 text-blue-600" />
                    )}
                    {activity.type === "streak_milestone" && (
                      <Flame className="w-5 h-5 text-orange-600" />
                    )}
                    {activity.type === "badge_earned" && (
                      <Award className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString(
                        "ko-KR",
                        {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                    +{activity.xpEarned} XP
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



