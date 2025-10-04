/**
 * Transcript synchronization hook for video playback
 * Uses binary search and hysteresis to prevent flickering
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface TranscriptSegment {
  start: number;
  end: number;
  en: string;
  ko: string; // Always present
}

interface UseTranscriptSyncOptions {
  /**
   * Hysteresis range in seconds to prevent flickering
   * Default: 0.12s
   */
  hysteresis?: number;

  /**
   * Whether to enable debug logging
   * Default: false
   */
  debug?: boolean;
}

/**
 * Hook to synchronize transcript with video playback
 *
 * @param getTime Function that returns current video time in seconds
 * @param segments Array of transcript segments sorted by start time
 * @param offsetMs Optional offset in milliseconds to apply to video time
 * @param options Additional options for sync behavior
 * @returns Current segment index (-1 if no segment is active)
 */
export function useTranscriptSync(
  getTime: () => number,
  segments: TranscriptSegment[],
  offsetMs: number = 0,
  options: UseTranscriptSyncOptions = {}
): number {
  const { hysteresis = 0.12, debug = false } = options;

  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const lastIndexRef = useRef<number>(-1);

  /**
   * Binary search to find the segment that contains the given time
   * Returns -1 if no segment contains the time
   */
  const findSegmentIndex = useCallback(
    (time: number): number => {
      if (!segments || segments.length === 0) {
        return -1;
      }

      let left = 0;
      let right = segments.length - 1;
      let result = -1;

      // Binary search for the segment containing the time
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const segment = segments[mid];

        if (time >= segment.start && time <= segment.end) {
          // Found exact match
          result = mid;
          break;
        } else if (time < segment.start) {
          // Time is before this segment
          right = mid - 1;
        } else {
          // Time is after this segment
          left = mid + 1;
        }
      }

      // If no exact match found, check if we're close to any segment
      if (result === -1) {
        // Check the segment at 'left' position (next segment)
        if (left < segments.length) {
          const nextSegment = segments[left];
          if (
            time >= nextSegment.start - hysteresis &&
            time <= nextSegment.end + hysteresis
          ) {
            result = left;
          }
        }

        // Check the segment at 'right' position (previous segment)
        if (result === -1 && right >= 0) {
          const prevSegment = segments[right];
          if (
            time >= prevSegment.start - hysteresis &&
            time <= prevSegment.end + hysteresis
          ) {
            result = right;
          }
        }
      }

      return result;
    },
    [segments, hysteresis]
  );

  /**
   * Apply hysteresis to prevent flickering when transitioning between segments
   */
  const applyHysteresis = useCallback(
    (newIndex: number, currentTime: number, lastIndex: number): number => {
      // If no previous index, use new index
      if (lastIndex === -1) {
        return newIndex;
      }

      // If indices are the same, no change needed
      if (newIndex === lastIndex) {
        return newIndex;
      }

      // If we found a valid segment, check hysteresis
      if (newIndex !== -1 && lastIndex !== -1) {
        const currentSegment = segments[lastIndex];
        const newSegment = segments[newIndex];

        // If we're transitioning away from current segment,
        // make sure we're far enough to avoid flickering
        if (currentSegment) {
          const distanceFromCurrent = Math.min(
            Math.abs(currentTime - currentSegment.start),
            Math.abs(currentTime - currentSegment.end)
          );

          // Stay with current segment if we're within hysteresis range
          if (distanceFromCurrent <= hysteresis) {
            // But only if current time is still reasonably close to the segment
            if (
              currentTime >= currentSegment.start - hysteresis &&
              currentTime <= currentSegment.end + hysteresis
            ) {
              return lastIndex;
            }
          }
        }
      }

      return newIndex;
    },
    [segments, hysteresis]
  );

  /**
   * Update loop using requestAnimationFrame
   */
  const updateSync = useCallback(() => {
    try {
      // Get current video time and apply offset
      const rawTime = getTime();
      const currentTime = rawTime + offsetMs / 1000;

      // Skip update if time hasn't changed significantly
      if (Math.abs(currentTime - lastTimeRef.current) < 0.01) {
        animationFrameRef.current = requestAnimationFrame(updateSync);
        return;
      }

      lastTimeRef.current = currentTime;

      // Find the segment for current time
      const newIndex = findSegmentIndex(currentTime);

      // Apply hysteresis to prevent flickering
      const finalIndex = applyHysteresis(
        newIndex,
        currentTime,
        lastIndexRef.current
      );

      // Update state only if index changed
      if (finalIndex !== lastIndexRef.current) {
        lastIndexRef.current = finalIndex;
        setCurrentIndex(finalIndex);

        if (debug) {
          const segmentInfo =
            finalIndex !== -1
              ? `"${segments[finalIndex].en.slice(0, 30)}..."`
              : "none";
          console.log(
            `🎬 Transcript sync: ${currentTime.toFixed(
              2
            )}s → segment ${finalIndex} (${segmentInfo})`
          );
        }
      }
    } catch (error) {
      if (debug) {
        console.warn("Transcript sync error:", error);
      }
    }

    // Schedule next update
    animationFrameRef.current = requestAnimationFrame(updateSync);
  }, [getTime, offsetMs, findSegmentIndex, applyHysteresis, segments, debug]);

  /**
   * Start/stop sync loop
   */
  useEffect(() => {
    // Validate segments are sorted
    if (segments && segments.length > 1) {
      for (let i = 1; i < segments.length; i++) {
        if (segments[i].start < segments[i - 1].start) {
          console.warn(
            "Transcript segments are not sorted by start time. This may cause sync issues."
          );
          break;
        }
      }
    }

    // Start sync loop
    animationFrameRef.current = requestAnimationFrame(updateSync);

    // Cleanup on unmount or dependency change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [updateSync]);

  /**
   * Reset when segments change
   */
  useEffect(() => {
    setCurrentIndex(-1);
    lastIndexRef.current = -1;
    lastTimeRef.current = -1;
  }, [segments]);

  return currentIndex;
}

/**
 * Helper hook for debugging transcript sync
 */
export function useTranscriptSyncDebug(
  getTime: () => number,
  segments: TranscriptSegment[],
  currentIndex: number
) {
  useEffect(() => {
    const interval = setInterval(() => {
      const time = getTime();
      const segment = currentIndex !== -1 ? segments[currentIndex] : null;

      console.log(`🎬 Sync Debug:`, {
        time: time.toFixed(2),
        currentIndex,
        segment: segment
          ? {
              start: segment.start.toFixed(2),
              end: segment.end.toFixed(2),
              text: segment.en.slice(0, 30) + "...",
            }
          : null,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [getTime, segments, currentIndex]);
}

/**
 * Utility to validate transcript segments for sync
 */
export function validateSegmentsForSync(segments: TranscriptSegment[]): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!segments || segments.length === 0) {
    warnings.push("No segments provided");
    return { isValid: false, warnings };
  }

  // Check sorting
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].start < segments[i - 1].start) {
      warnings.push(`Segment ${i} starts before segment ${i - 1} (not sorted)`);
    }
  }

  // Check for overlaps
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];

    if (curr.start < prev.end) {
      warnings.push(`Segment ${i} overlaps with segment ${i - 1}`);
    }
  }

  // Check for invalid durations
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.end <= segment.start) {
      warnings.push(`Segment ${i} has invalid duration (end <= start)`);
    }
  }

  // Check for very short segments (potential sync issues)
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.end - segment.start < 0.1) {
      warnings.push(
        `Segment ${i} is very short (${(segment.end - segment.start).toFixed(
          2
        )}s)`
      );
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
