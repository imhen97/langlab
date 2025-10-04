"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CaptionTrack {
  langCode: string;
  langName: string;
  kind: "manual" | "asr";
}

export interface Cue {
  start: number;
  end: number;
  text: string;
}

interface TranscriptProps {
  videoId: string;
  selectedLang?: string;
  playerType: "youtube" | "html5";
  getCurrentTime?: () => number;
  getPlaybackRate?: () => number;
  onSeek?: (time: number) => void;
  className?: string;
}

export function Transcript({
  videoId,
  selectedLang,
  playerType,
  getCurrentTime,
  getPlaybackRate,
  onSeek,
  className,
}: TranscriptProps) {
  const [tracks, setTracks] = useState<CaptionTrack[]>([]);
  const [cues, setCues] = useState<Cue[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(
    selectedLang || null
  );
  const [activeCueIndex, setActiveCueIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeCueRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Fetch available caption tracks
  const fetchTracks = useCallback(async () => {
    if (!videoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/captions/list?videoUrl=https://www.youtube.com/watch?v=${videoId}`
      );

      if (response.status === 204) {
        setError("No captions available for this video");
        setTracks([]);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to fetch caption tracks");
      }

      const data = await response.json();
      setTracks(data.tracks || []);

      // Auto-select first track if none selected
      if (!currentTrack && data.tracks.length > 0) {
        setCurrentTrack(data.tracks[0].langCode);
      }
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch caption tracks"
      );
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, currentTrack]);

  // Fetch caption content for selected language
  const fetchCaptions = useCallback(
    async (langCode: string) => {
      if (!videoId || !langCode) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/captions/file?videoUrl=https://www.youtube.com/watch?v=${videoId}&lang=${langCode}&format=vtt`
        );

        if (response.status === 204) {
          setError("No captions available in this language");
          setCues([]);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to fetch captions");
        }

        const data = await response.json();
        setCues(data.cues || []);
        setActiveCueIndex(-1);
      } catch (err) {
        console.error("Failed to fetch captions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch captions"
        );
        setCues([]);
      } finally {
        setIsLoading(false);
      }
    },
    [videoId]
  );

  // Update active cue based on current time
  const updateActiveCue = useCallback(() => {
    if (!getCurrentTime || cues.length === 0) return;

    const currentTime = getCurrentTime();

    // Binary search for the active cue
    let left = 0;
    let right = cues.length - 1;
    let activeIndex = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cue = cues[mid];

      if (currentTime >= cue.start && currentTime < cue.end) {
        activeIndex = mid;
        break;
      } else if (currentTime < cue.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    if (activeIndex !== activeCueIndex) {
      setActiveCueIndex(activeIndex);

      // Auto-scroll to active cue
      if (autoScroll && activeCueRef.current) {
        activeCueRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [getCurrentTime, cues, activeCueIndex, autoScroll]);

  // Animation loop for sync
  useEffect(() => {
    if (!getCurrentTime || cues.length === 0) return;

    const animate = () => {
      updateActiveCue();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [getCurrentTime, cues, updateActiveCue]);

  // Load tracks on mount
  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Load captions when track changes
  useEffect(() => {
    if (currentTrack) {
      fetchCaptions(currentTrack);
    }
  }, [currentTrack, fetchCaptions]);

  // Handle cue click for seeking
  const handleCueClick = useCallback(
    (cue: Cue) => {
      if (onSeek) {
        onSeek(cue.start);
      }
    },
    [onSeek]
  );

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Get track display name
  const getTrackDisplayName = useCallback((track: CaptionTrack) => {
    if (track.kind === "manual") {
      return `${track.langName} (Manual)`;
    }
    return `${track.langName} (Auto)`;
  }, []);

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Transcript</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                "text-xs",
                autoScroll && "bg-blue-100 text-blue-700"
              )}
            >
              Auto-scroll
            </Button>
          </div>
        </div>

        {/* Language selector */}
        {tracks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tracks.map((track) => (
              <Button
                key={track.langCode}
                variant={
                  currentTrack === track.langCode ? "default" : "outline"
                }
                size="sm"
                onClick={() => setCurrentTrack(track.langCode)}
                className="text-xs"
              >
                {getTrackDisplayName(track)}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading captions...</span>
          </div>
        ) : cues.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📝</div>
            <p className="text-sm text-gray-600">No captions available</p>
          </div>
        ) : (
          <div
            ref={transcriptRef}
            className="max-h-96 overflow-y-auto space-y-1"
          >
            {cues.map((cue, index) => (
              <div
                key={index}
                ref={index === activeCueIndex ? activeCueRef : null}
                onClick={() => handleCueClick(cue)}
                className={cn(
                  "p-2 rounded cursor-pointer transition-colors text-sm",
                  "hover:bg-gray-50 border-l-2",
                  index === activeCueIndex
                    ? "bg-blue-50 border-blue-500 text-blue-900"
                    : "border-transparent hover:border-gray-200"
                )}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-xs text-gray-500 mt-0.5 flex-shrink-0">
                    {formatTime(cue.start)}
                  </span>
                  <span className="flex-1 leading-relaxed">{cue.text}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
