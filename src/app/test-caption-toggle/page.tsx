"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CaptionToggle, CaptionToggleCompact, useCaptionMode } from "@/components/CaptionToggle";
import { CaptionsRenderer, SideBySideCaptionsRenderer, CaptionSegment } from "@/components/CaptionsRenderer";
import { useCaptionData } from "@/hooks/useCaptionMode";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

// Sample transcript data with word-level timings
const sampleEnglishCaptions: CaptionSegment[] = [
  {
    start: 0,
    end: 3,
    text: "Hello everyone, welcome to our language learning platform.",
    words: [
      { text: "Hello", start: 0, end: 0.5 },
      { text: "everyone,", start: 0.5, end: 1.2 },
      { text: "welcome", start: 1.2, end: 1.8 },
      { text: "to", start: 1.8, end: 2.0 },
      { text: "our", start: 2.0, end: 2.3 },
      { text: "language", start: 2.3, end: 3.0 },
      { text: "learning", start: 3.0, end: 3.5 },
      { text: "platform.", start: 3.5, end: 4.0 },
    ]
  },
  {
    start: 4,
    end: 7,
    text: "Today we will learn about Korean culture and traditions.",
    words: [
      { text: "Today", start: 4, end: 4.5 },
      { text: "we", start: 4.5, end: 4.7 },
      { text: "will", start: 4.7, end: 5.0 },
      { text: "learn", start: 5.0, end: 5.5 },
      { text: "about", start: 5.5, end: 6.0 },
      { text: "Korean", start: 6.0, end: 6.5 },
      { text: "culture", start: 6.5, end: 7.0 },
      { text: "and", start: 7.0, end: 7.2 },
      { text: "traditions.", start: 7.2, end: 7.8 },
    ]
  },
  {
    start: 8,
    end: 12,
    text: "Let's start with some basic Korean greetings and phrases.",
    words: [
      { text: "Let's", start: 8, end: 8.5 },
      { text: "start", start: 8.5, end: 9.0 },
      { text: "with", start: 9.0, end: 9.3 },
      { text: "some", start: 9.3, end: 9.6 },
      { text: "basic", start: 9.6, end: 10.0 },
      { text: "Korean", start: 10.0, end: 10.5 },
      { text: "greetings", start: 10.5, end: 11.2 },
      { text: "and", start: 11.2, end: 11.4 },
      { text: "phrases.", start: 11.4, end: 12.0 },
    ]
  }
];

const sampleKoreanCaptions: CaptionSegment[] = [
  {
    start: 0,
    end: 3,
    text: "안녕하세요 여러분, 우리의 언어 학습 플랫폼에 오신 것을 환영합니다.",
    words: [
      { text: "안녕하세요", start: 0, end: 1.0 },
      { text: "여러분,", start: 1.0, end: 1.8 },
      { text: "우리의", start: 1.8, end: 2.3 },
      { text: "언어", start: 2.3, end: 2.8 },
      { text: "학습", start: 2.8, end: 3.2 },
      { text: "플랫폼에", start: 3.2, end: 3.8 },
      { text: "오신", start: 3.8, end: 4.2 },
      { text: "것을", start: 4.2, end: 4.5 },
      { text: "환영합니다.", start: 4.5, end: 5.0 },
    ]
  },
  {
    start: 4,
    end: 7,
    text: "오늘 우리는 한국의 문화와 전통에 대해 배울 것입니다.",
    words: [
      { text: "오늘", start: 4, end: 4.5 },
      { text: "우리는", start: 4.5, end: 5.2 },
      { text: "한국의", start: 5.2, end: 5.8 },
      { text: "문화와", start: 5.8, end: 6.5 },
      { text: "전통에", start: 6.5, end: 7.2 },
      { text: "대해", start: 7.2, end: 7.6 },
      { text: "배울", start: 7.6, end: 8.0 },
      { text: "것입니다.", start: 8.0, end: 8.6 },
    ]
  },
  {
    start: 8,
    end: 12,
    text: "기본적인 한국어 인사말과 표현부터 시작해보겠습니다.",
    words: [
      { text: "기본적인", start: 8, end: 8.8 },
      { text: "한국어", start: 8.8, end: 9.5 },
      { text: "인사말과", start: 9.5, end: 10.3 },
      { text: "표현부터", start: 10.3, end: 11.0 },
      { text: "시작해보겠습니다.", start: 11.0, end: 12.0 },
    ]
  }
];

