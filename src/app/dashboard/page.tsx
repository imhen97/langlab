"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ProgressDashboard from "@/components/dashboard/ProgressDashboard";
import SubscriptionManagement from "@/components/subscription/SubscriptionManagement";
import ReferralSystem from "@/components/referral/ReferralSystem";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  BookOpen,
  Plus,
  Play,
  Clock,
  Star,
  Target,
  Calendar,
  Zap,
  Brain,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedPurpose, setSelectedPurpose] = useState("all");

  const recentLessons = [
    {
      id: "1",
      title: "Bitcoin Price Analysis - Market Trends",
      level: "B2",
      purpose: "TOEIC",
      duration: "5:30",
      progress: 100,
      completed: true,
      xp: 150,
      thumbnail: "https://img.youtube.com/vi/example/maxresdefault.jpg",
    },
    {
      id: "2",
      title: "Daily News - Climate Change",
      level: "B1",
      purpose: "IELTS",
      duration: "3:45",
      progress: 75,
      completed: false,
      xp: 0,
      thumbnail: "https://img.youtube.com/vi/example2/maxresdefault.jpg",
    },
    {
      id: "3",
      title: "Business English - Job Interview",
      level: "B2",
      purpose: "CONVO",
      duration: "7:20",
      progress: 45,
      completed: false,
      xp: 0,
      thumbnail: "https://img.youtube.com/vi/example3/maxresdefault.jpg",
    },
  ];

  const achievements = [
    {
      name: "첫 레슨 완료",
      description: "첫 번째 레슨을 완료했습니다",
      icon: CheckCircle,
      earned: true,
    },
    {
      name: "연속 학습 7일",
      description: "7일 연속으로 학습했습니다",
      icon: Calendar,
      earned: true,
    },
    {
      name: "퀴즈 마스터",
      description: "10개 퀴즈를 완료했습니다",
      icon: Brain,
      earned: false,
    },
    {
      name: "스피킹 챔피언",
      description: "5개 스피킹 연습을 완료했습니다",
      icon: MessageSquare,
      earned: false,
    },
  ];

  const levels = [
    { value: "all", label: "전체" },
    { value: "A2", label: "A2" },
    { value: "B1", label: "B1" },
    { value: "B2", label: "B2" },
    { value: "C1", label: "C1" },
  ];

  const purposes = [
    { value: "all", label: "전체" },
    { value: "CONVO", label: "회화" },
    { value: "IELTS", label: "IELTS" },
    { value: "TOEIC", label: "TOEIC" },
    { value: "OPIC", label: "OPIC" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                랭귀지랩
              </span>
              <ThemeToggle />
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="/dashboard" className="text-purple-600 font-medium">
                대시보드
              </Link>
              <Link
                href="/wordbook"
                className="text-gray-600 hover:text-purple-600"
              >
                단어장
              </Link>
              <Link
                href="/progress"
                className="text-gray-600 hover:text-purple-600"
              >
                진도
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">
                    김
                  </span>
                </div>
                <span className="text-sm font-medium">김해나님</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">안녕하세요, 김해나님! 👋</h1>
          <p className="text-gray-600">오늘도 영어 학습을 시작해보세요</p>
        </div>

        {/* Progress Dashboard */}
        <div className="mb-8">
          <ProgressDashboard />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-purple-600" />
                  <span>빠른 시작</span>
                </CardTitle>
                <CardDescription>
                  새로운 레슨을 만들거나 추천 콘텐츠를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link href="/create">
                    <Button className="w-full h-20 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg">
                      <div className="text-center">
                        <Plus className="w-6 h-6 mx-auto mb-2" />
                        <div>새 레슨 만들기</div>
                      </div>
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full h-20 text-lg">
                    <div className="text-center">
                      <Target className="w-6 h-6 mx-auto mb-2" />
                      <div>추천 콘텐츠</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search and Filters */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  <span>레슨 검색</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="레슨 제목이나 키워드로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-lg"
                  />
                  <div className="flex space-x-4">
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2"
                    >
                      {levels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedPurpose}
                      onChange={(e) => setSelectedPurpose(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2"
                    >
                      {purposes.map((purpose) => (
                        <option key={purpose.value} value={purpose.value}>
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      필터
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Lessons */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>최근 레슨</CardTitle>
                <CardDescription>
                  계속해서 학습하거나 새로운 레슨을 시작하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{lesson.title}</h3>
                          <Badge variant="outline">{lesson.level}</Badge>
                          <Badge variant="outline">{lesson.purpose}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{lesson.duration}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Zap className="w-4 h-4" />
                            <span>{lesson.xp} XP</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>진도</span>
                            <span>{lesson.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${lesson.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        {lesson.completed ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            완료
                          </Badge>
                        ) : (
                          <Link href={`/lesson/${lesson.id}`}>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              계속하기
                            </Button>
                          </Link>
                        )}
                        <Button variant="outline" size="sm">
                          <Star className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button variant="outline" className="w-full">
                    모든 레슨 보기
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">성취</CardTitle>
                <CardDescription>
                  학습 목표를 달성하고 배지를 획득하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.map((achievement, index) => {
                    const Icon = achievement.icon;
                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-3 rounded-lg ${
                          achievement.earned
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            achievement.earned ? "bg-green-100" : "bg-gray-100"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              achievement.earned
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {achievement.name}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {achievement.description}
                          </p>
                        </div>
                        {achievement.earned && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Goal */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">이번 주 목표</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      3/5
                    </div>
                    <div className="text-sm text-gray-600 mb-3">레슨 완료</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: "60%" }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600 mb-1">
                      320/500
                    </div>
                    <div className="text-sm text-gray-600 mb-3">XP 포인트</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full"
                        style={{ width: "64%" }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">학습 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">총 학습 시간</span>
                    <span className="font-medium">12시간 30분</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">완료한 퀴즈</span>
                    <span className="font-medium">24개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">학습한 단어</span>
                    <span className="font-medium">156개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">평균 점수</span>
                    <span className="font-medium">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">구독 관리</CardTitle>
                <CardDescription>
                  현재 플랜과 결제 정보를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionManagement />
              </CardContent>
            </Card>

            {/* Referral System */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">추천 시스템</CardTitle>
                <CardDescription>
                  친구를 추천하고 보상을 받으세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReferralSystem />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
