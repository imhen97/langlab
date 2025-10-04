"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

interface QAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  createdAt: string;
  type: "general" | "vocabulary" | "grammar" | "context";
}

interface QASectionProps {
  lessonId: string;
  transcript: string;
  onSeekTo?: (timestamp: number) => void;
}

export default function QASection({
  lessonId,
  transcript,
  onSeekTo,
}: QASectionProps) {
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [suggestedQuestions] = useState([
    "이 영상의 주요 내용을 요약해주세요",
    "어려운 단어들의 의미를 설명해주세요",
    "이 문장의 문법을 분석해주세요",
    "이 부분의 배경 지식을 알려주세요",
    "다른 표현 방법이 있을까요?",
  ]);

  // Q&A 히스토리 로드 (로컬 스토리지에서)
  useEffect(() => {
    const savedQA = localStorage.getItem(`qa_${lessonId}`);
    if (savedQA) {
      try {
        setQaItems(JSON.parse(savedQA));
      } catch (error) {
        console.error("Q&A 히스토리 로드 오류:", error);
      }
    }
  }, [lessonId]);

  // Q&A 히스토리 저장
  const saveQAHistory = (newQA: QAItem) => {
    const updatedQA = [...qaItems, newQA];
    setQaItems(updatedQA);
    localStorage.setItem(`qa_${lessonId}`, JSON.stringify(updatedQA));
  };

  // 질문 제출
  const submitQuestion = async () => {
    if (!question.trim() || loading) return;

    const userQuestion = question.trim();
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          question: userQuestion,
          transcript,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newQA: QAItem = {
          id: `qa_${Date.now()}`,
          question: userQuestion,
          answer: data.answer,
          timestamp: data.timestamp || 0,
          createdAt: new Date().toISOString(),
          type: data.type || "general",
        };
        saveQAHistory(newQA);
      } else {
        const error = await response.json();
        console.error("Q&A API 오류:", error.error);

        // 오프라인 응답
        const offlineQA: QAItem = {
          id: `qa_${Date.now()}`,
          question: userQuestion,
          answer:
            "죄송합니다. 현재 AI 서비스에 연결할 수 없습니다. 나중에 다시 시도해주세요.",
          timestamp: 0,
          createdAt: new Date().toISOString(),
          type: "general",
        };
        saveQAHistory(offlineQA);
      }
    } catch (error) {
      console.error("질문 제출 오류:", error);

      // 오프라인 응답
      const offlineQA: QAItem = {
        id: `qa_${Date.now()}`,
        question: userQuestion,
        answer: "네트워크 연결을 확인하고 다시 시도해주세요.",
        timestamp: 0,
        createdAt: new Date().toISOString(),
        type: "general",
      };
      saveQAHistory(offlineQA);
    } finally {
      setLoading(false);
    }
  };

  // 추천 질문 클릭
  const handleSuggestedQuestion = (suggestedQ: string) => {
    setQuestion(suggestedQ);
  };

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 타입별 아이콘과 색상
  const getTypeInfo = (type: string) => {
    switch (type) {
      case "vocabulary":
        return {
          icon: "📚",
          color: "bg-blue-100 text-blue-800",
          label: "어휘",
        };
      case "grammar":
        return {
          icon: "📝",
          color: "bg-green-100 text-green-800",
          label: "문법",
        };
      case "context":
        return {
          icon: "🌍",
          color: "bg-purple-100 text-purple-800",
          label: "배경",
        };
      default:
        return {
          icon: "💬",
          color: "bg-gray-100 text-gray-800",
          label: "일반",
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>AI Q&A</span>
          <Badge variant="secondary">{qaItems.length}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 질문 입력 */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="영상 내용에 대해 질문해보세요..."
              onKeyPress={(e) => e.key === "Enter" && submitQuestion()}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={submitQuestion}
              disabled={!question.trim() || loading}
              className="px-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* 추천 질문 */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600 flex items-center space-x-1">
              <Lightbulb className="w-4 h-4" />
              <span>추천 질문:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((suggestedQ, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedQuestion(suggestedQ)}
                  className="text-xs"
                >
                  {suggestedQ}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Q&A 목록 */}
        {qaItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>아직 질문이 없습니다.</p>
            <p className="text-sm mt-1">
              영상 내용에 대해 궁금한 점을 질문해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {qaItems.map((item) => {
              const typeInfo = getTypeInfo(item.type);
              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  {/* 질문 */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={typeInfo.color}>
                          {typeInfo.icon} {typeInfo.label}
                        </Badge>
                        {item.timestamp > 0 && onSeekTo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSeekTo(item.timestamp)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            {formatTime(item.timestamp)}
                          </Button>
                        )}
                      </div>
                      <p className="text-gray-800 font-medium">
                        {item.question}
                      </p>
                    </div>
                  </div>

                  {/* 답변 */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


