"use client";

import { useState } from "react";
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

export default function TestYouTubePage() {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/youtube/test?url=${encodeURIComponent(url)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API test failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleTranscriptTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transcript extraction failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-mint-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              YouTube API 테스트
            </CardTitle>
            <CardDescription>
              YouTube API 키가 올바르게 설정되었는지 테스트합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  YouTube URL
                </label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full"
                />
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={handleTest}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? "테스트 중..." : "비디오 정보 테스트"}
                </Button>

                <Button
                  onClick={handleTranscriptTest}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? "추출 중..." : "자막 추출 테스트"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">에러 발생</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    테스트 성공!
                  </h3>
                  <Badge variant="outline" className="mb-2">
                    API 키: {result.apiKey}
                  </Badge>
                </div>

                {result.videoInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle>비디오 정보</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <strong>제목:</strong> {result.videoInfo.title}
                        </div>
                        <div>
                          <strong>채널:</strong> {result.videoInfo.channelTitle}
                        </div>
                        <div>
                          <strong>길이:</strong> {result.videoInfo.duration}
                        </div>
                        <div>
                          <strong>게시일:</strong>{" "}
                          {new Date(
                            result.videoInfo.publishedAt
                          ).toLocaleDateString()}
                        </div>
                        {result.videoInfo.thumbnail && (
                          <div>
                            <strong>썸네일:</strong>
                            <img
                              src={result.videoInfo.thumbnail}
                              alt="Thumbnail"
                              className="mt-2 max-w-xs rounded"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result.transcript && result.transcript.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        자막 ({result.transcript.length}개 구간)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {result.transcript
                          .slice(0, 10)
                          .map((item: any, index: number) => (
                            <div key={index} className="text-sm border-b pb-2">
                              <div className="font-mono text-gray-500">
                                {Math.floor(item.start / 60)}:
                                {(item.start % 60).toFixed(1).padStart(4, "0")}
                              </div>
                              <div>{item.text}</div>
                            </div>
                          ))}
                        {result.transcript.length > 10 && (
                          <div className="text-gray-500 text-sm">
                            ... 및 {result.transcript.length - 10}개 더
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result.captions && result.captions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>사용 가능한 자막</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.captions.map((caption: any, index: number) => (
                          <Badge key={index} variant="outline">
                            {caption.language} - {caption.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">전체 응답 데이터:</h4>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
