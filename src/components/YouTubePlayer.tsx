"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Settings,
  Maximize,
  Minimize,
} from "lucide-react";

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onEnd?: () => void;
  className?: string;
}

export interface YouTubePlayerRef {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  (
    {
      videoId,
      onTimeUpdate,
      onDurationChange,
      onPlay,
      onPause,
      onSeek,
      className = "",
    },
    ref
  ) => {
    const playerRef = useRef<HTMLDivElement>(null);
    const youtubePlayerRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        getCurrentTime: () => {
          if (
            youtubePlayerRef.current &&
            youtubePlayerRef.current.getCurrentTime
          ) {
            return youtubePlayerRef.current.getCurrentTime();
          }
          return currentTime;
        },
        seekTo: (seconds: number, allowSeekAhead = true) => {
          if (youtubePlayerRef.current && youtubePlayerRef.current.seekTo) {
            youtubePlayerRef.current.seekTo(seconds, allowSeekAhead);
          }
        },
        playVideo: () => {
          if (youtubePlayerRef.current && youtubePlayerRef.current.playVideo) {
            youtubePlayerRef.current.playVideo();
          }
        },
        pauseVideo: () => {
          if (youtubePlayerRef.current && youtubePlayerRef.current.pauseVideo) {
            youtubePlayerRef.current.pauseVideo();
          }
        },
        getPlayerState: () => {
          if (
            youtubePlayerRef.current &&
            youtubePlayerRef.current.getPlayerState
          ) {
            return youtubePlayerRef.current.getPlayerState();
          }
          return -1;
        },
      }),
      [] // Remove currentTime dependency to prevent re-initialization
    );

    useEffect(() => {
      // Only initialize if we don't have a player yet and we have a videoId
      if (!youtubePlayerRef.current && videoId) {
        console.log("🎬 Initializing YouTube player for video:", videoId);

        // YouTube IFrame API 로드
        if (!window.YT) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          const firstScriptTag = document.getElementsByTagName("script")[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        // YouTube API 로드 완료 후 플레이어 초기화
        const initializePlayer = () => {
          if (playerRef.current && videoId && !youtubePlayerRef.current) {
            console.log("🚀 Creating YouTube player instance");
            youtubePlayerRef.current = new window.YT.Player(playerRef.current, {
              height: "100%",
              width: "100%",
              videoId: videoId,
              playerVars: {
                autoplay: 0,
                controls: 0, // 커스텀 컨트롤 사용
                disablekb: 0,
                enablejsapi: 1,
                fs: 1,
                iv_load_policy: 3,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                showinfo: 0,
              },
              events: {
                onReady: (event: any) => {
                  console.log("✅ YouTube player ready");
                  const player = event.target;
                  setDuration(player.getDuration());
                  onDurationChange?.(player.getDuration());
                },
                onStateChange: (event: any) => {
                  const state = event.data;
                  if (state === window.YT.PlayerState.PLAYING) {
                    setIsPlaying(true);
                    onPlay?.();
                  } else if (state === window.YT.PlayerState.PAUSED) {
                    setIsPlaying(false);
                    onPause?.();
                  } else if (state === window.YT.PlayerState.ENDED) {
                    setIsPlaying(false);
                    onEnd?.();
                  }
                },
              },
            });
          }
        };

        window.onYouTubeIframeAPIReady = initializePlayer;

        // 기존 API가 이미 로드된 경우
        if (window.YT && window.YT.Player) {
          initializePlayer();
        }
      }

      return () => {
        // Only destroy when videoId changes, not on every re-render
        if (youtubePlayerRef.current) {
          console.log("🗑️ Destroying YouTube player");
          youtubePlayerRef.current.destroy();
          youtubePlayerRef.current = null;
        }
      };
    }, [videoId]); // Only depend on videoId, not on callback props

    // 시간 업데이트 폴링 - 더 자주 업데이트하지만 상태는 조건부로만 업데이트
    useEffect(() => {
      if (!youtubePlayerRef.current) return;

      const interval = setInterval(() => {
        if (
          youtubePlayerRef.current &&
          youtubePlayerRef.current.getCurrentTime
        ) {
          const time = youtubePlayerRef.current.getCurrentTime();

          // Only update state if time has actually changed to prevent unnecessary re-renders
          setCurrentTime((prevTime) => {
            const timeDiff = Math.abs(time - prevTime);
            return timeDiff > 0.1 ? time : prevTime; // Only update if change is significant
          });

          // Always call onTimeUpdate for transcript sync
          onTimeUpdate?.(time);
        }
      }, 250); // Update more frequently for smooth transcript sync

      return () => clearInterval(interval);
    }, []); // Remove onTimeUpdate dependency to prevent re-creation

    const togglePlay = () => {
      if (!youtubePlayerRef.current) return;

      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
    };

    const setVolumeLevel = (newVolume: number) => {
      if (!youtubePlayerRef.current) return;

      setVolume(newVolume);
      youtubePlayerRef.current.setVolume(newVolume);
    };

    const setPlaybackSpeed = (rate: number) => {
      if (!youtubePlayerRef.current) return;

      setPlaybackRate(rate);
      youtubePlayerRef.current.setPlaybackRate(rate);
    };

    const seekTo = (seconds: number) => {
      if (!youtubePlayerRef.current) return;
      youtubePlayerRef.current.seekTo(seconds, true);
      onSeek?.(seconds);
    };

    // Keyboard navigation handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!youtubePlayerRef.current) return;

      switch (e.key) {
        case " ": // Space bar
        case "k": // K key
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(Math.min(duration, currentTime + 5));
          break;
        case "j":
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 10));
          break;
        case "l":
          e.preventDefault();
          seekTo(Math.min(duration, currentTime + 10));
          break;
        case "m":
          e.preventDefault();
          setVolumeLevel(volume === 0 ? 100 : 0);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolumeLevel(Math.min(100, volume + 10));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolumeLevel(Math.max(0, volume - 10));
          break;
        case ">":
        case ".":
          e.preventDefault();
          setPlaybackSpeed(Math.min(2, playbackRate + 0.25));
          break;
        case "<":
        case ",":
          e.preventDefault();
          setPlaybackSpeed(Math.max(0.25, playbackRate - 0.25));
          break;
        case "0":
        case "Home":
          e.preventDefault();
          seekTo(0);
          break;
        case "End":
          e.preventDefault();
          seekTo(duration);
          break;
        default:
          // Number keys 1-9 for seeking to percentage
          if (e.key >= "1" && e.key <= "9") {
            e.preventDefault();
            const percent = parseInt(e.key) / 10;
            seekTo(duration * percent);
          }
          break;
      }
    };

    const toggleFullscreen = () => {
      if (!playerRef.current) return;

      if (!isFullscreen) {
        if (playerRef.current.requestFullscreen) {
          playerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    };

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!playerRef.current) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;

      seekTo(newTime);
    };

    return (
      <Card className={`border-0 shadow-lg overflow-hidden ${className}`}>
        <CardContent className="p-0">
          {/* YouTube Player Container */}
          <div
            ref={playerRef}
            className="relative aspect-video bg-black"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="region"
            aria-label="비디오 플레이어"
            aria-describedby="player-help"
          >
            {/* Screen Reader Help Text */}
            <div id="player-help" className="sr-only">
              키보드 단축키: 스페이스바나 K로 재생/일시정지, 화살표
              왼쪽/오른쪽으로 5초 이동, J/L로 10초 이동, M으로 음소거, F로
              전체화면, 화살표 위/아래로 볼륨 조절, 쉼표/마침표로 재생 속도
              조절, 숫자 1-9로 비디오 특정 위치로 이동
            </div>
            {/* Custom Controls Overlay */}
            {showControls && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
                {/* Top Controls */}
                <div className="absolute top-4 right-4 flex space-x-2 pointer-events-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-black/50 text-white hover:bg-black/70"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "전체화면 종료" : "전체화면"}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
                  {/* Progress Bar */}
                  <div
                    className="w-full bg-white/30 rounded-full h-1 mb-4 cursor-pointer"
                    onClick={handleProgressClick}
                    role="slider"
                    aria-label="비디오 진행률"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={currentTime}
                    aria-valuetext={`${formatTime(currentTime)} / ${formatTime(
                      duration
                    )}`}
                    tabIndex={0}
                  >
                    <div
                      className="bg-red-500 h-1 rounded-full transition-all"
                      style={{
                        width: `${
                          duration > 0 ? (currentTime / duration) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={togglePlay}
                        aria-label={isPlaying ? "일시정지" : "재생"}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </Button>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={() => setVolumeLevel(volume === 0 ? 100 : 0)}
                          aria-label={volume === 0 ? "음소거 해제" : "음소거"}
                        >
                          {volume === 0 ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) =>
                            setVolumeLevel(Number(e.target.value))
                          }
                          className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                          aria-label="볼륨 조절"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={volume}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={() => seekTo(Math.max(0, currentTime - 10))}
                          aria-label="10초 뒤로"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={() =>
                            seekTo(Math.min(duration, currentTime + 10))
                          }
                          aria-label="10초 앞으로"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <select
                        value={playbackRate}
                        onChange={(e) =>
                          setPlaybackSpeed(Number(e.target.value))
                        }
                        className="bg-black/50 text-white text-sm rounded px-2 py-1 border-0"
                        aria-label="재생 속도"
                      >
                        <option value={0.5}>0.5x</option>
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2x</option>
                      </select>

                      <div
                        className="text-white text-sm"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

YouTubePlayer.displayName = "YouTubePlayer";

export default YouTubePlayer;

// YouTube IFrame API 타입 정의
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
