"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Star, Lock, Zap, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SubscriptionGateProps {
  children: ReactNode;
  feature: "lesson" | "ai-chat" | "speaking" | "premium";
  fallback?: ReactNode;
}

export default function SubscriptionGate({
  children,
  feature,
  fallback,
}: SubscriptionGateProps) {
  const {
    subscription,
    isLoading,
    canCreateLesson,
    canUseAIChat,
    canUseSpeakingPractice,
    canAccessPremiumFeatures,
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-600">권한을 확인하는 중...</span>
      </div>
    );
  }

  // 레슨 생성의 경우, 로그인하지 않은 사용자도 무료 체험 허용
  if (feature === "lesson" && !subscription) {
    return <>{children}</>;
  }

  // 권한 체크
  let hasAccess = false;
  let requiredPlan = "";
  let featureName = "";
  let featureDescription = "";

  switch (feature) {
    case "lesson":
      hasAccess = canCreateLesson;
      requiredPlan = "Pro";
      featureName = "레슨 생성";
      featureDescription = "무제한 레슨을 생성하고 학습하세요";
      break;
    case "ai-chat":
      hasAccess = canUseAIChat;
      requiredPlan = "Pro";
      featureName = "AI 채팅 튜터";
      featureDescription = "고급 AI 튜터와 실시간 대화하세요";
      break;
    case "speaking":
      hasAccess = canUseSpeakingPractice;
      requiredPlan = "Pro";
      featureName = "스피킹 연습";
      featureDescription = "AI 발음 분석과 피드백을 받으세요";
      break;
    case "premium":
      hasAccess = canAccessPremiumFeatures;
      requiredPlan = "Premium";
      featureName = "프리미엄 기능";
      featureDescription = "개인 튜터링과 맞춤형 학습 계획";
      break;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // 커스텀 fallback이 있으면 사용
  if (fallback) {
    return <>{fallback}</>;
  }

  // 기본 업그레이드 프롬프트
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-purple-500" />
          </div>
          <CardTitle className="text-purple-600">{featureName}</CardTitle>
          <CardDescription>{featureDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2">
              {requiredPlan === "Pro" ? (
                <>
                  <Star className="w-4 h-4 mr-1" />
                  Pro 플랜 필요
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-1" />
                  Premium 플랜 필요
                </>
              )}
            </Badge>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {subscription?.plan === "TRIAL" && (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span>
                  현재: 무료 체험 ({subscription.credits} 크레딧 남음)
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-purple-500" />
              <span>업그레이드하면: {featureName} 무제한 사용</span>
            </div>
          </div>

          <Link href="/pricing">
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              {requiredPlan} 플랜으로 업그레이드
            </Button>
          </Link>

          <p className="text-xs text-gray-500 text-center">
            언제든지 취소 가능 • 30일 환불 보장
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
