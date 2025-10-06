import { useEffect, useRef, useState, useCallback } from "react";

export interface Cue {
  start: number;
  end: number;
  text?: string;
  en?: string;
  ko?: string;
}

interface UseHighPerformanceSyncOptions {
  debug?: boolean;
  syncTolerance?: number; // tolerance in seconds for finding active cue
  resyncInterval?: number; // periodic resync interval in seconds (0 to disable)
}

interface PlayerRef {
  getCurrentTime?: () => number;
  getPlaybackRate?: () => number;
  seekTo?: (time: number, allowSeekAhead?: boolean) => void;
  getPlayerState?: () => number;
}

interface VideoElement {
  currentTime: number;
  playbackRate: number;
  paused: boolean;
}

/**
 * High-performance subtitle sync hook that uses requestAnimationFrame
 * and binary search for optimal performance with long transcripts
 */
export function useHighPerformanceSync(
  cues: Cue[],
  playerRef: React.RefObject<PlayerRef> | null,
  videoRef: React.RefObject<HTMLVideoElement | null> | null,
  options: UseHighPerformanceSyncOptions = {}
) {
  const { debug = false, syncTolerance = 0.1, resyncInterval = 10 } = options;

  const [activeCueIndex, setActiveCueIndex] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const rafRef = useRef<number>(0);
  const lastActiveIndexRef = useRef<number>(-1);
  const lastSyncTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Binary search to find the active cue efficiently
  const findCueIndex = useCallback(
    (time: number): number => {
      if (!cues.length) return -1;

      let left = 0;
      let right = cues.length - 1;
      let result = -1;

      // Binary search for the cue that contains the current time
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const cue = cues[mid];

        if (
          time >= cue.start - syncTolerance &&
          time <= cue.end + syncTolerance
        ) {
          result = mid;
          break;
        } else if (time < cue.start) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }

      return result;
    },
    [cues, syncTolerance]
  );

  // Get current time from either YouTube player or video element
  const getCurrentTime = useCallback((): number => {
    // Try YouTube player first
    if (playerRef?.current?.getCurrentTime) {
      try {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === "number" && !isNaN(time)) {
          return time;
        }
      } catch (error) {
        if (debug) console.warn("YouTube player getCurrentTime error:", error);
      }
    }

    // Fallback to video element
    if (videoRef?.current?.currentTime !== undefined) {
      const time = videoRef.current.currentTime;
      if (typeof time === "number" && !isNaN(time)) {
        return time;
      }
    }

    return 0;
  }, [playerRef, videoRef, debug]);

  // Check if player is currently playing
  const isPlaying = useCallback((): boolean => {
    // Try YouTube player first
    if (playerRef?.current?.getPlayerState) {
      try {
        const state = playerRef.current.getPlayerState();
        // YouTube PlayerState.PLAYING = 1
        return state === 1;
      } catch (error) {
        if (debug) console.warn("YouTube player getPlayerState error:", error);
      }
    }

    // Fallback to video element
    if (videoRef?.current) {
      return !videoRef.current.paused;
    }

    // For YouTube player, we assume it's playing if we're getting time updates
    return isPlayingRef.current;
  }, [playerRef, videoRef, debug]);

  // Main sync tick function
  const syncTick = useCallback(() => {
    const now = getCurrentTime();
    const cueIndex = findCueIndex(now);

    // Update current time state
    setCurrentTime(now);

    // Update active cue index only if it changed
    if (cueIndex !== lastActiveIndexRef.current) {
      setActiveCueIndex(cueIndex);
      lastActiveIndexRef.current = cueIndex;

      if (debug) {
        console.log(
          `🎯 Sync: Cue ${cueIndex}/${cues.length} at ${now.toFixed(2)}s`,
          cueIndex >= 0 ? cues[cueIndex] : "No active cue"
        );
      }
    }

    // Periodic resync safeguard (every 10 seconds by default)
    if (resyncInterval > 0 && now - lastSyncTimeRef.current > resyncInterval) {
      lastSyncTimeRef.current = now;
      if (debug) {
        console.log(`🔄 Periodic resync at ${now.toFixed(2)}s`);
      }
    }

    // Continue animation frame loop
    rafRef.current = requestAnimationFrame(syncTick);
  }, [getCurrentTime, findCueIndex, cues.length, debug, resyncInterval]);

  // Start/stop sync based on cues availability and player state
  useEffect(() => {
    if (!cues.length || (!playerRef?.current && !videoRef?.current)) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    // Start the sync loop
    rafRef.current = requestAnimationFrame(syncTick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [cues.length, playerRef, videoRef, syncTick]);

  // Handle player state changes
  useEffect(() => {
    const handlePlay = () => {
      isPlayingRef.current = true;
      if (debug) console.log("▶️ Player started");
    };

    const handlePause = () => {
      isPlayingRef.current = false;
      if (debug) console.log("⏸️ Player paused");
    };

    // Add event listeners to video element if available
    const videoElement = videoRef?.current;
    if (videoElement) {
      videoElement.addEventListener("play", handlePlay);
      videoElement.addEventListener("pause", handlePause);
      videoElement.addEventListener("seeking", () => {
        if (debug) console.log("⏩ Player seeking");
      });
      videoElement.addEventListener("ratechange", () => {
        if (debug)
          console.log(
            `🎵 Playback rate changed to ${videoElement.playbackRate}x`
          );
      });

      return () => {
        videoElement.removeEventListener("play", handlePlay);
        videoElement.removeEventListener("pause", handlePause);
        videoElement.removeEventListener("seeking", handlePlay);
        videoElement.removeEventListener("ratechange", handlePlay);
      };
    }
  }, [videoRef, debug]);

  // Seek function for clicking on cues
  const seekTo = useCallback(
    (time: number) => {
      if (playerRef?.current?.seekTo) {
        playerRef.current.seekTo(time, true);
      } else if (videoRef?.current) {
        videoRef.current.currentTime = time;
      }
    },
    [playerRef, videoRef]
  );

  // Get active cue data
  const activeCue = activeCueIndex >= 0 ? cues[activeCueIndex] : null;

  return {
    activeCueIndex,
    activeCue,
    currentTime,
    isPlaying: isPlaying(),
    seekTo,
    // Helper functions for debugging
    debug: {
      getCurrentTime,
      findCueIndex,
      cuesCount: cues.length,
    },
  };
}
