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
import { useSubscription } from "@/hooks/useSubscription";
import {
  Crown,
  Star,
  Zap,
  Calendar,
  CreditCard,
  AlertCircle,
  Loader2,
  Settings,
  Download,
} from "lucide-react";
import Link from "next/link";

export default function SubscriptionManagement() {
  const { subscription, isLoading, error, refreshSubscription } =
    useSubscription();

  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;

    if (
      !confirm(
        "정말로 구독을 취소하시겠습니까? 취소 후에도 현재 결제 기간까지는 모든 기능을 사용할 수 있습니다."
      )
    ) {
      return;
    }

    setIsCancelling(true);

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          "구독이 취소되었습니다. 현재 결제 기간까지는 모든 기능을 사용할 수 있습니다."
        );
        await refreshSubscription();
      } else {
        alert(data.error || "구독 취소에 실패했습니다.");
      }
    } catch (error) {
      alert("구독 취소 중 오류가 발생했습니다.");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "무제한";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case "TRIAL":
        return {
          name: "무료 체험",
          icon: <Zap className="w-5 h-5 text-green-500" />,
          color: "bg-green-100 text-green-800",
          description: "5개 레슨 무료 체험",
        };
      case "PRO":
        return {
          name: "Pro 플랜",
          icon: <Star className="w-5 h-5 text-purple-500" />,
          color: "bg-purple-100 text-purple-800",
          description: "무제한 레슨 + 프리미엄 기능",
        };
      case "PREMIUM":
        return {
          name: "Premium 플랜",
          icon: <Crown className="w-5 h-5 text-yellow-500" />,
          color: "bg-yellow-100 text-yellow-800",
          description: "모든 기능 + 개인 튜터링",
        };
      default:
        return {
          name: "기본 플랜",
          icon: <Zap className="w-5 h-5 text-gray-500" />,
          color: "bg-gray-100 text-gray-800",
          description: "기본 학습 기능",
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600">구독 정보를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            오류가 발생했습니다
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshSubscription} variant="outline">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planInfo = getPlanInfo(subscription?.plan || "TRIAL");

  return (
    <div className="space-y-6">
      {/* 현재 구독 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            구독 관리
          </CardTitle>
          <CardDescription>
            현재 구독 상태와 결제 정보를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 플랜 정보 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {planInfo.icon}
              <div>
                <h3 className="font-semibold">{planInfo.name}</h3>
                <p className="text-sm text-gray-600">{planInfo.description}</p>
              </div>
            </div>
            <Badge className={planInfo.color}>
              {subscription?.isActive ? "활성" : "비활성"}
            </Badge>
          </div>

          {/* 크레딧 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {subscription?.credits || 0}
              </div>
              <div className="text-sm text-gray-600">남은 크레딧</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatDate(subscription?.endDate || null)}
              </div>
              <div className="text-sm text-gray-600">
                {subscription?.endDate ? "구독 만료일" : "무제한"}
              </div>
            </div>
          </div>

          {/* 구독 시작일 */}
          {subscription?.startDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>구독 시작: {formatDate(subscription.startDate)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 구독 관리 액션 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 업그레이드/다운그레이드 */}
        <Card>
          <CardHeader>
            <CardTitle>플랜 변경</CardTitle>
            <CardDescription>
              다른 플랜으로 변경하거나 업그레이드하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription?.plan === "TRIAL" ? (
              <Link href="/pricing">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Star className="w-4 h-4 mr-2" />
                  Pro 플랜으로 업그레이드
                </Button>
              </Link>
            ) : (
              <div className="space-y-3">
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    <Crown className="w-4 h-4 mr-2" />
                    Premium으로 업그레이드
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    플랜 비교 보기
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결제 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>결제 관리</CardTitle>
            <CardDescription>결제 정보와 구독을 관리하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription?.plan !== "TRIAL" ? (
              <>
                <Button variant="outline" className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  결제 방법 변경
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      취소 중...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      구독 취소
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                결제 정보가 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 사용량 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>사용량 통계</CardTitle>
          <CardDescription>이번 달 학습 활동을 확인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">12</div>
              <div className="text-sm text-gray-600">완료한 레슨</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">45</div>
              <div className="text-sm text-gray-600">학습한 단어</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">3.5</div>
              <div className="text-sm text-gray-600">학습 시간 (시간)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 인보이스 다운로드 */}
      {subscription?.plan !== "TRIAL" && (
        <Card>
          <CardHeader>
            <CardTitle>결제 내역</CardTitle>
            <CardDescription>
              결제 영수증과 인보이스를 다운로드하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              인보이스 다운로드
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




