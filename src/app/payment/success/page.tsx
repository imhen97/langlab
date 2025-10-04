"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Crown,
  Star,
  Zap,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setError("결제 세션 정보를 찾을 수 없습니다.");
      setIsLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const response = await fetch("/api/payment/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscription(data.subscription);
      } else {
        setError(data.error || "결제 검증에 실패했습니다.");
      }
    } catch (error) {
      setError("결제 검증 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanInfo = (planId: string) => {
    switch (planId) {
      case "pro":
        return {
          name: "Pro 플랜",
          icon: <Star className="w-8 h-8 text-purple-500" />,
          color: "bg-purple-100 text-purple-800",
          benefits: [
            "무제한 레슨 생성",
            "고급 AI 채팅 튜터",
            "무제한 스피킹 연습",
            "개인 단어장",
            "진도 분석 리포트",
          ],
        };
      case "premium":
        return {
          name: "Premium 플랜",
          icon: <Crown className="w-8 h-8 text-yellow-500" />,
          color: "bg-yellow-100 text-yellow-800",
          benefits: [
            "Pro 플랜 모든 기능",
            "개인 AI 튜터 1:1 세션",
            "맞춤형 학습 계획",
            "음성 피드백 분석",
            "학습 성과 인증서",
          ],
        };
      default:
        return {
          name: "기본 플랜",
          icon: <Zap className="w-8 h-8 text-green-500" />,
          color: "bg-green-100 text-green-800",
          benefits: ["기본 학습 기능"],
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">결제 확인 중...</h2>
            <p className="text-gray-600">
              결제 정보를 확인하고 있습니다. 잠시만 기다려주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-red-600">결제 확인 실패</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button className="w-full">대시보드로 돌아가기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planInfo = getPlanInfo(subscription?.metadata?.planId || "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 성공 메시지 */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-green-600">
              결제가 완료되었습니다! 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              프리미엄 플랜 구독이 활성화되었습니다.
            </p>
            <Badge className={`${planInfo.color} px-4 py-2 text-lg`}>
              {planInfo.icon}
              <span className="ml-2">{planInfo.name}</span>
            </Badge>
          </CardContent>
        </Card>

        {/* 플랜 혜택 */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {planInfo.icon}
              {planInfo.name} 혜택
            </CardTitle>
            <CardDescription>
              이제 모든 프리미엄 기능을 사용하실 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {planInfo.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 다음 단계 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription>프리미엄 기능을 바로 체험해보세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <ArrowRight className="w-5 h-5 mr-2" />
                대시보드로 이동
              </Button>
            </Link>
            <Link href="/create">
              <Button variant="outline" className="w-full">
                새 레슨 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            구독 관련 문의사항이 있으시면{" "}
            <a href="/support" className="text-purple-600 hover:underline">
              고객지원
            </a>
            에서 도움을 받으실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="text-gray-600">결제 확인 중...</span>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
