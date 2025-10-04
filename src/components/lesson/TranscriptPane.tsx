"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TranscriptSync from "./TranscriptSync";
import {
  prepareTranscriptData,
  type Cap,
  runDeduplicationTests,
} from "@/lib/transcript/clean";

// Type definitions
interface TranscriptPaneProps {
  transcript: Array<{
    start: number;
    end?: number;
    en: string;
    ko?: string;
  }>;
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}

interface TranslationCache {
  [key: string]: string;
}

// Main component
export default function TranscriptPane({
  transcript,
  currentTime,
  onSeek,
  className = "",
}: TranscriptPaneProps) {
  const [showEnglish, setShowEnglish] = useState(true); // kept for future toggles
  const [showKorean, setShowKorean] = useState(true); // kept for future toggles
  const [translationCache, setTranslationCache] = useState<TranslationCache>(
    {}
  );
  const [isTranslating, setIsTranslating] = useState(false);

  // Build phrase-level bilingual transcripts with robust deduplication
  const { transcriptEN, transcriptKO } = useMemo(() => {
    const empty = {
      transcriptEN: [] as Cap[],
      transcriptKO: [] as Cap[],
    };
    if (!transcript || transcript.length === 0) return empty;

    // Convert to Cap format
    const enCaps: Cap[] = transcript
      .map((t) => ({
        start: Math.max(0, Number(t.start) || 0),
        end: Number(t.end ?? t.start + 2) || Number(t.start) + 2,
        text: (t.en || "").trim(),
      }))
      .filter((cap) => cap.text.length > 0);

    const koCaps: Cap[] = transcript
      .map((t) => ({
        start: Math.max(0, Number(t.start) || 0),
        end: Number(t.end ?? t.start + 2) || Number(t.start) + 2,
        text: (t.ko || "").trim(),
      }))
      .filter((cap) => cap.text.length > 0);

    // Run deduplication pipeline
    const result = prepareTranscriptData(enCaps, koCaps, translationCache);

    console.log(
      `🧹 Deduplication: ${enCaps.length} → ${result.transcriptEN.length} EN, ${koCaps.length} → ${result.transcriptKO.length} KO`
    );

    return result;
  }, [transcript, translationCache]);

  // Enhanced batch translation for phrase-level transcript (translate EN -> KO)
  const translateMissingTexts = useCallback(async () => {
    const uniqueEN = [...new Set(transcriptEN.map((p) => p.text))];
    const textsToTranslate = uniqueEN.filter((text) => {
      const hasCache = translationCache[text];
      const hasEnglish = text && text.trim().length > 0;
      return hasEnglish && !hasCache;
    });

    console.log("🔍 Found words needing translation:", textsToTranslate.length);

    if (textsToTranslate.length === 0) {
      console.log("✅ No words need translation");
      return;
    }

    setIsTranslating(true);

    try {
      console.log(
        "🚀 Starting batch translation for",
        textsToTranslate.length,
        "phrases"
      );

      const response = await fetch("/api/translate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: textsToTranslate }),
      });

      if (!response.ok) {
        throw new Error(
          `Translation API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Translation failed");
      }

      const { translations } = result;

      if (!Array.isArray(translations)) {
        throw new Error("Invalid translation response format");
      }

      // Update translation cache with results
      setTranslationCache((prevCache) => {
        const newCache = { ...prevCache };

        textsToTranslate.forEach((text, index) => {
          const translation = translations[index];
          if (translation && translation.trim().length > 0) {
            newCache[text] = translation;
            console.log(`✅ Translated: "${text}" -> "${translation}"`);
          } else {
            newCache[text] = "번역 실패";
            console.warn(`❌ Translation failed for: "${text}"`);
          }
        });

        console.log(
          "🎯 Translation cache updated. Total items:",
          Object.keys(newCache).length
        );
        return newCache;
      });
    } catch (error) {
      console.error("💥 Translation error:", error);

      // Mark all failed texts in cache
      setTranslationCache((prevCache) => {
        const newCache = { ...prevCache };
        textsToTranslate.forEach((text) => {
          newCache[text] = "번역 실패";
        });
        return newCache;
      });
    } finally {
      setIsTranslating(false);
      console.log("🏁 Translation process completed");
    }
  }, [transcriptEN, translationCache]);

  // Run deduplication tests on mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      runDeduplicationTests();
    }
  }, []);

  // Translate missing texts when transcript changes or Korean is enabled
  useEffect(() => {
    if (showKorean && transcriptEN.length > 0) {
      console.log("🌏 Korean display enabled, starting translations...");
      translateMissingTexts();
    }
  }, [showKorean, transcriptEN.length, translateMissingTexts]);

  if (!transcriptEN.length) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">자막을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="text-sm text-gray-600">문단 형태 자막 보기</div>
        {isTranslating && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>번역 중...</span>
          </div>
        )}
      </div>

      {/* Transcript Content - Paragraph Style */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <TranscriptSync
            transcriptEN={transcriptEN}
            transcriptKO={transcriptKO}
            currentTime={currentTime}
            className="mb-8"
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div>
            {transcriptEN.length}개 구문 •{" "}
            {Object.keys(translationCache).length}개 번역 완료
          </div>
          {isTranslating && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>번역 중...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
