"use client";

import React from "react";
import { CaptionMode } from "@/components/CaptionToggle";

/**
 * Hook for managing caption mode state with persistence
 */
export function useCaptionMode(
  initialMode: CaptionMode = "en",
  persistKey?: string
) {
  const [mode, setMode] = React.useState<CaptionMode>(() => {
    // Try to restore from localStorage if persistKey is provided
    if (persistKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored && ["en", "ko", "both"].includes(stored)) {
          return stored as CaptionMode;
        }
      } catch (error) {
        console.warn("Failed to restore caption mode from localStorage:", error);
      }
    }
    return initialMode;
  });

  // Persist to localStorage when mode changes
  React.useEffect(() => {
    if (persistKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(persistKey, mode);
      } catch (error) {
        console.warn("Failed to persist caption mode to localStorage:", error);
      }
    }
  }, [mode, persistKey]);

  const handleModeChange = React.useCallback((newMode: CaptionMode) => {
    setMode(newMode);
  }, []);

  const resetToDefault = React.useCallback(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Computed properties for easy access
  const isEnglish = mode === "en";
  const isKorean = mode === "ko";
  const isBoth = mode === "both";
  const isMultiLanguage = mode === "both";

  return {
    mode,
    setMode: handleModeChange,
    resetToDefault,
    isEnglish,
    isKorean,
    isBoth,
    isMultiLanguage,
  };
}

/**
 * Hook for managing caption data (English and Korean)
 */
export interface CaptionData {
  english: any[];
  korean: any[];
}

export function useCaptionData(initialData: CaptionData = { english: [], korean: [] }) {
  const [data, setData] = React.useState<CaptionData>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setEnglishCaptions = React.useCallback((captions: any[]) => {
    setData(prev => ({ ...prev, english: captions }));
  }, []);

  const setKoreanCaptions = React.useCallback((captions: any[]) => {
    setData(prev => ({ ...prev, korean: captions }));
  }, []);

  const setBothCaptions = React.useCallback((english: any[], korean: any[]) => {
    setData({ english, korean });
  }, []);

  const clearCaptions = React.useCallback(() => {
    setData({ english: [], korean: [] });
    setError(null);
  }, []);

  const hasEnglish = data.english.length > 0;
  const hasKorean = data.korean.length > 0;
  const hasAny = hasEnglish || hasKorean;
  const hasBoth = hasEnglish && hasKorean;

  return {
    data,
    loading,
    error,
    setLoading,
    setError,
    setEnglishCaptions,
    setKoreanCaptions,
    setBothCaptions,
    clearCaptions,
    hasEnglish,
    hasKorean,
    hasAny,
    hasBoth,
  };
}



