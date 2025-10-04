"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
  Settings,
} from "lucide-react";

interface VideoPlayerProps {
  videoUrl?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showControls?: boolean;
  onVideoReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const playbackSpeeds = [
  { value: 0.5, label: "0.5x (Slow)" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x (Normal)" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 1.75, label: "1.75x" },
  { value: 2, label: "2x (Fast)" },
];

export function VideoPlayer({
  videoUrl,
  title = "Video Player",
  className = "",
  autoPlay = false,
  muted = false,
  showControls = true,
  onVideoReady,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setLoadError(null);
      setPlayError(null);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      onVideoReady?.();
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = (event: Event) => {
      setIsLoading(false);
      const error = video.error;
      console.error("Video error event:", event);
      console.error("Video error object:", error);

      if (error) {
        let errorMessage = "비디오 로딩 중 오류가 발생했습니다.";
        let errorDetails = "";

        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = "비디오 로딩이 중단되었습니다.";
            errorDetails = "사용자나 브라우저가 비디오 로딩을 중단했습니다.";
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = "네트워크 오류로 비디오를 로딩할 수 없습니다.";
            errorDetails = "인터넷 연결을 확인하거나 다른 URL을 시도해보세요.";
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = "비디오 디코딩 오류가 발생했습니다.";
            errorDetails =
              "비디오 파일이 손상되었거나 지원되지 않는 형식입니다.";
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage =
              "지원되지 않는 비디오 형식이거나 URL이 유효하지 않습니다.";
            errorDetails = "MP4, WebM, OGG 형식의 비디오를 사용해주세요.";
            break;
          default:
            errorDetails = `알 수 없는 오류 (코드: ${error.code})`;
        }

        const fullErrorMessage = errorDetails
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;
        setLoadError(fullErrorMessage);

        // Additional debugging info
        console.error("Video error details:", {
          code: error.code,
          message: error.message || "No message",
          networkState: video.networkState,
          readyState: video.readyState,
          src: video.src,
          currentSrc: video.currentSrc,
        });
      } else {
        // Fallback error handling when error object is empty
        setLoadError(
          "비디오를 로딩할 수 없습니다. URL을 확인하거나 다른 비디오를 시도해보세요."
        );
        console.error("Video error occurred but error object is empty");
      }
    };

    const handleTimeUpdate = () => {
      const newTime = video.currentTime;
      setCurrentTime(newTime);
      onTimeUpdate?.(newTime);
    };

    const handleProgress = () => {
      setBufferedRanges(video.buffered);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleRateChange = () => {
      setPlaybackRate(video.playbackRate);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ratechange", handleRateChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ratechange", handleRateChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [onVideoReady, onTimeUpdate, onPlay, onPause, onEnded]);

  // Reset states when video URL changes
  useEffect(() => {
    setPlayError(null);
    setLoadError(null);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [videoUrl]);

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
        setPlayError(
          "브라우저 정책으로 인해 자동재생이 차단되었습니다. 음소거 상태로 재생을 시도합니다."
        );
        // Try to enable autoplay by setting muted
        if (!video.muted) {
          video.muted = true;
          setIsMuted(true);
          try {
            await video.play();
            setPlayError(null); // Clear error if muted play succeeds
          } catch (mutedError) {
            console.warn("Muted video play also failed:", mutedError);
            setPlayError(
              "비디오 재생에 실패했습니다. 페이지를 새로고침하거나 다른 브라우저를 시도해보세요."
            );
          }
        }
      } else {
        console.error("Video play error details:", error);
        setPlayError(
          `비디오 재생 중 오류가 발생했습니다: ${
            error instanceof Error ? error.message : "알 수 없는 오류"
          }`
        );
      }
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
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

  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = Math.max(
      0,
      Math.min(video.duration, video.currentTime + seconds)
    );
    handleSeek(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getBufferedPercentage = (): number => {
    if (!bufferedRanges || bufferedRanges.length === 0 || duration === 0)
      return 0;

    let maxBuffered = 0;
    for (let i = 0; i < bufferedRanges.length; i++) {
      const end = bufferedRanges.end(i);
      if (end > maxBuffered && end > currentTime) {
        maxBuffered = end;
      }
    }

    return (maxBuffered / duration) * 100;
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          🎬 {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Video Element */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-auto max-h-96 bg-black"
            autoPlay={autoPlay}
            muted={isMuted || autoPlay} // Auto-mute for autoplay
            onClick={handlePlayPause}
            playsInline
            preload="metadata"
          />

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white px-4 py-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-700">
                    비디오 로딩 중...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Load Error Message */}
          {loadError && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-lg text-center">
                <p className="text-sm font-semibold mb-2">비디오 로딩 실패</p>
                <div className="text-sm mb-3 whitespace-pre-line text-left max-h-32 overflow-y-auto">
                  {loadError}
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setLoadError(null);
                      setIsLoading(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    다시 시도
                  </Button>
                  <Button
                    onClick={() => setLoadError(null)}
                    variant="outline"
                    size="sm"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Play Error Message */}
          {playError && !loadError && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md text-center">
                <p className="text-sm">{playError}</p>
                <Button
                  onClick={() => setPlayError(null)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}

          {/* Video Overlay Controls */}
          {!playError && (
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <Button
                onClick={handlePlayPause}
                size="lg"
                className="opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50 text-white border-0"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </Button>
            </div>
          )}

          {/* Progress Bar Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4">
            {/* Buffered Progress */}
            <div className="w-full h-1 bg-white bg-opacity-20 rounded mb-1">
              <div
                className="h-full bg-white bg-opacity-40 rounded transition-all duration-100"
                style={{ width: `${getBufferedPercentage()}%` }}
              />
            </div>

            {/* Current Progress */}
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

        {/* Controls Panel */}
        {showControls && (
          <div className="p-4 space-y-4 bg-gray-50">
            {/* Primary Controls */}
            <div className="flex items-center gap-3">
              <Button onClick={handlePlayPause} size="sm">
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <Button
                onClick={() => handleSkip(-10)}
                variant="outline"
                size="sm"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => handleSkip(10)}
                variant="outline"
                size="sm"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              <Button onClick={() => handleSeek(0)} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button onClick={handleFullscreen} variant="outline" size="sm">
                <Maximize2 className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume and Speed Controls */}
            <div className="flex items-center gap-6">
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
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
                  onClick={() => handleVolumeChange(isMuted ? volume || 1 : 0)}
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
                  {playbackSpeeds.map((speed) => (
                    <option key={speed.value} value={speed.value}>
                      {speed.label}
                    </option>
                  ))}
                </select>

                <Badge variant="outline" className="text-xs">
                  {playbackRate}x
                </Badge>
              </div>

              {/* Settings Toggle */}
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            {/* Advanced Settings Panel */}
            {showSettings && (
              <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                <h4 className="font-medium text-gray-900">Advanced Settings</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Current Time:</span>
                      <span className="font-mono">
                        {formatTime(currentTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-mono">{formatTime(duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Playback Rate:</span>
                      <span className="font-mono">{playbackRate}x</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span className="font-mono">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Muted:</span>
                      <span className="font-mono">
                        {isMuted ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fullscreen:</span>
                      <span className="font-mono">
                        {isFullscreen ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Speed Buttons */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Quick Speed:</span>
                  <div className="flex gap-2">
                    {[0.5, 1, 1.5, 2].map((speed) => (
                      <Button
                        key={speed}
                        onClick={() => handlePlaybackRateChange(speed)}
                        variant={playbackRate === speed ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
