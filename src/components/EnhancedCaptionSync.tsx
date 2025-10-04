"use client";

import React, { useRef, useEffect } from "react";
import { useHighPerformanceSync, Cue } from "@/hooks/useHighPerformanceSync";

interface EnhancedCaptionSyncProps {
  cues: Cue[];
  playerRef: React.RefObject<any> | null;
  videoRef: React.RefObject<HTMLVideoElement> | null;
  captionMode: "EN" | "KO" | "BOTH";
  className?: string;
  maxHeight?: string;
  onCueClick?: (cue: Cue, time: number) => void;
  showTimestamps?: boolean;
  debug?: boolean;
}

export function EnhancedCaptionSync({
  cues,
  playerRef,
  videoRef,
  captionMode,
  className = "",
  maxHeight = "max-h-48",
  onCueClick,
  showTimestamps = true,
  debug = false,
}: EnhancedCaptionSyncProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeElementRef = useRef<HTMLDivElement>(null);

  const { activeCueIndex, activeCue, currentTime, isPlaying, seekTo } =
    useHighPerformanceSync(cues, playerRef, videoRef, { debug });

  // Auto-scroll to active cue
  useEffect(() => {
    if (activeElementRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeElement = activeElementRef.current;

      // Only scroll if the active element is not visible
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();

      const isVisible =
        activeRect.top >= containerRect.top &&
        activeRect.bottom <= containerRect.bottom;

      if (!isVisible) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeCueIndex]);

  const handleCueClick = (cue: Cue) => {
    if (onCueClick) {
      onCueClick(cue, cue.start);
    } else {
      seekTo(cue.start);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (!cues.length) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        <p className="text-sm">자막을 불러올 수 없습니다</p>
        <p className="text-xs">자막 데이터가 없거나 처리 중입니다</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-gray-50 rounded-lg p-4 overflow-y-auto ${maxHeight} ${className}`}
    >
      <div className="space-y-2">
        {cues.map((cue, index) => {
          const isActive = index === activeCueIndex;
          const isCurrent = isActive;
          const isPast = currentTime > cue.end;

          return (
            <div
              key={`${cue.start}-${cue.end}-${index}`}
              ref={isActive ? activeElementRef : null}
              className={`p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-blue-100 border-l-4 border-blue-500 shadow-sm transform scale-[1.02]"
                  : isCurrent
                  ? "bg-yellow-50 border-l-4 border-yellow-400"
                  : isPast
                  ? "bg-gray-50 border border-gray-200 opacity-70"
                  : "bg-white border border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => handleCueClick(cue)}
            >
              {/* Timestamp indicator */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive
                        ? "bg-blue-500 animate-pulse"
                        : isPast
                        ? "bg-gray-400"
                        : "bg-gray-300"
                    }`}
                  />
                  {showTimestamps && (
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(cue.start)} - {formatTime(cue.end)}
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className="text-xs text-blue-600 font-medium">
                    {formatTime(currentTime)}
                  </span>
                )}
              </div>

              {/* Caption content */}
              {captionMode === "EN" && (
                <div className="text-sm font-medium text-gray-800">
                  {cue.en || cue.text}
                </div>
              )}
              {captionMode === "KO" && (
                <div className="text-sm font-medium text-gray-800">
                  {cue.ko}
                </div>
              )}
              {captionMode === "BOTH" && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-800">
                    {cue.en || cue.text}
                  </div>
                  {cue.ko && (
                    <div className="text-sm text-gray-600">{cue.ko}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Debug info */}
        {debug && (
          <div className="mt-4 p-2 bg-black text-white text-xs rounded">
            <div>
              Active: {activeCueIndex}/{cues.length}
            </div>
            <div>Time: {currentTime.toFixed(2)}s</div>
            <div>Playing: {isPlaying ? "Yes" : "No"}</div>
            {activeCue && (
              <div>
                Active Cue: {formatTime(activeCue.start)}-
                {formatTime(activeCue.end)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



