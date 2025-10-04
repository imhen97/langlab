"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  Volume2,
  Award,
} from "lucide-react";

interface SpeakingPracticeProps {
  targetText: string;
  translationText?: string;
  onComplete?: (score: number) => void;
}

interface Feedback {
  recognizedText: string;
  isCorrect: boolean;
  accuracy: number;
  improvements: string[];
  pronunciationTips?: string;
  encouragement?: string;
}

export default function SpeakingPractice({
  targetText,
  translationText,
  onComplete,
}: SpeakingPracticeProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const {
    isRecording,
    isPlaying,
    recordedBlob,
    recordingTime,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    clearRecording,
    hasRecording,
  } = useVoiceRecording({
    maxDuration: 30, // 30 seconds max
  });

  const analyzeRecording = useCallback(async () => {
    if (!recordedBlob) return;

    setIsAnalyzing(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("audio", recordedBlob, "recording.webm");
      formData.append("targetText", targetText);
      formData.append("language", "en");

      const response = await fetch("/api/ai/speech-feedback", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze speech");
      }

      const data = await response.json();

      if (data.success && data.feedback) {
        setFeedback(data.feedback);
        setShowResult(true);

        // Call onComplete callback if provided
        if (onComplete && data.feedback.accuracy) {
          onComplete(data.feedback.accuracy);
        }
      }
    } catch (error) {
      console.error("Error analyzing recording:", error);
      alert("음성 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [recordedBlob, targetText, onComplete]);

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      clearRecording();
      setFeedback(null);
      setShowResult(false);
      startRecording();
    }
  };

  const handleRetry = () => {
    clearRecording();
    setFeedback(null);
    setShowResult(false);
  };

  // Text-to-speech for target text
  const speakTargetText = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 70) return "text-blue-600";
    if (accuracy >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyEmoji = (accuracy: number) => {
    if (accuracy >= 90) return "🎉";
    if (accuracy >= 70) return "👍";
    if (accuracy >= 50) return "💪";
    return "🔄";
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-600" />
              스피킹 연습
            </CardTitle>
            <CardDescription>
              아래 문장을 읽고 녹음해보세요. AI가 발음을 분석해드립니다.
            </CardDescription>
          </div>
          {feedback && (
            <Badge
              variant={feedback.isCorrect ? "default" : "secondary"}
              className={feedback.isCorrect ? "bg-green-500" : "bg-yellow-500"}
            >
              {feedback.accuracy}점
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Target Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              연습할 문장:
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={speakTargetText}
              className="gap-2"
            >
              <Volume2 className="w-4 h-4" />
              듣기
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
            <p className="text-lg font-medium text-gray-900">{targetText}</p>
            {translationText && (
              <p className="text-sm text-gray-600 mt-2">{translationText}</p>
            )}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            {!hasRecording ? (
              <Button
                onClick={handleRecordToggle}
                size="lg"
                className={`gap-2 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    녹음 중지 ({recordingTime})
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    녹음 시작
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={isPlaying ? stopPlayback : playRecording}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5" />
                      일시정지
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      재생
                    </>
                  )}
                </Button>
                <Button
                  onClick={analyzeRecording}
                  disabled={isAnalyzing}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5" />
                      발음 분석
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  다시 녹음
                </Button>
              </>
            )}
          </div>

          {isRecording && (
            <p className="text-center text-sm text-gray-500">
              마이크에 대고 문장을 읽어주세요 🎤
            </p>
          )}
        </div>

        {/* Feedback Display */}
        {showResult && feedback && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* Accuracy Score */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 text-center">
              <div className="text-6xl mb-2">
                {getAccuracyEmoji(feedback.accuracy)}
              </div>
              <div
                className={`text-4xl font-bold mb-2 ${getAccuracyColor(
                  feedback.accuracy
                )}`}
              >
                {feedback.accuracy}점
              </div>
              {feedback.encouragement && (
                <p className="text-gray-700">{feedback.encouragement}</p>
              )}
            </div>

            {/* Recognized Text */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                인식된 텍스트:
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-gray-900">{feedback.recognizedText}</p>
              </div>
            </div>

            {/* Improvements */}
            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  개선 포인트:
                </label>
                <ul className="space-y-2">
                  {feedback.improvements.map((improvement, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="text-purple-600 mt-1">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pronunciation Tips */}
            {feedback.pronunciationTips && (
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  💡 발음 팁:
                </p>
                <p className="text-sm text-blue-800">
                  {feedback.pronunciationTips}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



