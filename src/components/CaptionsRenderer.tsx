"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CaptionMode } from "./CaptionToggle";

export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface CaptionsRendererProps {
  mode: CaptionMode;
  englishCaptions: CaptionSegment[];
  koreanCaptions: CaptionSegment[];
  activeWordIndex: number;
  activeSegmentIndex: number;
  currentTime: number;
  onWordClick?: (word: { text: string; start: number; end: number }) => void;
  onSegmentClick?: (segment: CaptionSegment) => void;
  className?: string;
  showTimestamps?: boolean;
  autoScroll?: boolean;
}

export function CaptionsRenderer({
  mode,
  englishCaptions,
  koreanCaptions,
  activeWordIndex,
  activeSegmentIndex,
  currentTime,
  onWordClick,
  onSegmentClick,
  className = "",
  showTimestamps = true,
  autoScroll = true,
}: CaptionsRendererProps) {
  // Flatten all words for global indexing
  const allEnglishWords = englishCaptions.flatMap(segment => segment.words || []);
  const allKoreanWords = koreanCaptions.flatMap(segment => segment.words || []);

  // Calculate global word index for each language
  const getGlobalWordIndex = (segmentIndex: number, wordIndex: number, language: 'en' | 'ko') => {
    const captions = language === 'en' ? englishCaptions : koreanCaptions;
    return captions.slice(0, segmentIndex).reduce(
      (total, seg) => total + (seg.words?.length || 0), 
      wordIndex
    );
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  };

  const renderCaptionSegment = (
    segment: CaptionSegment,
    segmentIndex: number,
    language: 'en' | 'ko',
    isActive: boolean
  ) => (
    <div
      key={`${language}-${segmentIndex}`}
      data-segment-index={segmentIndex}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2",
        isActive
          ? "bg-blue-50 border border-blue-200 shadow-sm"
          : "hover:bg-gray-50"
      )}
      onClick={() => onSegmentClick?.(segment)}
    >
      {/* Segment Timestamp */}
      {showTimestamps && (
        <div className="text-xs text-gray-500 mb-2">
          {formatTime(segment.start)} - {formatTime(segment.end)}
        </div>
      )}

      {/* Language Label */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded",
          language === 'en' 
            ? "bg-red-100 text-red-700" 
            : "bg-blue-100 text-blue-700"
        )}>
          {language === 'en' ? '🇺🇸 EN' : '🇰🇷 KO'}
        </span>
      </div>

      {/* Word-level Highlighting */}
      <div className="text-gray-800 leading-relaxed">
        {segment.words ? (
          <div className="flex flex-wrap gap-1">
            {segment.words.map((word, wordIndex) => {
              const globalWordIndex = getGlobalWordIndex(segmentIndex, wordIndex, language);
              const isWordActive = globalWordIndex === activeWordIndex;
              const isUpcoming = globalWordIndex === activeWordIndex + 1;

              return (
                <span
                  key={`${language}-${segmentIndex}-${wordIndex}`}
                  className={cn(
                    "inline-block px-1 py-0.5 rounded transition-all duration-150 cursor-pointer",
                    isWordActive
                      ? "bg-yellow-300 text-gray-900 font-semibold shadow-sm scale-105"
                      : isUpcoming
                      ? "bg-yellow-100 text-gray-700"
                      : "hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onWordClick?.(word);
                  }}
                  title={`${formatTime(word.start)} - ${formatTime(word.end)}`}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-gray-600 italic">
            {segment.text}
          </span>
        )}
      </div>
    </div>
  );

  const renderCaptions = () => {
    switch (mode) {
      case "en":
        return englishCaptions.map((segment, index) => 
          renderCaptionSegment(segment, index, 'en', index === activeSegmentIndex)
        );

      case "ko":
        return koreanCaptions.map((segment, index) => 
          renderCaptionSegment(segment, index, 'ko', index === activeSegmentIndex)
        );

      case "both":
        // Combine both languages, alternating or side-by-side
        const maxLength = Math.max(englishCaptions.length, koreanCaptions.length);
        const combinedSegments = [];

        for (let i = 0; i < maxLength; i++) {
          // English segment
          if (englishCaptions[i]) {
            combinedSegments.push(
              renderCaptionSegment(englishCaptions[i], i, 'en', i === activeSegmentIndex)
            );
          }

          // Korean segment
          if (koreanCaptions[i]) {
            combinedSegments.push(
              renderCaptionSegment(koreanCaptions[i], i, 'ko', i === activeSegmentIndex)
            );
          }
        }

        return combinedSegments;

      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {renderCaptions()}
    </div>
  );
}

/**
 * Side-by-side captions renderer for "both" mode
 */
export function SideBySideCaptionsRenderer({
  mode,
  englishCaptions,
  koreanCaptions,
  activeWordIndex,
  activeSegmentIndex,
  currentTime,
  onWordClick,
  onSegmentClick,
  className = "",
  showTimestamps = true,
}: Omit<CaptionsRendererProps, 'autoScroll'>) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  };

  const renderWord = (
    word: { text: string; start: number; end: number },
    globalIndex: number,
    onClick?: () => void
  ) => {
    const isActive = globalIndex === activeWordIndex;
    const isUpcoming = globalIndex === activeWordIndex + 1;

    return (
      <span
        key={globalIndex}
        className={cn(
          "inline-block px-1 py-0.5 rounded transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-yellow-300 text-gray-900 font-semibold shadow-sm scale-105"
            : isUpcoming
            ? "bg-yellow-100 text-gray-700"
            : "hover:bg-gray-200"
        )}
        onClick={onClick}
        title={`${formatTime(word.start)} - ${formatTime(word.end)}`}
      >
        {word.text}
      </span>
    );
  };

  if (mode === "both") {
    const maxLength = Math.max(englishCaptions.length, koreanCaptions.length);
    const englishWords = englishCaptions.flatMap(seg => seg.words || []);
    const koreanWords = koreanCaptions.flatMap(seg => seg.words || []);

    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: maxLength }, (_, index) => {
          const enSegment = englishCaptions[index];
          const koSegment = koreanCaptions[index];
          const isActive = index === activeSegmentIndex;

          return (
            <div
              key={index}
              className={cn(
                "grid grid-cols-2 gap-4 p-3 rounded-lg transition-all duration-200",
                isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
              )}
            >
              {/* English Column */}
              <div 
                className="cursor-pointer"
                onClick={() => enSegment && onSegmentClick?.(enSegment)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                    🇺🇸 EN
                  </span>
                  {showTimestamps && enSegment && (
                    <span className="text-xs text-gray-500">
                      {formatTime(enSegment.start)} - {formatTime(enSegment.end)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {enSegment?.words?.map((word, wordIndex) => {
                    const globalIndex = englishWords.findIndex(w => w === word);
                    return renderWord(word, globalIndex, () => onWordClick?.(word));
                  }) || (
                    <span className="text-gray-600 italic">
                      {enSegment?.text || "No English caption"}
                    </span>
                  )}
                </div>
              </div>

              {/* Korean Column */}
              <div 
                className="cursor-pointer"
                onClick={() => koSegment && onSegmentClick?.(koSegment)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                    🇰🇷 KO
                  </span>
                  {showTimestamps && koSegment && (
                    <span className="text-xs text-gray-500">
                      {formatTime(koSegment.start)} - {formatTime(koSegment.end)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {koSegment?.words?.map((word, wordIndex) => {
                    const globalIndex = koreanWords.findIndex(w => w === word);
                    return renderWord(word, globalIndex, () => onWordClick?.(word));
                  }) || (
                    <span className="text-gray-600 italic">
                      {koSegment?.text || "No Korean caption"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to regular renderer for single language modes
  return (
    <CaptionsRenderer
      mode={mode}
      englishCaptions={englishCaptions}
      koreanCaptions={koreanCaptions}
      activeWordIndex={activeWordIndex}
      activeSegmentIndex={activeSegmentIndex}
      currentTime={currentTime}
      onWordClick={onWordClick}
      onSegmentClick={onSegmentClick}
      className={className}
      showTimestamps={showTimestamps}
      autoScroll={false}
    />
  );
}



