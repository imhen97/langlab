"use client";

import { Suspense, lazy, ComponentType } from "react";
import { Loader2 } from "lucide-react";

interface LazyLoadProps {
  fallback?: React.ReactNode;
}

// 기본 로딩 스피너
const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
    <span className="ml-2 text-gray-600">로딩 중...</span>
  </div>
);

// 지연 로딩 컴포넌트 생성 함수
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyLoadedComponent(props: any) {
    return (
      <Suspense fallback={fallback || <DefaultFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// 특정 컴포넌트들의 지연 로딩 버전
export const LazyReferralSystem = createLazyComponent(
  () => import("@/components/referral/ReferralSystem")
);

export const LazySubscriptionManagement = createLazyComponent(
  () => import("@/components/subscription/SubscriptionManagement")
);

export const LazyProgressDashboard = createLazyComponent(
  () => import("@/components/dashboard/ProgressDashboard")
);

export const LazyYouTubePlayer = createLazyComponent(
  () => import("@/components/YouTubePlayer")
);

export const LazyAIChat = createLazyComponent(
  () => import("@/components/lesson/AIChat")
);

export const LazySpeakingPractice = createLazyComponent(
  () => import("@/components/lesson/SpeakingPractice")
);




