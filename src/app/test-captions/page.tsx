"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  Sparkles,
  Brain,
  FileText,
  Clock,
  Hash,
} from "lucide-react";

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

interface ExtractionResult {
  segments: CaptionSegment[];
  plainText?: string;
  statistics: {
    originalCount: number;
    cleanedCount: number;
    totalDuration: number;
    extractionMethod: string;
  };
}

export default function TestCaptionsPage() {
  const [videoUrl, setVideoUrl] = useState(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  const [language, setLanguage] = useState("en");
  const [useLLM, setUseLLM] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  const handleExtract = async () => {
    if (!videoUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/captions/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: videoUrl.trim(),
          language,
          cleanOptions: {
            removeTimestamps: true,
            removeTags: true,
            mergeSegments: true,
            deduplicate: true,
            maxSegmentLength: 300,
          },
          useLLM,
          outputFormat: "segments",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        throw new Error(data.error || "Unknown error occurred");
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to extract captions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const downloadPlainText = () => {
    if (!result?.plainText) return;

    const blob = new Blob([result.plainText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Enhanced YouTube Caption Extraction
          </CardTitle>
          <CardDescription>
            Extract, clean, and process YouTube captions with advanced
            deduplication and LLM formatting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="videoUrl" className="mb-2 block">
                YouTube Video URL
              </Label>
              <Input
                id="videoUrl"
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
                className="mb-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="language" className="mb-2 block">
                  Language
                </Label>
                <Input
                  id="language"
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en, ko, ja, etc."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useLLM"
                  checked={useLLM}
                  onChange={(e) => setUseLLM(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useLLM" className="text-sm">
                  Use LLM post-processing for natural sentences
                </Label>
              </div>
            </div>

            <Button
              onClick={handleExtract}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Captions...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Extract Captions
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">❌ Error: {error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Extraction Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.statistics.originalCount}
                  </div>
                  <div className="text-sm text-gray-600">Original Segments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.statistics.cleanedCount}
                  </div>
                  <div className="text-sm text-gray-600">Cleaned Segments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDuration(result.statistics.totalDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-sm">
                    {result.statistics.extractionMethod}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">Method</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plain Text Section */}
          {result.plainText && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <CardTitle className="text-lg">
                      Plain Text Transcript
                    </CardTitle>
                  </div>
                  <Button
                    onClick={downloadPlainText}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {result.plainText}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <CardTitle className="text-lg">
                    Timestamped Segments
                  </CardTitle>
                </div>
                <Button
                  onClick={() => setShowRawText(!showRawText)}
                  size="sm"
                  variant="outline"
                >
                  {showRawText ? "Hide" : "Show"} Raw Text
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.segments.map((segment, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(segment.start)} -{" "}
                          {formatTime(segment.end)}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {segment.text}
                        </p>
                        {showRawText && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600">
                            <strong>Raw:</strong> {segment.text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Overview */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Features Overview</CardTitle>
          <CardDescription>
            Advanced caption extraction and processing capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />✅ Advanced Cleaning
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Remove HTML tags and timestamps</li>
                <li>• Deduplicate overlapping segments</li>
                <li>• Merge adjacent segments with small gaps</li>
                <li>• Split very long segments</li>
                <li>• Normalize whitespace and formatting</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                🤖 LLM Post-Processing
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Natural sentence formatting</li>
                <li>• Grammar correction and punctuation</li>
                <li>• Remove broken word segments</li>
                <li>• Improve readability and flow</li>
                <li>• Preserve timing information</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                📡 Multiple Extraction Methods
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• yt-dlp (auto-generated captions)</li>
                <li>• YouTube Data API v3</li>
                <li>• YouTube timedtext endpoint</li>
                <li>• Automatic fallback between methods</li>
                <li>• Support for multiple languages</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                📄 Flexible Output Formats
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Timestamped segments</li>
                <li>• Plain text transcript</li>
                <li>• Downloadable files</li>
                <li>• Detailed statistics</li>
                <li>• JSON API responses</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