export default function TestCaptionTogglePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<"stacked" | "sidebyside">("stacked");

  // Use caption mode hook with persistence
  const {
    mode,
    setMode,
    isEnglish,
    isKorean,
    isBoth,
  } = useCaptionMode("en", "test-caption-mode");

  // Use caption data hook
  const {
    data: captionData,
    setBothCaptions,
    hasEnglish,
    hasKorean,
    hasBoth,
  } = useCaptionData();

  // Initialize sample data
  useEffect(() => {
    setBothCaptions(sampleEnglishCaptions, sampleKoreanCaptions);
  }, [setBothCaptions]);

  // Mock video player controls
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= 12) {
            setIsPlaying(false);
            return 0; // Loop back to start
          }
          return newTime;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update active word and segment based on current time
  useEffect(() => {
    const allWords = [
      ...sampleEnglishCaptions.flatMap(seg => seg.words || []),
      ...sampleKoreanCaptions.flatMap(seg => seg.words || [])
    ];

    const activeWordIndex = allWords.findIndex(
      word => currentTime >= word.start && currentTime < word.end
    );

    if (activeWordIndex !== -1) {
      setActiveWordIndex(activeWordIndex);
    }

    // Find active segment
    const allSegments = [...sampleEnglishCaptions, ...sampleKoreanCaptions];
    const activeSegmentIndex = allSegments.findIndex(
      segment => currentTime >= segment.start && currentTime < segment.end
    );

    if (activeSegmentIndex !== -1) {
      setActiveSegmentIndex(activeSegmentIndex);
    }
  }, [currentTime]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveWordIndex(0);
    setActiveSegmentIndex(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleWordClick = (word: { text: string; start: number; end: number }) => {
    handleSeek(word.start);
  };

  const handleSegmentClick = (segment: CaptionSegment) => {
    handleSeek(segment.start);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}.${milliseconds
      .toString()
      .padStart(3, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Caption Toggle System Test
          </h1>
          <p className="text-gray-600">
            Test the dynamic caption switching between English, Korean, and both languages
          </p>
        </div>

        {/* Controls Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎮 Video Controls & Caption Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Controls */}
            <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
              <Button onClick={handlePlayPause} variant={isPlaying ? "secondary" : "default"}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>

              <Button 
                onClick={() => setIsMuted(!isMuted)} 
                variant={isMuted ? "secondary" : "outline"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Speed:</span>
                <Button
                  onClick={() => setPlaybackRate(playbackRate === 1 ? 1.5 : 1)}
                  variant="outline"
                  size="sm"
                >
                  {playbackRate}x
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Time:</span>
                <Badge variant="secondary">
                  {formatTime(currentTime)}
                </Badge>
              </div>
            </div>

            {/* Caption Toggle */}
            <div className="flex items-center justify-between">
              <CaptionToggle
                mode={mode}
                onModeChange={setMode}
                className="flex-1"
              />
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Layout:</span>
                <Button
                  onClick={() => setRenderMode(renderMode === "stacked" ? "sidebyside" : "stacked")}
                  variant="outline"
                  size="sm"
                >
                  {renderMode === "stacked" ? "Stacked" : "Side-by-Side"}
                </Button>
              </div>
            </div>

            {/* Compact Toggle Example */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Compact:</span>
              <CaptionToggleCompact
                mode={mode}
                onModeChange={setMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Caption Data Status */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Caption Data Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {sampleEnglishCaptions.length}
                </div>
                <div className="text-sm text-red-700">English Segments</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {sampleKoreanCaptions.length}
                </div>
                <div className="text-sm text-blue-700">Korean Segments</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {sampleEnglishCaptions.flatMap(s => s.words || []).length}
                </div>
                <div className="text-sm text-green-700">English Words</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {sampleKoreanCaptions.flatMap(s => s.words || []).length}
                </div>
                <div className="text-sm text-purple-700">Korean Words</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Captions Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 Live Captions
              <Badge variant={mode === "both" ? "default" : "secondary"}>
                {mode.toUpperCase()} Mode
              </Badge>
              <Badge variant="outline">
                Word {activeWordIndex + 1}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMode === "sidebyside" && mode === "both" ? (
              <SideBySideCaptionsRenderer
                mode={mode}
                englishCaptions={captionData.english}
                koreanCaptions={captionData.korean}
                activeWordIndex={activeWordIndex}
                activeSegmentIndex={activeSegmentIndex}
                currentTime={currentTime}
                onWordClick={handleWordClick}
                onSegmentClick={handleSegmentClick}
                showTimestamps={true}
              />
            ) : (
              <CaptionsRenderer
                mode={mode}
                englishCaptions={captionData.english}
                koreanCaptions={captionData.korean}
                activeWordIndex={activeWordIndex}
                activeSegmentIndex={activeSegmentIndex}
                currentTime={currentTime}
                onWordClick={handleWordClick}
                onSegmentClick={handleSegmentClick}
                showTimestamps={true}
                autoScroll={true}
              />
            )}
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold">Current State</h4>
                <div>Mode: <Badge variant="outline">{mode}</Badge></div>
                <div>Playing: <Badge variant={isPlaying ? "default" : "secondary"}>{isPlaying ? "Yes" : "No"}</Badge></div>
                <div>Time: <Badge variant="outline">{formatTime(currentTime)}</Badge></div>
                <div>Active Word: <Badge variant="outline">{activeWordIndex}</Badge></div>
                <div>Active Segment: <Badge variant="outline">{activeSegmentIndex}</Badge></div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Caption Availability</h4>
                <div>English: <Badge variant={hasEnglish ? "default" : "secondary"}>{hasEnglish ? "Available" : "None"}</Badge></div>
                <div>Korean: <Badge variant={hasKorean ? "default" : "secondary"}>{hasKorean ? "Available" : "None"}</Badge></div>
                <div>Both: <Badge variant={hasBoth ? "default" : "secondary"}>{hasBoth ? "Available" : "None"}</Badge></div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Mode Flags</h4>
                <div>Is English: <Badge variant={isEnglish ? "default" : "secondary"}>{isEnglish ? "Yes" : "No"}</Badge></div>
                <div>Is Korean: <Badge variant={isKorean ? "default" : "secondary"}>{isKorean ? "Yes" : "No"}</Badge></div>
                <div>Is Both: <Badge variant={isBoth ? "default" : "secondary"}>{isBoth ? "Yes" : "No"}</Badge></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



