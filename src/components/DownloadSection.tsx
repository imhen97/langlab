"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  File,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface DownloadSectionProps {
  lessonId: string;
  transcript: any;
  title: string;
}

export default function DownloadSection({
  lessonId,
  transcript,
  title,
}: DownloadSectionProps) {
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [downloadStatus, setDownloadStatus] = useState<{
    [key: string]: "success" | "error" | null;
  }>({});

  const downloadOptions = [
    {
      id: "txt",
      name: "TXT 파일",
      description: "일반 텍스트 형식",
      icon: FileText,
      format: "text/plain",
    },
    {
      id: "pdf",
      name: "PDF 파일",
      description: "인쇄 가능한 문서",
      icon: File,
      format: "application/pdf",
    },
  ];

  const handleDownload = async (format: string) => {
    setDownloading((prev) => ({ ...prev, [format]: true }));
    setDownloadStatus((prev) => ({ ...prev, [format]: null }));

    try {
      const response = await fetch(`/api/download/transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          format,
          title,
          transcript,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}_대본.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setDownloadStatus((prev) => ({ ...prev, [format]: "success" }));
        setTimeout(() => {
          setDownloadStatus((prev) => ({ ...prev, [format]: null }));
        }, 3000);
      } else {
        const error = await response.json();
        console.error("다운로드 실패:", error.error);
        setDownloadStatus((prev) => ({ ...prev, [format]: "error" }));
      }
    } catch (error) {
      console.error("다운로드 오류:", error);
      setDownloadStatus((prev) => ({ ...prev, [format]: "error" }));
    } finally {
      setDownloading((prev) => ({ ...prev, [format]: false }));
    }
  };

  const getStatusIcon = (format: string) => {
    const status = downloadStatus[format];
    if (status === "success")
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === "error")
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    return null;
  };

  const formatTranscriptForDownload = () => {
    if (!transcript) return "";

    let formattedText = `${title}\n`;
    formattedText += "=".repeat(title.length) + "\n\n";

    if (Array.isArray(transcript)) {
      transcript.forEach((segment: any, index: number) => {
        if (segment.en || segment.ko) {
          formattedText += `[${Math.floor(segment.start / 60)}:${(
            segment.start % 60
          )
            .toFixed(0)
            .padStart(2, "0")}]\n`;
          if (segment.en) formattedText += `EN: ${segment.en}\n`;
          if (segment.ko) formattedText += `KO: ${segment.ko}\n`;
          formattedText += "\n";
        }
      });
    }

    return formattedText;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>대본 다운로드</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          레슨의 대본을 다양한 형식으로 다운로드할 수 있습니다.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {downloadOptions.map((option) => {
            const Icon = option.icon;
            const isLoading = downloading[option.id];
            const status = downloadStatus[option.id];

            return (
              <div
                key={option.id}
                className={`p-4 border rounded-lg transition-all ${
                  status === "success"
                    ? "bg-green-50 border-green-200"
                    : status === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        option.id === "pdf"
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{option.name}</h4>
                      <p className="text-sm text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(option.id)}
                </div>

                <Button
                  onClick={() => handleDownload(option.id)}
                  disabled={isLoading}
                  className="w-full"
                  variant={option.id === "pdf" ? "default" : "outline"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>포함 내용:</strong>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• 영상 제목 및 메타데이터</li>
              <li>• 타임스탬프와 함께 영어/한국어 대본</li>
              <li>• 깔끔하게 정리된 형식</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


