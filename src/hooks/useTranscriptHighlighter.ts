"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
  words?: WordTiming[];
}

interface UseTranscriptHighlighterOptions {
  enabled?: boolean;
  updateInterval?: number; // milliseconds
  threshold?: number; // time threshold for word activation
}

interface UseTranscriptHighlighterReturn {
  activeWordIndex: number;
  activeSegmentIndex: number;
  currentTime: number;
  isPlaying: boolean;
  progress: number; // 0-1 progress through current word
}

/**
 * Custom hook for real-time word-level highlighting in video transcripts
 * 
 * @param videoRef - React ref to the video element
 * @param transcript - Array of caption segments with word timings
 * @param options - Configuration options
 * @returns Object with active indices and video state
 */
export function useTranscriptHighlighter(
  videoRef: React.RefObject<HTMLVideoElement>,
  transcript: CaptionSegment[],
  options: UseTranscriptHighlighterOptions = {}
): UseTranscriptHighlighterReturn {
  const {
    enabled = true,
    updateInterval = 50, // 50ms updates for smooth highlighting
    threshold = 0.1, // 100ms threshold for word activation
  } = options;

  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  // Flatten all words from all segments for easier indexing
  const allWords = transcript.flatMap((segment, segmentIndex) =>
    segment.words?.map((word, wordIndex) => ({
      ...word,
      segmentIndex,
      wordIndex,
      globalIndex: transcript.slice(0, segmentIndex).reduce(
        (total, seg) => total + (seg.words?.length || 0), 
        wordIndex
      ),
    })) || []
  );

  // Update highlighting based on current video time
  const updateHighlighting = useCallback((videoTime: number) => {
    if (!enabled || allWords.length === 0) {
      setActiveWordIndex(-1);
      setActiveSegmentIndex(-1);
      setProgress(0);
      return;
    }

    // Find the active word using binary search for efficiency
    let left = 0;
    let right = allWords.length - 1;
    let activeWord = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const word = allWords[mid];

      if (videoTime >= word.start - threshold && videoTime < word.end + threshold) {
        activeWord = word;
        break;
      } else if (videoTime < word.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    if (activeWord) {
      setActiveWordIndex(activeWord.globalIndex);
      setActiveSegmentIndex(activeWord.segmentIndex);
      
      // Calculate progress through the current word (0-1)
      const wordDuration = activeWord.end - activeWord.start;
      const wordProgress = wordDuration > 0 
        ? Math.max(0, Math.min(1, (videoTime - activeWord.start) / wordDuration))
        : 0;
      setProgress(wordProgress);
    } else {
      setActiveWordIndex(-1);
      setActiveSegmentIndex(-1);
      setProgress(0);
    }
  }, [allWords, enabled, threshold]);

  // Main animation loop for smooth updates
  const animate = useCallback(() => {
    const now = performance.now();
    
    // Throttle updates to specified interval for performance
    if (now - lastUpdateTimeRef.current >= updateInterval) {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        const videoTime = video.currentTime;
        setCurrentTime(videoTime);
        updateHighlighting(videoTime);
        lastUpdateTimeRef.current = now;
      }
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [videoRef, updateHighlighting, updateInterval]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

    const handleTimeUpdate = () => {
      const videoTime = video.currentTime;
      setCurrentTime(videoTime);
      updateHighlighting(videoTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleSeeked = () => {
      const videoTime = video.currentTime;
      setCurrentTime(videoTime);
      updateHighlighting(videoTime);
    };

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('seeked', handleSeeked);

    // Initial update
    handleTimeUpdate();

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [videoRef, updateHighlighting, enabled]);

  // Start/stop animation loop
  useEffect(() => {
    if (enabled && isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, isPlaying, animate]);

  // Reset when transcript changes
  useEffect(() => {
    setActiveWordIndex(-1);
    setActiveSegmentIndex(-1);
    setProgress(0);
  }, [transcript]);

  return {
    activeWordIndex,
    activeSegmentIndex,
    currentTime,
    isPlaying,
    progress,
  };
}

/**
 * Utility function to generate word-level timings from segment text
 * This is useful when you only have segment-level timestamps
 */
export function generateWordTimings(
  segments: CaptionSegment[]
): CaptionSegment[] {
  return segments.map(segment => {
    if (segment.words && segment.words.length > 0) {
      return segment; // Already has word timings
    }

    // Generate word timings by dividing segment duration equally among words
    const words = segment.text.split(/\s+/).filter(Boolean);
    const segmentDuration = segment.end - segment.start;
    const wordDuration = segmentDuration / words.length;

    const wordsWithTimings: WordTiming[] = words.map((word, index) => ({
      text: word,
      start: segment.start + index * wordDuration,
      end: segment.start + (index + 1) * wordDuration,
    }));

    return {
      ...segment,
      words: wordsWithTimings,
    };
  });
}

/**
 * Utility function to seek video to specific word
 */
export function seekToWord(
  videoRef: React.RefObject<HTMLVideoElement>,
  word: WordTiming
): void {
  const video = videoRef.current;
  if (video && word) {
    video.currentTime = word.start;
  }
}

/**
 * Utility function to format time for display
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}



