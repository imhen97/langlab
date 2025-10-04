"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
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
import { CreditCard, Check, X, Loader2, Crown, Zap, Star } from "lucide-react";

// Stripe 공개 키 (환경 변수에서 가져옴)
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
  stripePriceId: string;
}

interface StripeCheckoutProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "trial",
    name: "무료 체험",
    description: "5개 레슨 무료",
    price: 0,
    currency: "KRW",
    interval: "month",
    features: [
      "5개 레슨 무료 체험",
      "기본 AI 채팅 튜터",
      "스피킹 연습 1회",
      "진행률 추적",
    ],
    stripePriceId: "trial",
  },
  {
    id: "pro",
    name: "Pro 플랜",
    description: "무제한 레슨 + 프리미엄 기능",
    price: 9900,
    currency: "KRW",
    interval: "month",
    features: [
      "무제한 레슨 생성",
      "고급 AI 채팅 튜터",
      "무제한 스피킹 연습",
      "개인 단어장",
      "진도 분석 리포트",
      "우선 고객 지원",
    ],
    popular: true,
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "premium",
    name: "Premium 플랜",
    description: "모든 기능 + 개인 튜터링",
    price: 19900,
    currency: "KRW",
    interval: "month",
    features: [
      "Pro 플랜 모든 기능",
      "개인 AI 튜터 1:1 세션",
      "맞춤형 학습 계획",
      "음성 피드백 분석",
      "학습 성과 인증서",
      "전용 학습 커뮤니티",
    ],
    stripePriceId: "price_premium_monthly",
  },
];

export default function StripeCheckout({
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("trial");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (selectedPlan === "trial") {
      // 무료 체험은 별도 처리
      onSuccess?.();
      return;
    }

    if (!stripePromise) {
      setError("Stripe가 구성되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 결제 세션 생성 API 호출
      const response = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: PRICING_PLANS.find((plan) => plan.id === selectedPlan)
            ?.stripePriceId,
          planId: selectedPlan,
        }),
      });

      const session = await response.json();

      if (!response.ok) {
        throw new Error(session.error || "결제 세션 생성에 실패했습니다.");
      }

      // Stripe 결제 페이지로 리다이렉트
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe를 로드할 수 없습니다.");
      }

      const { error: stripeError } = await (stripe as any).redirectToCheckout({
        sessionId: session.sessionId,
      });

      if (stripeError) {
        throw new Error(
          stripeError.message || "결제 처리 중 오류가 발생했습니다."
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">프리미엄 플랜 선택</h1>
        <p className="text-xl text-gray-600">
          나에게 맞는 플랜을 선택하고 영어 실력을 한 단계 업그레이드하세요
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <X className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {PRICING_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPlan === plan.id
                ? "ring-2 ring-purple-500 shadow-lg"
                : "hover:shadow-md"
            } ${plan.popular ? "border-purple-200" : ""}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                  <Crown className="w-4 h-4 mr-1" />
                  인기 플랜
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2">
                {plan.id === "trial" && (
                  <Zap className="w-5 h-5 text-green-500" />
                )}
                {plan.id === "pro" && (
                  <Star className="w-5 h-5 text-purple-500" />
                )}
                {plan.id === "premium" && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="mb-6">
                <div className="text-4xl font-bold text-purple-600">
                  {formatPrice(plan.price)}
                </div>
                {plan.price > 0 && (
                  <div className="text-sm text-gray-500">
                    {plan.interval === "month" ? "월" : "년"} 단위
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-6 text-left">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  selectedPlan === plan.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={isProcessing}
              >
                {selectedPlan === plan.id ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    선택됨
                  </>
                ) : (
                  "선택하기"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={handleCheckout}
          disabled={isProcessing}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 text-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              {selectedPlan === "trial" ? "무료 체험 시작" : "결제하기"}
            </>
          )}
        </Button>

        {selectedPlan !== "trial" && (
          <p className="text-sm text-gray-500 mt-4">
            안전한 Stripe 결제 시스템을 통해 처리됩니다
          </p>
        )}
      </div>

      {/* 결제 정보 */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Card className="border-0 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">결제 안전성</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Stripe SSL 암호화 결제</li>
              <li>• 카드 정보 저장하지 않음</li>
              <li>• PCI DSS 준수</li>
              <li>• 30일 환불 보장</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">지원 결제 수단</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 신용카드 (Visa, Mastercard)</li>
              <li>• 체크카드</li>
              <li>• 삼성페이, 카카오페이</li>
              <li>• 네이버페이</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
