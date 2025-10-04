"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CaptionToggle, CaptionMode, useCaptionMode } from "./CaptionToggle";
import {
  CaptionsRenderer,
  SideBySideCaptionsRenderer,
  CaptionSegment,
} from "./CaptionsRenderer";
import { useCaptionData } from "@/hooks/useCaptionMode";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
} from "lucide-react";

interface VideoPlayerWithCaptionsProps {
  videoUrl?: string;
  englishCaptions?: CaptionSegment[];
  koreanCaptions?: CaptionSegment[];
  initialCaptionMode?: CaptionMode;
  persistKey?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  className?: string;
  onVideoReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onWordClick?: (word: { text: string; start: number; end: number }) => void;
  onSegmentClick?: (segment: CaptionSegment) => void;
}

export function VideoPlayerWithCaptions({
  videoUrl,
  englishCaptions = [],
  koreanCaptions = [],
  initialCaptionMode = "en",
  persistKey = "video-caption-mode",
  showControls = true,
  autoPlay = false,
  className = "",
  onVideoReady,
  onTimeUpdate,
  onWordClick,
  onSegmentClick,
}: VideoPlayerWithCaptionsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<"stacked" | "sidebyside">(
    "stacked"
  );

  // Use caption mode hook with persistence
  const { mode, setMode, isEnglish, isKorean, isBoth } = useCaptionMode(
    initialCaptionMode,
    persistKey
  );

  // Use caption data hook
  const {
    data: captionData,
    setBothCaptions,
    hasEnglish,
    hasKorean,
    hasBoth,
  } = useCaptionData();

  // Check if any captions are available
  const hasAny = hasEnglish || hasKorean;

  // Initialize caption data
  useEffect(() => {
    if (englishCaptions.length > 0 || koreanCaptions.length > 0) {
      setBothCaptions(englishCaptions, koreanCaptions);
    }
  }, [englishCaptions, koreanCaptions, setBothCaptions]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      onVideoReady?.();
    };

    const handleTimeUpdate = () => {
      const newTime = video.currentTime;
      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onVideoReady, onTimeUpdate]);

  // Update active word and segment based on current time
  useEffect(() => {
    const allWords = [
      ...englishCaptions.flatMap((seg) => seg.words || []),
      ...koreanCaptions.flatMap((seg) => seg.words || []),
    ];

    const activeWordIndex = allWords.findIndex(
      (word) => currentTime >= word.start && currentTime < word.end
    );

    if (activeWordIndex !== -1) {
      setActiveWordIndex(activeWordIndex);
    }

    // Find active segment
    const allSegments = [...englishCaptions, ...koreanCaptions];
    const activeSegmentIndex = allSegments.findIndex(
      (segment) => currentTime >= segment.start && currentTime < segment.end
    );

    if (activeSegmentIndex !== -1) {
      setActiveSegmentIndex(activeSegmentIndex);
    }
  }, [currentTime, englishCaptions, koreanCaptions]);

  // Video control functions
  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        await video.play();
      }
    } catch (error) {
      console.warn("Video play failed:", error);
      // Handle autoplay policy restrictions
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        // Try to enable autoplay by setting muted
        if (!video.muted) {
          video.muted = true;
          try {
            await video.play();
          } catch (mutedError) {
            console.warn("Muted video play also failed:", mutedError);
          }
        }
      }
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleWordClick = (word: {
    text: string;
    start: number;
    end: number;
  }) => {
    handleSeek(word.start);
    onWordClick?.(word);
  };

  const handleSegmentClick = (segment: CaptionSegment) => {
    handleSeek(segment.start);
    onSegmentClick?.(segment);
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handlePlaybackRateChange = (newRate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    handleVolumeChange(newVolume);
  };

  const handleSpeedSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = parseFloat(e.target.value);
    handlePlaybackRateChange(newRate);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Video Player */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-auto max-h-96 bg-black rounded-t-lg"
              autoPlay={autoPlay}
              muted={isMuted || autoPlay} // Auto-mute for autoplay
              onClick={handlePlayPause}
              playsInline
              preload="metadata"
            />

            {/* Video Overlay Controls */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <Button
                onClick={handlePlayPause}
                size="lg"
                className="opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <div
                className="w-full h-1 bg-white bg-opacity-30 rounded cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newTime = (clickX / rect.width) * duration;
                  handleSeek(newTime);
                }}
              >
                <div
                  className="h-full bg-red-500 rounded transition-all duration-100"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls Panel */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎮 Video Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Controls */}
            <div className="space-y-4">
              {/* Primary Controls Row */}
              <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                <Button
                  onClick={handlePlayPause}
                  variant={isPlaying ? "secondary" : "default"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>

                <Button onClick={() => handleSeek(0)} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>

                <Button onClick={handleFullscreen} variant="outline" size="sm">
                  <Maximize2 className="w-4 h-4" />
                  Fullscreen
                </Button>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm font-medium">Time:</span>
                  <Badge variant="secondary">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Badge>
                </div>
              </div>

              {/* Volume and Speed Controls Row */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                {/* Volume Control */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Volume:
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeSliderChange}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                          volume * 100
                        }%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                    <span className="text-xs text-gray-500 font-mono min-w-0">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  <Button
                    onClick={() =>
                      handleVolumeChange(isMuted ? volume || 1 : 0)
                    }
                    variant={isMuted ? "secondary" : "outline"}
                    size="sm"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Playback Speed Control */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Speed:
                  </span>

                  <select
                    value={playbackRate}
                    onChange={handleSpeedSelectChange}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="0.5">0.5x (Slow)</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x (Normal)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="1.75">1.75x</option>
                    <option value="2">2x (Fast)</option>
                  </select>

                  <Badge variant="outline" className="text-xs">
                    {playbackRate}x
                  </Badge>
                </div>
              </div>
            </div>

            {/* Caption Toggle */}
            <div className="flex items-center justify-between">
              <CaptionToggle
                mode={mode}
                onModeChange={setMode}
                className="flex-1"
                disabled={!hasAny}
              />

              {hasBoth && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Layout:</span>
                  <Button
                    onClick={() =>
                      setRenderMode(
                        renderMode === "stacked" ? "sidebyside" : "stacked"
                      )
                    }
                    variant="outline"
                    size="sm"
                  >
                    {renderMode === "stacked" ? "Stacked" : "Side-by-Side"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Captions Display */}
      {(hasEnglish || hasKorean) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 Live Captions
              <Badge variant={mode === "both" ? "default" : "secondary"}>
                {mode.toUpperCase()} Mode
              </Badge>
              <Badge variant="outline">Word {activeWordIndex + 1}</Badge>
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
      )}

      {/* No Captions Message */}
      {!hasEnglish && !hasKorean && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              No captions available for this video
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
