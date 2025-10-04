import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Target, Users, Zap, Star } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              랭귀지랩
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                시작하기
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200">
            🚀 AI 기반 언어 학습 플랫폼
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-500 to-mint-500 bg-clip-text text-transparent">
            유튜브로 영어 공부하자!
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            관심 있는 영상으로 영어를 배우세요. AI가 맞춤형 레슨을
            만들어드립니다.
            <br />
            <span className="text-purple-600 font-semibold">
              A2부터 C1까지
            </span>{" "}
            모든 레벨 지원
          </p>

          {/* URL Input */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <Input
                placeholder="유튜브 링크, 뉴스 링크, 또는 MP3 파일을 입력하세요"
                className="text-lg py-6"
              />
              <Link href="/create">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8"
                >
                  <Play className="w-5 h-5 mr-2" />
                  시작하기
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              회원가입 없이 샘플 레슨을 체험해보세요
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center space-x-8 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">5,000+</div>
              <div className="text-sm text-gray-600">생성된 레슨</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-600">2,500+</div>
              <div className="text-sm text-gray-600">활성 학습자</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-mint-600">95%</div>
              <div className="text-sm text-gray-600">만족도</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">왜 랭귀지랩일까요?</h2>
          <p className="text-xl text-gray-600">AI가 만드는 맞춤형 학습 경험</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <CardTitle>맞춤형 레벨</CardTitle>
              <CardDescription>
                A2부터 C1까지, 당신의 레벨에 맞는 콘텐츠를 제공합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• 회화, IELTS, TOEIC, OPIc 목표별 맞춤</li>
                <li>• 개인별 학습 속도 조절</li>
                <li>• 실시간 진도 추적</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-mint-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <CardTitle>AI 자동 생성</CardTitle>
              <CardDescription>
                20초 내에 완성되는 AI 기반 레슨 생성
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• 요약본 (한국어/영어)</li>
                <li>• 핵심 어휘 및 패턴</li>
                <li>• 퀴즈 및 스피킹 카드</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <CardTitle>지속적 동기부여</CardTitle>
              <CardDescription>
                연속 학습 시스템과 XP 포인트로 꾸준한 학습
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• 연속 학습 스트릭</li>
                <li>• XP 포인트 및 성취</li>
                <li>• 개인 단어장 관리</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">지금 시작해보세요!</h2>
          <p className="text-xl mb-8 opacity-90">
            5개 레슨 무료 체험 후 구독하세요
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                샘플 체험하기
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-purple-600"
              >
                가격 보기
              </Button>
            </Link>
            <Link href="/test-youtube">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-purple-600"
              >
                YouTube API 테스트
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              랭귀지랩
            </span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-600">
            <Link href="/terms" className="hover:text-purple-600">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-purple-600">
              개인정보처리방침
            </Link>
            <Link href="/support" className="hover:text-purple-600">
              고객지원
            </Link>
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 mt-4">
          © 2024 랭귀지랩. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
