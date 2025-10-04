"use client";

import { useRouter } from "next/navigation";
import StripeCheckout from "@/components/payment/StripeCheckout";

export default function PricingPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // 무료 체험 시작 시 대시보드로 이동
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50">
      <StripeCheckout onSuccess={handleSuccess} />
    </div>
  );
}
