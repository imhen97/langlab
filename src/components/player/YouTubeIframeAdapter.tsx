"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Transcript } from "./Transcript";

interface YouTubeIframeAdapterProps {
  videoId: string;
  selectedLang?: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubeIframeAdapter({
  videoId,
  selectedLang = "en",
  onReady,
  onStateChange,
}: YouTubeIframeAdapterProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Load YouTube API
  useEffect(() => {
    if (window.YT) {
      setIsAPIReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true);
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isAPIReady || !containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      width: "100%",
      height: "315",
      videoId: videoId,
      playerVars: {
        cc_load_policy: 0, // Disable built-in CC rendering
        cc_lang_pref: selectedLang,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: any) => {
          console.log("YouTube player ready");
          onReady?.();
        },
        onStateChange: (event: any) => {
          console.log("YouTube player state changed:", event.data);
          onStateChange?.(event.data);
        },
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [isAPIReady, videoId, selectedLang, onReady, onStateChange]);

  // Update current time and playback rate
  const updatePlayerState = useCallback(() => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return;

    const time = playerRef.current.getCurrentTime();
    const rate = playerRef.current.getPlaybackRate?.() || 1;

    setCurrentTime(time);
    setPlaybackRate(rate);
  }, []);

  // Start polling for player state updates
  useEffect(() => {
    if (!playerRef.current) return;

    const interval = setInterval(updatePlayerState, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [updatePlayerState]);

  // Expose player functions to Transcript component
  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime?.() || 0;
  }, []);

  const getPlaybackRate = useCallback(() => {
    return playerRef.current?.getPlaybackRate?.() || 1;
  }, []);

  const seekTo = useCallback((time: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(time, true);
    }
  }, []);

  const playVideo = useCallback(() => {
    if (playerRef.current?.playVideo) {
      playerRef.current.playVideo();
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (playerRef.current?.pauseVideo) {
      playerRef.current.pauseVideo();
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* YouTube Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Transcript */}
      <div className="h-96">
        <Transcript
          videoId={videoId}
          selectedLang={selectedLang}
          playerType="youtube"
          getCurrentTime={getCurrentTime}
          getPlaybackRate={getPlaybackRate}
        />
      </div>
    </div>
  );
}




