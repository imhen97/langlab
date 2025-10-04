"use client";

import { useState } from "react";

// Force dynamic rendering
export const dynamic = "force-dynamic";
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
import SubscriptionGate from "@/components/subscription/SubscriptionGate";
import {
  ArrowLeft,
  Play,
  Upload,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  Target,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

function CreatePageContent() {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [level, setLevel] = useState<"A2" | "B1" | "B2" | "C1" | null>(null);
  const [purpose, setPurpose] = useState<
    "CONVO" | "IELTS" | "TOEIC" | "OPIC" | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [transcript, setTranscript] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [isExtractingTranscript, setIsExtractingTranscript] = useState(false);

  const levels = [
    { value: "A2", label: "A2 (초급)", description: "기본적인 일상 표현 이해" },
    {
      value: "B1",
      label: "B1 (중급)",
      description: "일상적인 주제에 대한 대화",
    },
    {
      value: "B2",
      label: "B2 (중상급)",
      description: "복잡한 주제에 대한 토론",
    },
    { value: "C1", label: "C1 (고급)", description: "자연스러운 유창한 표현" },
  ];

  const purposes = [
    {
      value: "CONVO",
      label: "회화",
      description: "일상 대화 능력 향상",
      icon: "💬",
    },
    {
      value: "IELTS",
      label: "IELTS",
      description: "아카데믹 영어 시험 대비",
      icon: "🎓",
    },
    {
      value: "TOEIC",
      label: "TOEIC",
      description: "비즈니스 영어 능력 향상",
      icon: "💼",
    },
    {
      value: "OPIC",
      label: "OPIC",
      description: "말하기 능력 평가 대비",
      icon: "🗣️",
    },
  ];

  const handleNext = () => {
    if (step === 1 && url.trim()) {
      setStep(2);
    } else if (step === 2 && level && purpose) {
      setStep(3);
    }
  };

  const handleExtractTranscript = async () => {
    if (!url.trim()) {
      alert("YouTube URL을 입력해주세요.");
      return;
    }

    setIsExtractingTranscript(true);

    try {
      console.log("🎬 Extracting transcript for URL:", url);

      const response = await fetch("/api/transcript/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        setTranscript(data.transcript);
        console.log(
          "✅ Transcript extracted:",
          data.transcript.length,
          "segments"
        );
        console.log("📝 Method used:", data.method);
        alert(
          `자막 추출 완료! ${data.transcript.length}개 세그먼트를 추출했습니다. (방법: ${data.method})`
        );
      } else {
        console.error("❌ Transcript error:", data.error);
        alert(`자막 추출 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("💥 Transcript extraction failed:", error);
      alert(
        `자막 추출 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
    } finally {
      setIsExtractingTranscript(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep("비디오 정보를 확인하고 있습니다...");

    try {
      // YouTube URL인 경우 자막 추출
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        console.log("Testing YouTube API with URL:", url);
        setGenerationStep("YouTube 비디오 정보를 가져오는 중...");

        // 먼저 API 테스트
        const testResponse = await fetch(
          `/api/youtube/test?url=${encodeURIComponent(url)}`
        );
        const testData = await testResponse.json();
        console.log("YouTube API Test Result:", testData);

        if (!testResponse.ok) {
          throw new Error(`YouTube API test failed: ${testData.error}`);
        }

        setGenerationStep("자막을 추출하는 중...");

        // 자막 추출
        const response = await fetch("/api/youtube/transcript", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error("Failed to extract transcript");
        }

        const data = await response.json();
        console.log("Extracted transcript:", data);
      }

      setGenerationStep("AI가 레슨을 생성하는 중...");

      // 레슨 생성 API 호출
      const lessonResponse = await fetch("/api/lesson/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          level,
          purpose,
        }),
      });

      if (!lessonResponse.ok) {
        const errorData = await lessonResponse.json().catch(() => ({}));
        console.error("Lesson generation failed:", errorData);
        throw new Error(
          `Failed to generate lesson: ${
            errorData.error || lessonResponse.statusText
          }`
        );
      }

      const lessonData = await lessonResponse.json();
      console.log("Generated lesson:", lessonData);

      if (lessonData.success) {
        setGenerationStep("레슨 생성 완료!");
        setTimeout(() => {
          setIsGenerating(false);
          // 레슨 페이지로 리다이렉트
          window.location.href = `/lesson/${lessonData.lessonId}`;
        }, 1000);
      } else {
        throw new Error(lessonData.error || "Failed to generate lesson");
      }
    } catch (error) {
      console.error("Error generating lesson:", error);
      setIsGenerating(false);
      setGenerationStep("");
      alert(
        `에러가 발생했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-lg font-semibold">홈으로</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              랭귀지랩
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">새 레슨 만들기</h1>
            <Badge variant="outline" className="text-sm">
              {step}/4 단계
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: URL Input */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="w-6 h-6 text-purple-600" />
                <span>콘텐츠 링크 입력</span>
              </CardTitle>
              <CardDescription>
                유튜브 영상, 뉴스 기사, 또는 MP3 파일을 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="text-lg py-6 flex-1"
                  />
                  <Button
                    onClick={handleExtractTranscript}
                    disabled={isExtractingTranscript || !url.trim()}
                    variant="outline"
                    className="px-6"
                  >
                    {isExtractingTranscript ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2" />
                        추출 중...
                      </>
                    ) : (
                      "자막 추출"
                    )}
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  지원 형식: YouTube 링크, 뉴스 기사 URL, MP3/MP4 파일 (최대
                  20분, 50MB)
                </div>

                {/* Transcript Preview */}
                {transcript.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-800">
                        추출된 자막
                      </h4>
                      <Badge variant="outline" className="text-green-600">
                        {transcript.length}개 세그먼트
                      </Badge>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {transcript.slice(0, 3).map((segment, index) => (
                        <div key={index} className="text-sm text-green-700">
                          <span className="font-mono text-xs text-green-500">
                            {Math.floor(segment.start)}s
                          </span>{" "}
                          {segment.text}
                        </div>
                      ))}
                      {transcript.length > 3 && (
                        <div className="text-xs text-green-600">
                          ... 및 {transcript.length - 3}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium">MP3 업로드</span>
                  </CardContent>
                </Card>
                <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Play className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium">YouTube 링크</span>
                  </CardContent>
                </Card>
                <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <LinkIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium">뉴스 기사</span>
                  </CardContent>
                </Card>
              </div>

              <Button
                onClick={handleNext}
                disabled={!url.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                다음 단계
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Level & Purpose Selection */}
        {step === 2 && (
          <div className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-6 h-6 text-purple-600" />
                  <span>레벨 선택</span>
                </CardTitle>
                <CardDescription>
                  현재 영어 실력에 맞는 레벨을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {levels.map((lvl) => (
                    <Card
                      key={lvl.value}
                      className={`cursor-pointer transition-all ${
                        level === lvl.value
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                      onClick={() => setLevel(lvl.value as any)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{lvl.label}</h3>
                            <p className="text-sm text-gray-600">
                              {lvl.description}
                            </p>
                          </div>
                          {level === lvl.value && (
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  <span>학습 목표</span>
                </CardTitle>
                <CardDescription>
                  어떤 목적으로 영어를 공부하시나요?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {purposes.map((purpose_item) => (
                    <Card
                      key={purpose_item.value}
                      className={`cursor-pointer transition-all ${
                        purpose === purpose_item.value
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                      onClick={() => setPurpose(purpose_item.value as any)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {purpose_item.icon}
                            </span>
                            <div>
                              <h3 className="font-semibold">
                                {purpose_item.label}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {purpose_item.description}
                              </p>
                            </div>
                          </div>
                          {purpose === purpose_item.value && (
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleNext}
              disabled={!level || !purpose}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="lg"
            >
              다음 단계
            </Button>
          </div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 3 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>레슨 미리보기</CardTitle>
              <CardDescription>
                생성될 레슨의 내용을 확인하고 생성하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">선택된 설정</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">콘텐츠:</span>
                    <span className="font-medium">{url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">레벨:</span>
                    <span className="font-medium">
                      {levels.find((l) => l.value === level)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">목표:</span>
                    <span className="font-medium">
                      {purposes.find((p) => p.value === purpose)?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">예상 생성 시간: 20초 이내</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  AI가 요약본, 어휘, 패턴, 퀴즈, 스피킹 카드를 자동으로
                  생성합니다.
                </p>
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  이전 단계
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {generationStep}
                    </>
                  ) : (
                    "레슨 생성하기"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4">
                레슨이 생성되었습니다!
              </h2>
              <p className="text-gray-600 mb-8">
                AI가 맞춤형 레슨을 완성했습니다. 이제 학습을 시작해보세요.
              </p>
              <div className="flex space-x-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setUrl("");
                    setLevel(null);
                    setPurpose(null);
                  }}
                >
                  새 레슨 만들기
                </Button>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  레슨 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <SubscriptionGate feature="lesson">
      <CreatePageContent />
    </SubscriptionGate>
  );
}
