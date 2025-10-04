"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Loader2, Settings, Volume2, VolumeX, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { TranslationModeSelector } from "./TranslationModeSelector";
// import { TranscriptExporter } from "./TranscriptExporter";
// import { TranscriptSync } from "./TranscriptSync";
// import { useTranslationMode } from "@/hooks/useTranslationMode";
// import {
//   processTranscripts,
//   convertToTranscriptBlocks,
//   type TranscriptBlock,
//   type ProcessingStats,
// } from "@/lib/transcriptProcessor";
// import {
//   convertChunksToWordLevel,
//   type WordLevelTranscript,
// } from "@/lib/wordLevelProcessor";

// Type definitions
export interface TranscriptItem {
  id: string;
  start: number;
  end: number;
  textEN: string;
  textKO?: string;
}

interface TranscriptPaneProps {
  transcript: Array<{
    start: number;
    end?: number;
    en: string;
    ko?: string;
  }>;
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}

interface TranslationCache {
  [key: string]: string;
}

// Virtualized row component
const TranscriptRow = React.memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      items: TranscriptItem[];
      activeIndex: number;
      onSeek: (time: number) => void;
      showKorean: boolean;
      showEnglish: boolean;
      isTranslating: boolean;
    };
  }) => {
    const {
      items,
      activeIndex,
      onSeek,
      showKorean,
      showEnglish,
      isTranslating,
    } = data;
    const item = items[index];
    const isActive = index === activeIndex;

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    };

    const handleClick = useCallback(() => {
      onSeek(item.start);
    }, [item.start, onSeek]);

    return (
      <div
        style={style}
        className={`
        p-3 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gray-50
        ${isActive ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}
      `}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          {/* Timestamp */}
          <div className="flex-shrink-0 mt-1">
            <span
              className={`
            text-xs font-mono px-2 py-1 rounded
            ${isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}
          `}
            >
              {formatTime(item.start)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* English text */}
            {showEnglish && (
              <div
                className={`
              text-sm leading-relaxed mb-1
              ${isActive ? "text-gray-900 font-medium" : "text-gray-700"}
            `}
              >
                {item.textEN}
              </div>
            )}

            {/* Korean text */}
            {showKorean && (
              <div
                className={`
              text-sm leading-relaxed
              ${isActive ? "text-blue-700" : "text-gray-600"}
            `}
              >
                {item.textKO ? (
                  <span
                    className={
                      item.textKO === "번역 실패" ? "text-red-500 italic" : ""
                    }
                  >
                    {item.textKO}
                  </span>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span className="text-xs italic text-blue-500">
                      {data.isTranslating ? "번역 중..." : "번역 대기 중..."}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Play button */}
          <div className="flex-shrink-0">
            <Button
              size="sm"
              variant={isActive ? "default" : "ghost"}
              className="w-8 h-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <Play className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

TranscriptRow.displayName = "TranscriptRow";

// Main component
export default function TranscriptPane({
  transcript,
  currentTime,
  onSeek,
  className = "",
}: TranscriptPaneProps) {
  const [showEnglish, setShowEnglish] = useState(true);
  const [showKorean, setShowKorean] = useState(true);
  const [translationCache, setTranslationCache] = useState<TranslationCache>(
    {}
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [processingStats, setProcessingStats] = useState<any | null>(null);

  // Translation mode management
  // const {
  //   mode: translationMode,
  //   currentConfig,
  //   isAutoMode,
  //   switchMode,
  //   enableAutoMode,
  //   translateTexts,
  // } = useTranslationMode("google"); // Start with Google for speed

  const parentRef = useRef<HTMLDivElement>(null);
  const lastActiveIndexRef = useRef(-1);
  const throttleRef = useRef<number | null>(null);

  // Calculate item size based on display options
  const itemSize = showEnglish && showKorean ? 90 : 60;

  // Process transcript data with advanced algorithms
  const normalizedTranscript = useMemo((): TranscriptItem[] => {
    if (!transcript || transcript.length === 0) return [];

    console.log(
      "🚀 Starting advanced transcript processing:",
      transcript.length,
      "raw items"
    );

    try {
      // Step 1: Convert to standardized format
      // const transcriptBlocks = convertToTranscriptBlocks(transcript);
      // console.log("📋 Converted to blocks:", transcriptBlocks.length, "blocks");

      // Step 2: Apply advanced processing (deduplication, duration splitting, text segmentation)
      // const processedBlocks = processTranscripts(transcriptBlocks);
      // console.log(
      //   "⚡ Processed blocks:",
      //   processedBlocks.length,
      //   "final blocks"
      // );

      // Step 3: Calculate processing statistics
      // const stats = calculateProcessingStats(transcriptBlocks, processedBlocks);
      // setProcessingStats(stats);

      // Step 4: Validate quality
      // const validation = validateTranscriptQuality(processedBlocks);
      // if (!validation.isValid) {
      //   console.warn("⚠️ Transcript quality issues:", validation.issues);
      // }
      // if (validation.warnings.length > 0) {
      //   console.warn("⚠️ Transcript quality warnings:", validation.warnings);
      // }

      // Step 5: Convert back to TranscriptItem format and apply translation cache
      // const transcriptItems = convertToTranscriptItems(processedBlocks);

      // return transcriptItems.map((item) => ({
      //   ...item,
      //   textKO: translationCache[item.textEN] || undefined,
      // }));

      // Temporary fallback - return original transcript converted to TranscriptItem format
      return transcript.map((item: any, index: number) => ({
        id: `transcript-${index}`,
        start: Number(item.start || 0),
        end: Number(item.end || item.start + 2),
        textEN: String(item.en || item.textEN || item.text || "").trim(),
        textKO: item.ko || item.textKO || undefined,
      }));
    } catch (error) {
      console.error("❌ Transcript processing failed:", error);

      // Fallback to simple processing
      return transcript
        .filter((item: any) => item && (item.text || item.en || item.textEN))
        .map((item: any, index: number) => ({
          id: `transcript-fallback-${index}`,
          start: Number(item.start || 0),
          end: Number(item.end || item.start + 2),
          textEN: String(item.text || item.en || item.textEN || "").trim(),
          textKO:
            translationCache[item.text || item.en || item.textEN] || undefined,
        }))
        .filter((item: TranscriptItem) => item.textEN.length > 0);
    }
  }, [transcript, translationCache]);

  // Find active transcript index with throttling
  const activeIndex = useMemo(() => {
    return normalizedTranscript.findIndex((item, index) => {
      const nextItem = normalizedTranscript[index + 1];
      return (
        item.start <= currentTime &&
        (nextItem ? currentTime < nextItem.start : true)
      );
    });
  }, [normalizedTranscript, currentTime]);

  // Setup virtualizer
  // const virtualizer = useVirtualizer({
  //   count: normalizedTranscript.length,
  //   getScrollElement: () => parentRef.current,
  //   estimateSize: () => itemSize,
  // });

  // Enhanced batch translation with better error handling and immediate execution
  const translateMissingTexts = useCallback(async () => {
    const textsToTranslate = normalizedTranscript
      .filter((item) => {
        const hasKorean = item.textKO && item.textKO.trim().length > 0;
        const hasCache = translationCache[item.textEN];
        const hasEnglish = item.textEN && item.textEN.trim().length > 0;

        return hasEnglish && !hasKorean && !hasCache;
      })
      .map((item) => item.textEN);

    console.log("🔍 Found texts needing translation:", textsToTranslate.length);

    if (textsToTranslate.length === 0) {
      console.log("✅ No texts need translation");
      return;
    }

    setIsTranslating(true);

    try {
      console.log(
        "🚀 Starting batch translation for",
        textsToTranslate.length,
        "texts"
      );

      const response = await fetch("/api/translate/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: textsToTranslate }),
      });

      console.log("📡 Translation response status:", response.status);

      if (!response.ok) {
        throw new Error(
          `Translation API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("📥 Translation result:", result);

      if (!result.success) {
        throw new Error(result.error || "Translation failed");
      }

      const { translations } = result;

      if (!Array.isArray(translations)) {
        throw new Error("Invalid translation response format");
      }

      // Update translation cache with results
      setTranslationCache((prevCache) => {
        const newCache = { ...prevCache };

        textsToTranslate.forEach((text, index) => {
          const translation = translations[index];
          if (translation && translation.trim().length > 0) {
            newCache[text] = translation;
            console.log(`✅ Translated: "${text}" -> "${translation}"`);
          } else {
            newCache[text] = "번역 실패";
            console.warn(`❌ Translation failed for: "${text}"`);
          }
        });

        console.log(
          "🎯 Translation cache updated. Total items:",
          Object.keys(newCache).length
        );
        return newCache;
      });
    } catch (error) {
      console.error("💥 Translation error:", error);

      // Mark all failed texts in cache
      setTranslationCache((prevCache) => {
        const newCache = { ...prevCache };
        textsToTranslate.forEach((text) => {
          newCache[text] = "번역 실패";
        });
        return newCache;
      });
    } finally {
      setIsTranslating(false);
      console.log("🏁 Translation process completed");
    }
  }, [normalizedTranscript, translationCache]);

  // Auto-scroll to active item with throttling
  useEffect(() => {
    if (
      !autoScroll ||
      activeIndex === -1 ||
      activeIndex === lastActiveIndexRef.current
    ) {
      return;
    }

    // Throttle scroll updates to 2 per second
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    // throttleRef.current = window.setTimeout(() => {
    //   virtualizer.scrollToIndex(activeIndex, { align: "center" });
    //   lastActiveIndexRef.current = activeIndex;
    // }, 500);

    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [activeIndex, autoScroll]);

  // Translate missing texts immediately when transcript or translation cache changes
  useEffect(() => {
    console.log(
      "🎬 Transcript or cache changed, checking for translations needed..."
    );

    // Start translation immediately, no delay
    translateMissingTexts();
  }, [normalizedTranscript.length, Object.keys(translationCache).length]);

  // Also trigger translation when component mounts or when showKorean is enabled
  useEffect(() => {
    if (showKorean && normalizedTranscript.length > 0) {
      console.log("🌏 Korean display enabled, starting translations...");
      translateMissingTexts();
    }
  }, [showKorean, normalizedTranscript.length]);

  // Handle manual scroll - disable auto scroll temporarily
  const handleScroll = useCallback(() => {
    if (autoScroll) {
      setAutoScroll(false);
      // Re-enable after 3 seconds of no manual scroll
      setTimeout(() => setAutoScroll(true), 3000);
    }
  }, [autoScroll]);

  if (!normalizedTranscript.length) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">자막을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={showEnglish ? "default" : "outline"}
            onClick={() => setShowEnglish(!showEnglish)}
          >
            EN
          </Button>
          <Button
            size="sm"
            variant={showKorean ? "default" : "outline"}
            onClick={() => setShowKorean(!showKorean)}
          >
            KO
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {isTranslating && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>번역 중...</span>
            </div>
          )}
          <Button
            size="sm"
            variant={autoScroll ? "default" : "outline"}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <VolumeX className="w-3 h-3" />
            )}
            자동 스크롤
          </Button>
        </div>
      </div>

      {/* Transcript List */}
      <div
        ref={parentRef}
        className="flex-1 relative overflow-auto"
        style={{ height: "400px" }}
        onScroll={handleScroll}
      >
        <div
          style={{
            // height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {/* {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = normalizedTranscript[virtualItem.index];
            const isActive = virtualItem.index === activeIndex;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <TranscriptRow
                  index={virtualItem.index}
                  style={{}}
                  data={{
                    items: normalizedTranscript,
                    activeIndex,
                    onSeek,
                    showKorean,
                    showEnglish,
                    isTranslating,
                  }}
                />
              </div>
            );
          })} */}

          {/* Fallback rendering without virtualization */}
          {normalizedTranscript.map((item, index) => (
            <div key={item.id} className="p-2 border-b">
              <div
                className={`text-sm ${
                  index === activeIndex ? "bg-blue-100" : ""
                }`}
              >
                {item.textEN}
              </div>
              {item.textKO && (
                <div className="text-xs text-gray-600 mt-1">{item.textKO}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              {normalizedTranscript.length}개 자막 •
              {activeIndex >= 0 ? ` 현재: ${activeIndex + 1}` : " 재생 대기"} •
              {Object.keys(translationCache).length}개 번역 완료
            </div>
            {processingStats && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-green-600">
                  {processingStats.duplicatesRemoved}개 중복 제거
                </span>
                <span className="text-blue-600">
                  평균 {processingStats.averageLength}자
                </span>
                <span className="text-purple-600">
                  평균 {processingStats.averageDuration}초
                </span>
              </div>
            )}
          </div>
          {isTranslating && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>번역 중...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
