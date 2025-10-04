"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Subscription {
  id: string;
  plan: "TRIAL" | "PRO" | "PREMIUM";
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  credits: number;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  canCreateLesson: boolean;
  canUseAIChat: boolean;
  canUseSpeakingPractice: boolean;
  canAccessPremiumFeatures: boolean;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (status !== "authenticated") {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/subscription/status");
      const data = await response.json();

      if (response.ok) {
        setSubscription(data.subscription);
        setError(null);
      } else {
        setError(data.error || "구독 정보를 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("구독 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [status]);

  // 권한 체크 함수들
  const canCreateLesson = (): boolean => {
    if (!subscription) return true; // 구독 정보가 없으면 무료 체험으로 간주
    if (subscription.credits > 0) return true;
    return subscription.plan === "PRO" || subscription.plan === "PREMIUM";
  };

  const canUseAIChat = (): boolean => {
    if (!subscription) return false;
    return subscription.plan === "PRO" || subscription.plan === "PREMIUM";
  };

  const canUseSpeakingPractice = (): boolean => {
    if (!subscription) return false;
    return subscription.plan === "PRO" || subscription.plan === "PREMIUM";
  };

  const canAccessPremiumFeatures = (): boolean => {
    if (!subscription) return false;
    return subscription.plan === "PREMIUM";
  };

  return {
    subscription,
    isLoading,
    error,
    canCreateLesson: canCreateLesson(),
    canUseAIChat: canUseAIChat(),
    canUseSpeakingPractice: canUseSpeakingPractice(),
    canAccessPremiumFeatures: canAccessPremiumFeatures(),
    refreshSubscription: fetchSubscription,
  };
}
