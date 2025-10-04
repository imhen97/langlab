"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Cue } from "@/lib/youtube";

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface EnhancedCue extends Cue {
  words?: WordTiming[];
}

interface EnhancedTranscriptProps {
  videoId: string;
  selectedLang: string;
  playerType: "youtube" | "html5";
  getCurrentTime?: () => number;
  getPlaybackRate?: () => number;
  onSeek?: (time: number) => void;
  className?: string;
}

export function EnhancedTranscript({
  videoId,
  selectedLang,
  playerType,
  getCurrentTime,
  getPlaybackRate,
  onSeek,
  className = "",
}: EnhancedTranscriptProps) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [cues, setCues] = useState<EnhancedCue[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [activeCueIndex, setActiveCueIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const activeCueRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Generate word-level timing for better synchronization
  const generateWordTimings = useCallback((cue: Cue): WordTiming[] => {
    const words = cue.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const duration = cue.end - cue.start;
    const wordDuration = duration / words.length;

    return words.map((word, index) => ({
      word,
      start: cue.start + index * wordDuration,
      end: cue.start + (index + 1) * wordDuration,
    }));
  }, []);

  // Fetch available caption tracks
  const fetchTracks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/captions/list?videoUrl=https://www.youtube.com/watch?v=${videoId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTracks(data.tracks || []);

      // Auto-select first track if available
      if (data.tracks && data.tracks.length > 0) {
        setCurrentTrack(data.tracks[0]);
      }
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tracks");
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  // Fetch caption content
  const fetchCaptions = useCallback(
    async (track: any) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/captions/file?videoUrl=https://www.youtube.com/watch?v=${videoId}&lang=${track.langCode}&format=vtt`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const enhancedCues: EnhancedCue[] = data.cues.map((cue: Cue) => ({
          ...cue,
          words: generateWordTimings(cue),
        }));

        setCues(enhancedCues);
      } catch (err) {
        console.error("Failed to fetch captions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch captions"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [videoId, generateWordTimings]
  );

  // Update active cue and word based on current time
  const updateActiveCue = useCallback(() => {
    if (!getCurrentTime || cues.length === 0) return;

    const currentTime = getCurrentTime();

    // Binary search for active cue
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

    // Update active cue
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

    // Find active word within the active cue
    if (activeIndex >= 0 && cues[activeIndex].words) {
      const words = cues[activeIndex].words!;
      let wordIndex = -1;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (currentTime >= word.start && currentTime < word.end) {
          wordIndex = i;
          break;
        }
      }

      if (wordIndex !== activeWordIndex) {
        setActiveWordIndex(wordIndex);
      }
    } else {
      setActiveWordIndex(-1);
    }
  }, [getCurrentTime, cues, activeCueIndex, activeWordIndex, autoScroll]);

  // Animation loop for smooth synchronization
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
    (cue: EnhancedCue) => {
      if (onSeek) {
        onSeek(cue.start);
      }
    },
    [onSeek]
  );

  // Handle word click for seeking
  const handleWordClick = useCallback(
    (word: WordTiming) => {
      if (onSeek) {
        onSeek(word.start);
      }
    },
    [onSeek]
  );

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  if (isLoading && cues.length === 0) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading captions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className="text-red-600 mb-2">Error loading captions</p>
        <p className="text-sm text-gray-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchTracks();
          }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (cues.length === 0) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className="text-gray-600">No captions available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">
            Track: {currentTrack?.langName || selectedLang}
          </span>
          <span className="text-sm text-gray-600">{cues.length} cues</span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-sm px-3 py-1 rounded ${
            autoScroll ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Auto-scroll: {autoScroll ? "ON" : "OFF"}
        </button>
      </div>

      {/* Caption List */}
      <div className="max-h-96 overflow-y-auto space-y-1">
        {cues.map((cue, cueIndex) => {
          const isActive = cueIndex === activeCueIndex;
          const words = cue.words || [];

          return (
            <div
              key={cueIndex}
              ref={isActive ? activeCueRef : null}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isActive
                  ? "bg-blue-100 border-l-4 border-blue-500 shadow-md"
                  : "bg-white hover:bg-gray-50 border-l-4 border-transparent"
              }`}
              onClick={() => handleCueClick(cue)}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs text-gray-500 font-mono">
                  {formatTime(cue.start)} - {formatTime(cue.end)}
                </span>
                <span className="text-xs text-gray-400">
                  {words.length} words
                </span>
              </div>

              {/* Word-level highlighting */}
              <div className="text-gray-800 leading-relaxed">
                {words.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {words.map((word, wordIndex) => {
                      const isWordActive =
                        isActive && wordIndex === activeWordIndex;
                      return (
                        <span
                          key={wordIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(word);
                          }}
                          className={`inline-block px-1 py-0.5 rounded transition-all duration-150 ${
                            isWordActive
                              ? "bg-yellow-300 text-black font-semibold scale-105"
                              : "hover:bg-gray-200"
                          }`}
                          title={`${formatTime(word.start)} - ${formatTime(
                            word.end
                          )}`}
                        >
                          {word.word}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className={isActive ? "font-medium" : ""}>
                    {cue.text}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      {activeCueIndex >= 0 && (
        <div className="p-2 bg-blue-50 rounded text-sm text-blue-700">
          Active: {activeCueIndex + 1}/{cues.length}
          {activeWordIndex >= 0 &&
            ` • Word: ${activeWordIndex + 1}/${
              cues[activeCueIndex].words?.length || 0
            }`}
        </div>
      )}
    </div>
  );
}



