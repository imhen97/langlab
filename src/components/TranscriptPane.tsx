"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Languages, Settings, RotateCcw } from "lucide-react";

export interface TranscriptSegment {
  start: number;
  end: number;
  en: string;
  ko: string; // Always present
}

interface TranscriptPaneProps {
  segments: TranscriptSegment[];
  currentIndex: number;
  onSeek: (time: number) => void;
  offsetMs?: number;
  onOffsetChange?: (offsetMs: number) => void;
  languageMode?: "EN" | "KO" | "BOTH";
  className?: string;
}

type LanguageMode = "EN" | "KO" | "BOTH";

export default function TranscriptPane({
  segments,
  currentIndex,
  onSeek,
  offsetMs = 0,
  onOffsetChange,
  languageMode: externalLanguageMode,
  className = "",
}: TranscriptPaneProps) {
  const [internalLanguageMode, setInternalLanguageMode] =
    useState<LanguageMode>("BOTH");

  // Use external language mode if provided, otherwise use internal
  const languageMode = externalLanguageMode || internalLanguageMode;
  const setLanguageMode = externalLanguageMode
    ? () => {}
    : setInternalLanguageMode;
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [showSyncSettings, setShowSyncSettings] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  // Debounced auto-scroll to prevent rapid jumping
  const lastScrolledIndex = useRef<number>(-1);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only scroll if currentIndex actually changed
    if (currentIndex !== lastScrolledIndex.current && currentIndex >= 0) {
      // Clear any pending scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll to prevent rapid jumping
      scrollTimeoutRef.current = setTimeout(() => {
        if (currentIndex >= 0 && highlightedRef.current && scrollRef.current) {
          const container = scrollRef.current;
          const element = highlightedRef.current;

          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          // Check if element is outside visible area or if it's a new segment
          if (
            currentIndex !== lastScrolledIndex.current ||
            elementRect.top < containerRect.top ||
            elementRect.bottom > containerRect.bottom
          ) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });

            lastScrolledIndex.current = currentIndex;
          }
        }
      }, 400); // 400ms debounce for stability
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSegmentClick = (segment: TranscriptSegment) => {
    onSeek(segment.start);
  };

  const handleWordClick = (word: string) => {
    // Toggle word in saved words
    const newSavedWords = new Set(savedWords);
    if (newSavedWords.has(word)) {
      newSavedWords.delete(word);
    } else {
      newSavedWords.add(word);
    }
    setSavedWords(newSavedWords);
  };

  const handleOffsetChange = (newOffsetMs: number) => {
    if (onOffsetChange) {
      onOffsetChange(newOffsetMs);
    }
  };

  const resetOffset = () => {
    handleOffsetChange(0);
  };

  const formatOffsetMs = (ms: number): string => {
    const absMs = Math.abs(ms);
    const sign = ms >= 0 ? "+" : "-";
    if (absMs >= 1000) {
      return `${sign}${(absMs / 1000).toFixed(1)}s`;
    }
    return `${sign}${absMs}ms`;
  };

  const getLanguageModeIcon = (mode: LanguageMode) => {
    switch (mode) {
      case "EN":
        return "🇺🇸";
      case "KO":
        return "🇰🇷";
      case "BOTH":
        return "🌐";
      default:
        return "🌐";
    }
  };

  const renderSegmentText = (segment: TranscriptSegment) => {
    const englishWords = segment.en.split(" ");

    switch (languageMode) {
      case "EN":
        return (
          <div className="space-y-1">
            <p className="text-gray-900 text-base leading-relaxed">
              {englishWords.map((word, index) => (
                <span
                  key={index}
                  className={`cursor-pointer hover:bg-yellow-200 px-1 rounded transition-colors ${
                    savedWords.has(word.toLowerCase().replace(/[.,!?]/g, ""))
                      ? "bg-yellow-200"
                      : ""
                  }`}
                  onClick={() =>
                    handleWordClick(word.toLowerCase().replace(/[.,!?]/g, ""))
                  }
                  title="Click to save to vocabulary"
                >
                  {word}
                </span>
              ))}
            </p>
          </div>
        );

      case "KO":
        return (
          <div className="space-y-1">
            <p className="text-gray-900 text-base leading-relaxed">
              {segment.ko || "번역이 없습니다"}
            </p>
          </div>
        );

      case "BOTH":
      default:
        return (
          <div className="space-y-2">
            <p className="text-gray-900 text-base leading-relaxed font-medium">
              {englishWords.map((word, index) => (
                <span
                  key={index}
                  className={`cursor-pointer hover:bg-yellow-200 px-1 rounded transition-colors ${
                    savedWords.has(word.toLowerCase().replace(/[.,!?]/g, ""))
                      ? "bg-yellow-200"
                      : ""
                  }`}
                  onClick={() =>
                    handleWordClick(word.toLowerCase().replace(/[.,!?]/g, ""))
                  }
                  title="Click to save to vocabulary"
                >
                  {word}
                </span>
              ))}
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              {segment.ko || "번역 생성 중..."}
            </p>
          </div>
        );
    }
  };

  if (!segments || segments.length === 0) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <div className="space-y-2">
          <Languages className="w-12 h-12 mx-auto text-gray-400" />
          <p>대본이 아직 생성되지 않았습니다.</p>
          <p className="text-sm">
            AI가 영상의 자막을 분석하여 대본을 생성하는 중입니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">대본</h3>
            <Badge variant="outline" className="text-xs">
              {segments.length}개 세그먼트
            </Badge>
            {currentIndex >= 0 && (
              <Badge variant="default" className="text-xs bg-purple-600">
                {currentIndex + 1} / {segments.length}
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Sync Settings Toggle */}
            {onOffsetChange && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSyncSettings(!showSyncSettings)}
                  className={`${
                    showSyncSettings ? "bg-purple-100 border-purple-300" : ""
                  }`}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  동기화
                </Button>
                {offsetMs !== 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formatOffsetMs(offsetMs)}
                  </Badge>
                )}
              </div>
            )}

            {/* Language Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">언어:</span>
              <div className="flex bg-gray-200 rounded-lg p-1">
                {(["EN", "KO", "BOTH"] as LanguageMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLanguageMode(mode)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      languageMode === mode
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span className="mr-1">{getLanguageModeIcon(mode)}</span>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Settings Panel */}
        {showSyncSettings && onOffsetChange && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  동기화 조정
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetOffset}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  초기화
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>대본이 늦게 나타남</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {formatOffsetMs(offsetMs)}
                  </span>
                  <span>대본이 빨리 나타남</span>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    step="50"
                    value={offsetMs}
                    onChange={(e) => handleOffsetChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, 
                        #ef4444 0%, 
                        #f97316 25%, 
                        #22c55e 50%, 
                        #f97316 75%, 
                        #ef4444 100%)`,
                    }}
                  />
                  {/* Center marker */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-gray-400 rounded"></div>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>-2.0s</span>
                  <span>0s</span>
                  <span>+2.0s</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                💡 대본이 비디오와 맞지 않을 때 미세 조정하세요
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Content */}
      <div ref={scrollRef} className="h-96 overflow-y-auto p-4 space-y-3">
        {segments.map((segment, index) => (
          <div
            key={index}
            ref={index === currentIndex ? highlightedRef : null}
            className={`p-4 rounded-lg cursor-pointer transition-all duration-200 group ${
              index === currentIndex
                ? "bg-purple-100 border-2 border-purple-300 shadow-md"
                : "hover:bg-gray-50 border border-transparent"
            }`}
            onClick={() => handleSegmentClick(segment)}
          >
            <div className="flex items-start space-x-4">
              {/* Timestamp */}
              <div className="flex-shrink-0">
                <span
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    index === currentIndex
                      ? "bg-purple-200 text-purple-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {formatTime(segment.start)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">{renderSegmentText(segment)}</div>

              {/* Save Button */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Save segment to vocabulary
                  }}
                >
                  <Star className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>💡 클릭하여 해당 시간으로 이동</span>
            <span>💡 단어를 클릭하여 단어장에 저장</span>
            {onOffsetChange && <span>⚙️ 동기화 버튼으로 미세 조정</span>}
          </div>
          <div className="flex items-center space-x-2">
            <span>저장된 단어: {savedWords.size}개</span>
            {currentIndex >= 0 && (
              <span>• 현재: {formatTime(segments[currentIndex].start)}</span>
            )}
            {offsetMs !== 0 && (
              <span>• 오프셋: {formatOffsetMs(offsetMs)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
