"use client";

import { useState, useEffect } from "react";
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
import {
  Users,
  Gift,
  Copy,
  Share2,
  TrendingUp,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  referralCode: string;
  referralLink: string;
}

interface ReferralReward {
  id: string;
  type: "signup" | "subscription" | "activity";
  amount: number;
  description: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
  completedAt?: Date;
}

export default function ReferralSystem() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/referral/stats");
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!stats?.referralLink) return;

    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const shareReferralLink = async () => {
    if (!stats?.referralLink) return;

    setShareLoading(true);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "LangLab - AI 기반 영어 학습 플랫폼",
          text: "LangLab에서 AI 튜터와 함께 영어를 배워보세요! 추천 링크로 가입하면 무료 크레딧을 받을 수 있어요.",
          url: stats.referralLink,
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(stats.referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Failed to share:", error);
    } finally {
      setShareLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600">추천 시스템 정보를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 추천 통계 */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {stats?.totalReferrals || 0}
            </div>
            <div className="text-sm text-gray-600">총 추천 수</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {stats?.activeReferrals || 0}
            </div>
            <div className="text-sm text-gray-600">활성 추천</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <Gift className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats?.totalEarnings || 0)}
            </div>
            <div className="text-sm text-gray-600">총 수익</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats?.pendingRewards || 0)}
            </div>
            <div className="text-sm text-gray-600">대기 중인 보상</div>
          </CardContent>
        </Card>
      </div>

      {/* 추천 링크 공유 */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-500" />
            추천 링크 공유
          </CardTitle>
          <CardDescription>
            친구들에게 LangLab을 추천하고 보상을 받으세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">추천 코드</label>
            <div className="flex gap-2">
              <Input
                value={stats?.referralCode || ""}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyReferralLink}
                className="min-w-[80px]"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    복사
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">추천 링크</label>
            <div className="flex gap-2">
              <Input
                value={stats?.referralLink || ""}
                readOnly
                className="text-sm"
              />
              <Button
                onClick={shareReferralLink}
                disabled={shareLoading}
                className="min-w-[100px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {shareLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    공유 중...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-1" />
                    공유하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보상 시스템 안내 */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>보상 시스템</CardTitle>
          <CardDescription>추천으로 얻을 수 있는 다양한 보상들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">가입 보상</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                친구가 추천 링크로 가입하면
              </p>
              <div className="text-lg font-bold text-blue-600">+500 크레딧</div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold">구독 보상</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                친구가 Pro/Premium 구독하면
              </p>
              <div className="text-lg font-bold text-purple-600">
                +1,000 크레딧
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold">활동 보상</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                친구가 첫 레슨을 완료하면
              </p>
              <div className="text-lg font-bold text-green-600">
                +200 크레딧
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최근 보상 내역 */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>최근 보상 내역</CardTitle>
          <CardDescription>
            추천을 통해 받은 보상들을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 받은 보상이 없습니다. 친구들에게 LangLab을 추천해보세요!
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.slice(0, 5).map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        reward.status === "completed"
                          ? "bg-green-500"
                          : reward.status === "pending"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{reward.description}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(reward.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        reward.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : reward.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {reward.status === "completed"
                        ? "완료"
                        : reward.status === "pending"
                        ? "대기"
                        : "취소"}
                    </Badge>
                    <div className="font-semibold text-green-600">
                      +{reward.amount} 크레딧
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추천 가이드 */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle>추천 성공 팁</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">효과적인 추천 방법</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• SNS에 학습 후기를 공유하세요</li>
                <li>• 학습 그룹에서 추천해보세요</li>
                <li>• 개인 메시지로 직접 안내하세요</li>
                <li>• 학습 성과를 보여주세요</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">추천 링크 활용법</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 이메일 서명에 추가하세요</li>
                <li>• 블로그나 웹사이트에 링크하세요</li>
                <li>• QR 코드로 오프라인 공유하세요</li>
                <li>• 소셜 미디어 프로필에 게시하세요</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




