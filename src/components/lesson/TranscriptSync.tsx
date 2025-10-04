"use client";

import React, { useMemo } from "react";

export interface Phrase {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptSyncProps {
  transcriptEN: Phrase[];
  transcriptKO: Phrase[];
  currentTime: number;
  className?: string;
}

export default function TranscriptSync({
  transcriptEN,
  transcriptKO,
  currentTime,
  className = "",
}: TranscriptSyncProps) {
  const activeIndex = useMemo(() => {
    if (!transcriptEN || transcriptEN.length === 0) return -1;
    return transcriptEN.findIndex((p, i) => {
      const next = transcriptEN[i + 1];
      return (
        currentTime >= p.start &&
        (next ? currentTime < next.start : currentTime <= p.end)
      );
    });
  }, [transcriptEN, currentTime]);

  // Compute highlight window (2-3 words) for the active EN/KO phrase
  const highlightWindows = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= transcriptEN.length) {
      return {
        en: null as null | [number, number],
        ko: null as null | [number, number],
      };
    }

    const phraseEN = transcriptEN[activeIndex];
    const phraseKO = transcriptKO[activeIndex];

    const progress =
      phraseEN.end > phraseEN.start
        ? Math.min(
            1,
            Math.max(
              0,
              (currentTime - phraseEN.start) / (phraseEN.end - phraseEN.start)
            )
          )
        : 0;

    const enWords = phraseEN.text.split(/\s+/).filter(Boolean);
    const koWords = (phraseKO?.text || "").split(/\s+/).filter(Boolean);

    const windowSize = Math.min(
      3,
      Math.max(2, Math.floor(enWords.length / 6) || 2)
    );

    const enIdx =
      enWords.length > 0 ? Math.round(progress * (enWords.length - 1)) : 0;
    const enStart = Math.max(0, enIdx - Math.floor(windowSize / 2));
    const enEnd = Math.min(enWords.length - 1, enStart + windowSize - 1);

    const koIdx =
      koWords.length > 0 ? Math.round(progress * (koWords.length - 1)) : 0;
    const koStart = Math.max(0, koIdx - Math.floor(windowSize / 2));
    const koEnd = Math.min(koWords.length - 1, koStart + windowSize - 1);

    return {
      en: [enStart, enEnd] as [number, number],
      ko: [koStart, koEnd] as [number, number],
    };
  }, [activeIndex, transcriptEN, transcriptKO, currentTime]);

  const renderPhraseLine = (
    text: string,
    isActive: boolean,
    window: [number, number] | null,
    key: string,
    classNameExtra: string
  ) => {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;

    const [wStart, wEnd] = window || [0, -1];

    return (
      <div key={key} className={`text-lg leading-relaxed ${classNameExtra}`}>
        {words.map((w, i) => {
          const highlighted = isActive && i >= wStart && i <= wEnd;
          return (
            <span
              key={`${key}-${i}`}
              className={`transition-colors duration-200 ${
                highlighted ? "bg-yellow-200 rounded px-1" : ""
              }`}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    );
  };

  if (!transcriptEN || transcriptEN.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        <p>자막을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {transcriptEN.map((en, idx) => {
        const ko = transcriptKO[idx];
        const isActive = idx === activeIndex;
        return (
          <div key={`pair-${idx}`} className="mb-3">
            {renderPhraseLine(
              en.text,
              isActive,
              highlightWindows.en,
              `en-${idx}`,
              "text-gray-900"
            )}
            {ko &&
              renderPhraseLine(
                ko.text,
                isActive,
                highlightWindows.ko,
                `ko-${idx}`,
                "text-gray-600"
              )}
          </div>
        );
      })}
    </div>
  );
}
