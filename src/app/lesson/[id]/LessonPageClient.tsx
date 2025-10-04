"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import YouTubePlayer, { YouTubePlayerRef } from "@/components/YouTubePlayer";
import { VideoPlayerWithCaptions } from "@/components/VideoPlayerWithCaptions";
import { CaptionSegment } from "@/components/CaptionsRenderer";
import TranscriptPane from "@/components/lesson/TranscriptPane";
import { SpeakerButton, PlayAllButton } from "@/components/SpeakerButton";
import { EnhancedCaptionSync } from "@/components/EnhancedCaptionSync";
import VocabularySection from "@/components/VocabularySection";
import QASection from "@/components/QASection";
import DownloadSection from "@/components/DownloadSection";

// Interface for backward compatibility with existing data
export interface TranscriptSegment {
  start: number;
  end: number;
  en: string;
  ko: string;
}
import { useTranscriptSync } from "@/hooks/useTranscriptSync";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { normalizeTranscriptSegments } from "@/utils/normalizeTranscript";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  BookOpen,
  Brain,
  MessageSquare,
  Target,
  Star,
  Clock,
  CheckCircle,
  ArrowLeft,
  Lock,
  Unlock,
  Award,
  PenTool,
  Mic,
  MicOff,
  Type,
  Satellite,
  Maximize,
  Minimize,
  Square,
  Repeat,
  SkipBack,
  Check,
  X,
  Plus,
  Trash2,
  Edit,
  Download,
} from "lucide-react";
import Link from "next/link";

interface LessonPageClientProps {
  lesson: {
    id: string;
    title: string | null;
    description: string | null;
    thumbnail: string | null;
    duration: number | null;
    level: string;
    purpose: string;
    summary: any;
    vocab: any;
    patterns: any;
    script: any;
    quizzes: any;
    speaking: any;
    source: {
      url: string | null;
    };
  };
}

export default function LessonPageClient({ lesson }: LessonPageClientProps) {
  const [activeTab, setActiveTab] = useState("vocabulary");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);

  // Layout and caption controls
  const [viewMode, setViewMode] = useState<"split" | "stacked">("split");
  const [captionMode, setCaptionMode] = useState<"EN" | "KO" | "BOTH">("BOTH");

  // New enhanced video player
  const [useEnhancedPlayer, setUseEnhancedPlayer] = useState(true);
  const [useEnhancedSync, setUseEnhancedSync] = useState(true);

  // Video size control
  const [videoSize, setVideoSize] = useState<"small" | "medium" | "large">(
    "medium"
  );

  const handleVideoSizeChange = (size: "small" | "medium" | "large") => {
    setVideoSize(size);
  };

  const getVideoSizeClasses = () => {
    switch (videoSize) {
      case "small":
        return "w-full max-w-md mx-auto";
      case "medium":
        return "w-full max-w-2xl mx-auto";
      case "large":
        return "w-full max-w-4xl mx-auto";
      default:
        return "w-full max-w-2xl mx-auto";
    }
  };

  // Video repeat control
  const [repeatMode, setRepeatMode] = useState<"none" | "all" | "segment">(
    "none"
  );
  const [repeatSegment, setRepeatSegment] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isRepeating, setIsRepeating] = useState(false);

  // Segment selection UI
  const [isSelectingSegment, setIsSelectingSegment] = useState(false);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [segmentEnd, setSegmentEnd] = useState<number | null>(null);

  // Vocabulary management
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [vocabularyList, setVocabularyList] = useState<
    Array<{
      id: string;
      word: string;
      translation: string;
      context: string;
      timestamp: number;
      addedAt: Date;
    }>
  >([]);

  const handleRepeatModeChange = (mode: "none" | "all" | "segment") => {
    setRepeatMode(mode);
    setIsRepeating(mode !== "none");
  };

  const handleSegmentRepeat = (start: number, end: number) => {
    setRepeatSegment({ start, end });
    setRepeatMode("segment");
    setIsRepeating(true);
  };

  const startSegmentSelection = () => {
    setIsSelectingSegment(true);
    setSegmentStart(currentTime);
    setSegmentEnd(null);
  };

  const endSegmentSelection = () => {
    if (segmentStart !== null && currentTime > segmentStart) {
      setSegmentEnd(currentTime);
      handleSegmentRepeat(segmentStart, currentTime);
    }
    setIsSelectingSegment(false);
  };

  const cancelSegmentSelection = () => {
    setIsSelectingSegment(false);
    setSegmentStart(null);
    setSegmentEnd(null);
    setRepeatMode("none");
    setIsRepeating(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle word click from captions
  const handleWordClick = async (
    word: string,
    context: string,
    timestamp: number
  ) => {
    setSelectedWord(word);

    // Check if word already exists in vocabulary list
    const existingWord = vocabularyList.find(
      (v) => v.word.toLowerCase() === word.toLowerCase()
    );

    if (!existingWord) {
      try {
        // Add word to database via API
        const response = await fetch("/api/vocabulary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            word: word,
            context: context,
            timestamp: timestamp,
            source: "caption",
          }),
        });

        if (response.ok) {
          const newWord = await response.json();

          // Add to local state for immediate UI update
          setVocabularyList((prev) => [
            ...prev,
            {
              id: newWord.id,
              word: newWord.word,
              translation: newWord.translation,
              context: newWord.context,
              timestamp: newWord.timestamp,
              addedAt: new Date(newWord.createdAt),
            },
          ]);

          console.log(`✅ "${word}" 단어가 단어장에 추가되었습니다!`);
        } else {
          const error = await response.json();
          console.error("단어 추가 실패:", error.error);
        }
      } catch (error) {
        console.error("단어 추가 오류:", error);
      }
    } else {
      console.log(`ℹ️ "${word}" 단어는 이미 단어장에 있습니다.`);
    }
  };

  const removeFromVocabulary = (wordId: string) => {
    setVocabularyList((prev) => prev.filter((item) => item.id !== wordId));
  };

  // Split text into clickable words
  const splitTextIntoWords = (text: string) => {
    return text.split(/(\s+|[.,!?;:])/).filter((word) => word.trim() !== "");
  };

  // Render clickable words
  const renderClickableText = (text: string, segment: TranscriptSegment) => {
    const words = splitTextIntoWords(text);

    return (
      <span>
        {words.map((word, index) => {
          const isClickable = /^[a-zA-Z가-힣]+$/.test(word.trim());

          if (isClickable) {
            return (
              <span
                key={index}
                className="cursor-pointer hover:bg-yellow-200 hover:rounded px-1 transition-colors duration-150"
                onClick={() =>
                  handleWordClick(word.trim(), text, segment.start)
                }
                title={`"${word.trim()}" 단어를 단어장에 추가하려면 클릭하세요`}
              >
                {word}
              </span>
            );
          } else {
            return <span key={index}>{word}</span>;
          }
        })}
      </span>
    );
  };

  const clearRepeat = () => {
    setRepeatMode("none");
    setRepeatSegment(null);
    setIsRepeating(false);
  };

  // Handle video end with repeat logic
  const handleVideoEndWithRepeat = () => {
    if (repeatMode === "all") {
      // Repeat entire video
      setTimeout(() => {
        youtubePlayerRef.current?.seekTo(0);
        youtubePlayerRef.current?.playVideo();
      }, 500);
    } else if (repeatMode === "segment" && repeatSegment) {
      // Repeat segment
      setTimeout(() => {
        youtubePlayerRef.current?.seekTo(repeatSegment.start);
        youtubePlayerRef.current?.playVideo();
      }, 500);
    } else {
      // Normal end behavior
      setVideoEnded(true);
      handleVideoEnd();
    }
  };

  // Handle time update with segment repeat logic
  const handleTimeUpdateWithRepeat = (time: number) => {
    setCurrentTime(time);
    onTimeUpdateRef.current?.(time);

    // Check if we need to repeat segment
    if (
      repeatMode === "segment" &&
      repeatSegment &&
      time >= repeatSegment.end
    ) {
      setTimeout(() => {
        youtubePlayerRef.current?.seekTo(repeatSegment.start);
        youtubePlayerRef.current?.playVideo();
      }, 100);
    }
  };

  // Pre-study state management
  const [preStudyCompleted, setPreStudyCompleted] = useState(false);
  const [preStudySections, setPreStudySections] = useState({
    summary: false,
    vocabulary: false,
    patterns: false,
  });

  // Vocabulary study state
  const [vocabularyProgress, setVocabularyProgress] = useState(0);
  const [studiedWords, setStudiedWords] = useState<Set<number>>(new Set());

  // Expression study state
  const [expressionProgress, setExpressionProgress] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(
    new Set()
  );
  const [exerciseAnswers, setExerciseAnswers] = useState<{
    [key: number]: string;
  }>({});

  // TTS functionality
  const {
    isPlaying,
    currentText,
    speakEnglish,
    speakKorean,
    stopAudio,
    playSequence,
  } = useTTS();

  // Voice recording functionality
  const {
    startRecording,
    stopRecording,
    isRecording: voiceIsRecording,
  } = useVoiceRecording();

  // Database progress state
  const [dbProgress, setDbProgress] = useState<any>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // API helper functions
  const updateProgress = async (action: string, data: any) => {
    try {
      const response = await fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          action,
          ...data,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setDbProgress(result.progress);
        return result;
      }
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
    return null;
  };

  const fetchProgress = async () => {
    try {
      setIsLoadingProgress(true);
      const response = await fetch(`/api/progress?lessonId=${lesson.id}`);
      const result = await response.json();
      if (result.success) {
        setDbProgress(result.progress);

        // Sync local state with database
        const detail = result.progress.detail || {};
        if (detail.sections) {
          setPreStudySections(detail.sections);
        }
        if (detail.vocabularyProgress) {
          setVocabPracticeProgress(detail.vocabularyProgress);
        }

        console.log("📊 Progress loaded from database:", detail);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Credit unlock function
  const unlockVideoWithCredit = async () => {
    try {
      const result = await updateProgress("unlock_video_with_credit", {});
      if (result) {
        setPreStudyCompleted(true);
        console.log("💳 Video unlocked with credit!");
        return true;
      }
    } catch (error) {
      console.error("Failed to unlock with credit:", error);
    }
    return false;
  };

  // Practice state management
  const [videoEnded, setVideoEnded] = useState(false);
  const [practiceUnlocked, setPracticeUnlocked] = useState(false);
  const [practiceResults, setPracticeResults] = useState({
    vocabularyQuiz: null as number | null,
    patternExercise: null as number | null,
    speakingCards: null as number | null,
    writingExercise: null as number | null,
  });

  // Vocabulary practice state
  const [vocabPracticeProgress, setVocabPracticeProgress] = useState<{
    [wordIndex: number]: {
      speakingCompleted: boolean;
      typingCompleted: boolean;
      speakingScore?: number;
      typingAnswer?: string;
    };
  }>({});
  const [currentVocabIndex, setCurrentVocabIndex] = useState<number | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState<string>("");
  const [typingAnswers, setTypingAnswers] = useState<{
    [wordIndex: number]: string;
  }>({});

  // Debug logging
  console.log("🔍 Current viewMode:", viewMode);
  console.log("🔍 Current captionMode:", captionMode);
  console.log("📚 Pre-study completed:", preStudyCompleted);
  console.log("🎬 Video ended:", videoEnded);
  console.log("🏃‍♀️ Practice unlocked:", practiceUnlocked);

  // YouTube player ref for getting current time
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null);

  // Stable callback ref to prevent YouTube player re-initialization
  const onTimeUpdateRef = useRef<((time: number) => void) | undefined>(
    undefined
  );
  onTimeUpdateRef.current = (time: number) => {
    setCurrentTime(time);
  };

  // Check if vocabulary section is completed (all words practiced)
  const isVocabularyCompleted = () => {
    const totalWords = mockVocab.length;
    const completedWords = Object.values(vocabPracticeProgress).filter(
      (progress) => progress.speakingCompleted && progress.typingCompleted
    ).length;
    return completedWords === totalWords && totalWords > 0;
  };

  // Check if all pre-study sections are completed
  const checkPreStudyCompletion = async () => {
    // Update vocabulary section status based on practice completion
    const vocabularyCompleted = isVocabularyCompleted();

    // Update database if vocabulary completion status changed
    if (vocabularyCompleted !== preStudySections.vocabulary) {
      await updateProgress("complete_section", {
        section: "vocabulary",
        completed: vocabularyCompleted,
      });

      setPreStudySections((prev) => ({
        ...prev,
        vocabulary: vocabularyCompleted,
      }));
    }

    // Use database state if available, otherwise fall back to local state
    const currentSections = dbProgress?.detail?.sections || {
      ...preStudySections,
      vocabulary: vocabularyCompleted,
    };

    const completedCount =
      Object.values(currentSections).filter(Boolean).length;
    const totalSections = Object.keys(currentSections).length;
    const allCompleted = completedCount === totalSections;

    console.log(
      `📊 Pre-study progress: ${completedCount}/${totalSections} sections completed`
    );
    console.log(`📋 Section status:`, currentSections);
    console.log(`🗄️ Using database state:`, !!dbProgress?.detail?.sections);

    // Update local state to match database
    if (
      dbProgress?.detail?.sections &&
      JSON.stringify(currentSections) !== JSON.stringify(preStudySections)
    ) {
      setPreStudySections(currentSections);
    }

    if (
      (allCompleted ||
        dbProgress?.state === "DONE" ||
        dbProgress?.detail?.creditUnlocked) &&
      !preStudyCompleted
    ) {
      setPreStudyCompleted(true);
      console.log("🎉 Pre-study completed! Video unlocked.");
    }
  };

  // Mark pre-study section as completed
  const markSectionCompleted = async (
    section: keyof typeof preStudySections
  ) => {
    // Update local state immediately for UI responsiveness
    setPreStudySections((prev) => {
      const updated = { ...prev, [section]: true };
      console.log(`✅ ${section} section completed`);
      return updated;
    });

    // Update database
    await updateProgress("complete_section", {
      section,
      completed: true,
    });
  };

  // Load progress from database on component mount
  useEffect(() => {
    fetchProgress();
  }, [lesson.id]);

  // Use effect to check completion whenever sections or vocabulary progress changes
  useEffect(() => {
    checkPreStudyCompletion();
  }, [preStudySections, preStudyCompleted, vocabPracticeProgress, dbProgress]);

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "1":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setCaptionMode("EN");
          }
          break;
        case "2":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setCaptionMode("KO");
          }
          break;
        case "3":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setCaptionMode("BOTH");
          }
          break;
        case "v":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setViewMode(viewMode === "split" ? "stacked" : "split");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, setCaptionMode, setViewMode]);

  // Handle video end
  const handleVideoEnd = () => {
    console.log("🎬 Video ended! Unlocking practice section...");
    setVideoEnded(true);
    setPracticeUnlocked(true);
  };

  // Handle vocabulary study
  const markWordStudied = (wordIndex: number) => {
    setStudiedWords((prev) => {
      const newSet = new Set(prev);
      newSet.add(wordIndex);
      return newSet;
    });

    const totalWords = Math.ceil(duration / 60) * 5;
    const newProgress = ((studiedWords.size + 1) / totalWords) * 100;
    setVocabularyProgress(newProgress);

    if (studiedWords.size + 1 >= totalWords) {
      markSectionCompleted("vocabulary");
    }
  };

  // Handle expression exercise
  const completeExercise = (exerciseIndex: number, answer: string) => {
    setExerciseAnswers((prev) => ({
      ...prev,
      [exerciseIndex]: answer,
    }));

    setCompletedExercises((prev) => {
      const newSet = new Set(prev);
      newSet.add(exerciseIndex);
      return newSet;
    });

    const totalExercises = Math.ceil(duration / 60);
    const newProgress = ((completedExercises.size + 1) / totalExercises) * 100;
    setExpressionProgress(newProgress);

    if (completedExercises.size + 1 >= totalExercises) {
      markSectionCompleted("patterns");
    }
  };

  // Handle TTS playback
  const handleTTSPlay = (text: string, language: "en" | "ko") => {
    if (language === "en") {
      speakEnglish(text);
    } else {
      speakKorean(text);
    }
  };

  // Play all vocabulary items
  const playAllVocabulary = async () => {
    const vocabularyItems = [
      {
        word: "blockchain",
        meaning: "블록체인",
        example: "Blockchain technology ensures secure transactions.",
        exampleKo: "블록체인 기술은 안전한 거래를 보장합니다.",
      },
      {
        word: "cryptocurrency",
        meaning: "암호화폐",
        example: "Bitcoin is the most famous cryptocurrency.",
        exampleKo: "비트코인은 가장 유명한 암호화폐입니다.",
      },
      {
        word: "decentralized",
        meaning: "분산된, 탈중앙화된",
        example: "The system operates in a decentralized manner.",
        exampleKo: "이 시스템은 분산된 방식으로 작동합니다.",
      },
    ];

    const sequence = vocabularyItems.flatMap((item) => [
      { text: item.word, lang: "en" as const, pauseAfter: 1 },
      { text: item.meaning, lang: "ko" as const, pauseAfter: 1 },
      { text: item.example, lang: "en" as const, pauseAfter: 2 },
      { text: item.exampleKo, lang: "ko" as const, pauseAfter: 2 },
    ]);

    await playSequence(sequence);
  };

  // Play all expressions
  const playAllExpressions = async () => {
    const expressions = [
      {
        expression: "It's worth noting that...",
        meaning: "주목할 점은...",
      },
      {
        expression: "As a result of...",
        meaning: "...의 결과로",
      },
      {
        expression: "In other words...",
        meaning: "다시 말해서...",
      },
    ];

    const sequence = expressions.flatMap((item) => [
      { text: item.expression, lang: "en" as const, pauseAfter: 2 },
      { text: item.meaning, lang: "ko" as const, pauseAfter: 2 },
    ]);

    await playSequence(sequence);
  };

  // Handle practice completion
  const updatePracticeResult = (
    exercise: keyof typeof practiceResults,
    score: number
  ) => {
    setPracticeResults((prev) => ({
      ...prev,
      [exercise]: score,
    }));
    console.log(`✅ ${exercise} completed with score: ${score}`);
  };

  // Extract video ID from source URL for YouTube player
  const extractVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const videoId = extractVideoId(lesson.source.url);

  // Convert transcript segments to new format for VideoPlayerWithCaptions
  const convertToCaptionSegments = (
    segments: TranscriptSegment[]
  ): CaptionSegment[] => {
    return segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.en, // English text as main text
      words: segment.en.split(" ").map((word, index) => ({
        text: word,
        start:
          segment.start +
          (index * (segment.end - segment.start)) /
            segment.en.split(" ").length,
        end:
          segment.start +
          ((index + 1) * (segment.end - segment.start)) /
            segment.en.split(" ").length,
      })),
    }));
  };

  // Create Korean caption segments
  const convertToKoreanCaptionSegments = (
    segments: TranscriptSegment[]
  ): CaptionSegment[] => {
    return segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.ko, // Korean text as main text
      words: segment.ko.split(" ").map((word, index) => ({
        text: word,
        start:
          segment.start +
          (index * (segment.end - segment.start)) /
            segment.ko.split(" ").length,
        end:
          segment.start +
          ((index + 1) * (segment.end - segment.start)) /
            segment.ko.split(" ").length,
      })),
    }));
  };

  // Normalize transcript segments
  const normalizedSegments: TranscriptSegment[] = (() => {
    if (!lesson.script) return [];

    console.log("🔍 Raw lesson.script:", lesson.script);
    console.log("🔍 Type of lesson.script:", typeof lesson.script);
    console.log("🔍 Is array:", Array.isArray(lesson.script));

    // Check if lesson.script is already an array of segments
    if (Array.isArray(lesson.script)) {
      console.log("📝 Processing array with", lesson.script.length, "segments");

      // Process segments with proper EN/KO alignment
      const segments = lesson.script.map((segment: any, index: number) => ({
        start:
          typeof segment.start === "number"
            ? segment.start
            : parseFloat(segment.start) || 0,
        end:
          typeof segment.end === "number"
            ? segment.end
            : parseFloat(segment.end) || 0,
        en: segment.en || segment.text || `Segment ${index + 1}`,
        ko: segment.ko || "", // Always provide ko field
      }));

      // Sort by start time to ensure proper chronological order
      segments.sort((a, b) => a.start - b.start);

      console.log(
        "📝 Processed segments with EN/KO alignment:",
        segments.slice(0, 5)
      );
      console.log(
        `✅ Total segments: ${segments.length}, with Korean: ${
          segments.filter((s) => s.ko).length
        }`
      );
      return segments;
    }

    // If it's a string, try to parse it
    if (typeof lesson.script === "string") {
      try {
        const parsed = JSON.parse(lesson.script);
        if (Array.isArray(parsed)) {
          console.log(
            "📝 Parsed string to array with",
            parsed.length,
            "segments"
          );
          return normalizeTranscriptSegments(parsed);
        }
      } catch (e) {
        console.error("❌ Failed to parse script string:", e);
      }
    }

    console.log("⚠️ Unexpected script format, returning empty array");
    return [];
  })();

  // Get current time function for sync hook
  const getCurrentTime = useCallback((): number => {
    if (youtubePlayerRef.current) {
      return youtubePlayerRef.current.getCurrentTime();
    }
    return currentTime;
  }, []); // Remove currentTime dependency to prevent re-creation

  // Vocabulary practice functions
  const handleSpeakingPractice = async (
    wordIndex: number,
    targetSentence: string
  ) => {
    if (voiceIsRecording) {
      // Stop recording and simulate processing result
      try {
        stopRecording();

        // Simulate transcript result for now (in real implementation, you'd use STT API)
        const mockTranscript = targetSentence; // Mock: assume perfect match for demo
        const similarity = calculateSimilarity(mockTranscript, targetSentence);

        const updatedProgress = {
          ...vocabPracticeProgress[wordIndex],
          speakingCompleted: true,
          speakingScore: similarity,
        };

        setVocabPracticeProgress((prev) => ({
          ...prev,
          [wordIndex]: updatedProgress,
        }));

        // Update database with practice progress
        await updateProgress("update_vocab_practice", {
          section: "vocab",
          wordId: wordIndex,
          practiceData: updatedProgress,
        });

        // Check if word is fully completed (both speaking and typing)
        if (updatedProgress.typingCompleted) {
          await updateProgress("complete_word", {
            section: "vocab",
            wordId: wordIndex,
            completed: true,
          });
          console.log(`🎉 Word ${wordIndex} fully completed!`);
        }

        setRecordingText(mockTranscript);
      } catch (error) {
        console.error("Recording failed:", error);
      }
    } else {
      // Start recording
      setCurrentVocabIndex(wordIndex);
      setRecordingText("");
      startRecording();
    }
  };

  const handleTypingSubmit = async (
    wordIndex: number,
    answer: string,
    correctWord: string
  ) => {
    const isCorrect =
      answer.toLowerCase().trim() === correctWord.toLowerCase().trim();

    const updatedProgress = {
      ...vocabPracticeProgress[wordIndex],
      typingCompleted: true,
      typingAnswer: answer,
      typingCorrect: isCorrect,
    };

    setVocabPracticeProgress((prev) => ({
      ...prev,
      [wordIndex]: updatedProgress,
    }));

    // Update database with practice progress
    await updateProgress("update_vocab_practice", {
      section: "vocab",
      wordId: wordIndex,
      practiceData: updatedProgress,
    });

    // Check if word is fully completed (both speaking and typing)
    if (updatedProgress.speakingCompleted) {
      await updateProgress("complete_word", {
        section: "vocab",
        wordId: wordIndex,
        completed: true,
      });
      console.log(`🎉 Word ${wordIndex} fully completed!`);

      // Check if all vocabulary is completed
      await checkVocabularyCompletion();
    }
  };

  // Check if all vocabulary words are completed and update section status
  const checkVocabularyCompletion = async () => {
    const totalWords = mockVocab.length;
    const completedWords = Object.values(vocabPracticeProgress).filter(
      (progress) => progress.speakingCompleted && progress.typingCompleted
    ).length;

    if (completedWords === totalWords && totalWords > 0) {
      console.log("🎯 All vocabulary completed! Marking section as DONE");
      await updateProgress("complete_section", {
        section: "vocabulary",
        completed: true,
      });
    }
  };

  const calculateSimilarity = (text1: string, text2: string): number => {
    // Simple similarity calculation based on word matching
    const words1 = text1.toLowerCase().split(" ");
    const words2 = text2.toLowerCase().split(" ");
    const commonWords = words1.filter((word) => words2.includes(word));
    return Math.round(
      (commonWords.length / Math.max(words1.length, words2.length)) * 100
    );
  };

  // Mock vocabulary data reference
  const mockVocab = [
    {
      word: "blockchain",
      pronunciation: "/ˈblɒkˌtʃeɪn/",
      meaning: "블록체인",
      example: "Blockchain technology ensures secure transactions.",
      exampleKo: "블록체인 기술은 안전한 거래를 보장합니다.",
    },
    {
      word: "cryptocurrency",
      pronunciation: "/ˈkrɪptoʊˌkɜːrənsi/",
      meaning: "암호화폐",
      example: "Bitcoin is the most famous cryptocurrency.",
      exampleKo: "비트코인은 가장 유명한 암호화폐입니다.",
    },
    {
      word: "decentralized",
      pronunciation: "/diːˈsɛntrəˌlaɪzd/",
      meaning: "분산된, 탈중앙화된",
      example: "The system operates in a decentralized manner.",
      exampleKo: "이 시스템은 분산된 방식으로 작동합니다.",
    },
    {
      word: "digital",
      pronunciation: "/ˈdɪdʒɪtəl/",
      meaning: "디지털의",
      example: "Digital payments are becoming more popular.",
      exampleKo: "디지털 결제가 점점 더 인기를 얻고 있습니다.",
    },
    {
      word: "innovation",
      pronunciation: "/ˌɪnəˈveɪʃən/",
      meaning: "혁신",
      example: "This innovation will change the financial industry.",
      exampleKo: "이 혁신은 금융 업계를 변화시킬 것입니다.",
    },
  ];

  const getVocabularyProgressPercent = () => {
    const vocabLength = mockVocab.length;
    const completedWords = Object.values(vocabPracticeProgress).filter(
      (progress) => progress.speakingCompleted && progress.typingCompleted
    ).length;
    return Math.round((completedWords / vocabLength) * 100);
  };

  const autoPlayWordAudio = (word: string, index: number) => {
    // Auto-play word audio when card becomes visible
    if (currentVocabIndex === index && !isPlaying) {
      speakEnglish(word);
    }
  };

  // Auto-play first word when vocab tab is opened
  useEffect(() => {
    if (activeTab === "vocab" && mockVocab.length > 0 && !currentVocabIndex) {
      setCurrentVocabIndex(0);
      // Small delay to ensure the component is ready
      setTimeout(() => {
        speakEnglish(mockVocab[0].word);
      }, 500);
    }
  }, [activeTab, speakEnglish]);

  // Use transcript sync hook
  const currentSegmentIndex = useTranscriptSync(
    getCurrentTime,
    normalizedSegments,
    syncOffsetMs,
    { debug: false }
  );

  // Handle seek to specific time
  const handleSeek = useCallback((time: number) => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(time, true);
    }
  }, []);

  const tabs = [
    { id: "vocabulary", label: "오늘의 단어장", icon: BookOpen },
    { id: "qa", label: "AI Q&A", icon: MessageSquare },
    { id: "download", label: "다운로드", icon: Download },
    { id: "summary", label: "임무 브리핑", icon: BookOpen },
    { id: "vocab", label: "장비 체크", icon: Brain },
    { id: "patterns", label: "훈련", icon: Target },
    { id: "transcript", label: "우주 통신", icon: MessageSquare },
    { id: "quiz", label: "최종 테스트", icon: CheckCircle },
    { id: "speaking", label: "임무 시뮬레이션", icon: Star },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-space-navy/80 backdrop-blur-sm shadow-lg border-b border-neonCyan/20">
        <div className="container mx-auto px-2 md:px-4 py-2 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-starWhite/80 hover:text-neonCyan transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:animate-pulse" />
                <span>🚀 우주 기지</span>
              </Link>
              <div className="h-6 w-px bg-neonCyan/30" />
              <div>
                <h1 className="text-xl font-bold text-starWhite font-space">
                  {lesson.title || "우주 임무"}
                </h1>
                <div className="flex items-center space-x-2 text-sm">
                  <Badge className="bg-cosmicPurple/20 text-cosmicPurple border-cosmicPurple/30">
                    연구원 {lesson.level}
                  </Badge>
                  <Badge className="bg-neonCyan/20 text-neonCyan border-neonCyan/30">
                    {lesson.purpose === "CONVO"
                      ? "대화 연구"
                      : lesson.purpose === "IELTS"
                      ? "IELTS 임무"
                      : lesson.purpose === "TOEIC"
                      ? "TOEIC 작전"
                      : "우주 임무"}
                  </Badge>
                  {lesson.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(lesson.duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-1" />
                즐겨찾기
              </Button>
              <Button variant="outline" size="sm">
                공유
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        {/* Learning Progress Indicator */}
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-800">
              Learning Progress
            </h2>
            <div className="text-sm text-gray-600">
              {!preStudyCompleted
                ? "📚 Pre-Study"
                : !videoEnded
                ? "🎬 Watching"
                : !Object.values(practiceResults).every(
                    (result) => result !== null
                  )
                ? "🏃‍♀️ Practice"
                : "🎉 Complete"}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                preStudyCompleted
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              {preStudyCompleted ? "✓" : "1"}
            </div>
            <div
              className={`flex-1 h-2 rounded ${
                preStudyCompleted ? "bg-green-200" : "bg-gray-200"
              }`}
            >
              <div
                className={`h-full rounded transition-all duration-500 ${
                  preStudyCompleted ? "bg-green-500 w-full" : "bg-blue-500 w-0"
                }`}
              />
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                videoEnded
                  ? "bg-green-500 text-white"
                  : preStudyCompleted
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {videoEnded ? "✓" : "2"}
            </div>
            <div
              className={`flex-1 h-2 rounded ${
                videoEnded ? "bg-green-200" : "bg-gray-200"
              }`}
            >
              <div
                className={`h-full rounded transition-all duration-500 ${
                  videoEnded
                    ? "bg-green-500 w-full"
                    : preStudyCompleted
                    ? "bg-blue-500 w-0"
                    : "bg-gray-400 w-0"
                }`}
              />
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                Object.values(practiceResults).every(
                  (result) => result !== null
                )
                  ? "bg-green-500 text-white"
                  : practiceUnlocked
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {Object.values(practiceResults).every((result) => result !== null)
                ? "✓"
                : "3"}
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Pre-Study</span>
            <span>Watch Video</span>
            <span>Practice</span>
          </div>
        </div>

        {/* Layout Toggle Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  console.log("🔄 Switching to Split View");
                  setViewMode("split");
                }}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                  viewMode === "split"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-700 hover:bg-gray-200"
                }`}
              >
                📱 Split View
              </button>
              <button
                onClick={() => {
                  console.log("🔄 Switching to Stacked View");
                  setViewMode("stacked");
                }}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                  viewMode === "stacked"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-700 hover:bg-gray-200"
                }`}
              >
                📚 Stacked View
              </button>
            </div>

            {/* Enhanced Caption Toggle */}
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600 mr-2">Caption:</span>
              <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => {
                    console.log("🇺🇸 Switching to EN caption mode");
                    setCaptionMode("EN");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCaptionMode("EN");
                    }
                  }}
                  aria-label="영어 자막으로 전환"
                  aria-pressed={captionMode === "EN"}
                  role="button"
                  tabIndex={0}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    captionMode === "EN"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105"
                      : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300"
                  }`}
                >
                  🇺🇸 English
                </button>
                <button
                  onClick={() => {
                    console.log("🇰🇷 Switching to KO caption mode");
                    setCaptionMode("KO");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCaptionMode("KO");
                    }
                  }}
                  aria-label="한국어 자막으로 전환"
                  aria-pressed={captionMode === "KO"}
                  role="button"
                  tabIndex={0}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    captionMode === "KO"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md transform scale-105"
                      : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-600 border border-gray-200 hover:border-green-300"
                  }`}
                >
                  🇰🇷 한국어
                </button>
                <button
                  onClick={() => {
                    console.log("🌍 Switching to BOTH caption mode");
                    setCaptionMode("BOTH");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCaptionMode("BOTH");
                    }
                  }}
                  aria-label="영어와 한국어 자막 모두 표시"
                  aria-pressed={captionMode === "BOTH"}
                  role="button"
                  tabIndex={0}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    captionMode === "BOTH"
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md transform scale-105"
                      : "bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300"
                  }`}
                >
                  🌍 Both
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              💡 Shortcuts: Cmd+1,2,3 (captions) • Cmd+V (view mode)
            </div>

            {/* Development Test Button */}
            {process.env.NODE_ENV === "development" && (
              <button
                onClick={handleVideoEnd}
                className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                🧪 Test: End Video
              </button>
            )}
          </div>
        </div>

        {/* Main Content Layout */}
        <div
          className={`${
            viewMode === "split"
              ? "grid xl:grid-cols-2 gap-4 md:gap-6"
              : "space-y-4 md:space-y-6"
          }`}
        >
          {/* Video Player Section */}
          <div className={`${viewMode === "split" ? "lg:col-span-1" : ""}`}>
            {!(
              dbProgress?.state === "DONE" ||
              dbProgress?.detail?.creditUnlocked ||
              preStudyCompleted
            ) ? (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center">
                      <BookOpen className="mr-2 w-6 h-6 text-blue-600" />
                      🚀 미션 준비 필요
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {Object.entries(preStudySections).map(
                        ([key, completed]) => (
                          <div key={key} className="flex items-center">
                            {completed ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-300">
                    <div className="text-center p-8">
                      <Lock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        영상이 잠겨있습니다
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Pre-study 섹션을 완료하면 영상을 시청할 수 있습니다
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm text-starWhite/80 flex items-center font-space">
                          🚀 연료 게이지:{" "}
                          {
                            Object.values(
                              dbProgress?.detail?.sections || preStudySections
                            ).filter(Boolean).length
                          }
                          /3 준비 완료
                        </div>
                        <div className="w-full bg-space-darkNavy rounded-full h-3 border border-neonCyan/30">
                          <div
                            className="rocket-fuel-gauge h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                (Object.values(
                                  dbProgress?.detail?.sections ||
                                    preStudySections
                                ).filter(Boolean).length /
                                  3) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        {dbProgress?.state === "DONE" && (
                          <div className="mt-2 text-xs text-green-600 font-medium">
                            🎉 All sections completed! Video will unlock
                            shortly...
                          </div>
                        )}
                        {!dbProgress?.detail?.creditUnlocked &&
                          dbProgress?.state !== "DONE" && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
                              <div className="text-sm text-gray-700 mb-2">
                                ⚡ 크레딧으로 바로 영상 잠금 해제
                              </div>
                              <Button
                                onClick={unlockVideoWithCredit}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                size="sm"
                              >
                                💳 크레딧 사용하여 잠금 해제
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center text-green-600">
                      <Unlock className="mr-2 w-5 h-5" />
                      🎬 Video Unlocked!
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-300"
                    >
                      Pre-study Complete ✅
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Enhanced Video Player with Captions */}
                  {videoId ? (
                    <div className="space-y-2">
                      {/* Player Toggle */}
                      <div className="flex justify-between p-2">
                        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setUseEnhancedSync(!useEnhancedSync)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                              useEnhancedSync
                                ? "bg-green-600 text-white shadow-md"
                                : "bg-transparent text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {useEnhancedSync
                              ? "⚡ High-Perf Sync"
                              : "🐌 Standard Sync"}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setUseEnhancedPlayer(true)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                              useEnhancedPlayer
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-transparent text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            🆕 Enhanced Player
                          </button>
                          <button
                            onClick={() => setUseEnhancedPlayer(false)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                              !useEnhancedPlayer
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-transparent text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            📺 Original Player
                          </button>
                        </div>
                      </div>

                      {useEnhancedPlayer ? (
                        <div className="space-y-4">
                          {/* Video Controls */}
                          <div className="space-y-3">
                            {/* Video Size Controls */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  영상 크기:
                                </span>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() =>
                                      handleVideoSizeChange("small")
                                    }
                                    className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                                      videoSize === "small"
                                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105"
                                        : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300"
                                    }`}
                                    title="작은 크기"
                                  >
                                    <Minimize className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleVideoSizeChange("medium")
                                    }
                                    className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                                      videoSize === "medium"
                                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md transform scale-105"
                                        : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-600 border border-gray-200 hover:border-green-300"
                                    }`}
                                    title="중간 크기"
                                  >
                                    <Square className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleVideoSizeChange("large")
                                    }
                                    className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                                      videoSize === "large"
                                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md transform scale-105"
                                        : "bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300"
                                    }`}
                                    title="큰 크기"
                                  >
                                    <Maximize className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {videoSize === "small" && "작은 크기"}
                                {videoSize === "medium" && "중간 크기"}
                                {videoSize === "large" && "큰 크기"}
                              </div>
                            </div>

                            {/* Video Repeat Controls */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  반복하기:
                                </span>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() =>
                                      handleRepeatModeChange("none")
                                    }
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                                      repeatMode === "none"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border"
                                    }`}
                                    title="반복 없음"
                                  >
                                    없음
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRepeatModeChange("all")
                                    }
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                                      repeatMode === "all"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border"
                                    }`}
                                    title="전체 반복"
                                  >
                                    <Repeat className="w-3 h-3 inline mr-1" />
                                    전체
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (isSelectingSegment) {
                                        endSegmentSelection();
                                      } else {
                                        startSegmentSelection();
                                      }
                                    }}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                                      isSelectingSegment ||
                                      repeatMode === "segment"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border"
                                    }`}
                                    title={
                                      isSelectingSegment
                                        ? "구간 선택 완료"
                                        : "구간 반복 설정"
                                    }
                                  >
                                    {isSelectingSegment ? (
                                      <>
                                        <Check className="w-3 h-3 inline mr-1" />
                                        완료
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw className="w-3 h-3 inline mr-1" />
                                        구간
                                      </>
                                    )}
                                  </button>
                                  {isSelectingSegment && (
                                    <button
                                      onClick={cancelSegmentSelection}
                                      className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-600 hover:bg-red-200 border border-red-300"
                                      title="취소"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {repeatMode === "none" && "반복 없음"}
                                {repeatMode === "all" && "전체 반복"}
                                {repeatMode === "segment" &&
                                  (repeatSegment
                                    ? `구간: ${formatTime(
                                        repeatSegment.start
                                      )} - ${formatTime(repeatSegment.end)}`
                                    : "구간 선택 필요")}
                                {isSelectingSegment &&
                                  segmentStart !== null &&
                                  `시작: ${formatTime(segmentStart)}`}
                              </div>
                            </div>

                            {/* Segment Selection Instructions */}
                            {isSelectingSegment && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <Play className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-800">
                                    구간을 선택하고 있습니다. 원하는 종료
                                    시점에서 "완료" 버튼을 클릭하세요.
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-blue-600">
                                  현재 시작점:{" "}
                                  {segmentStart !== null
                                    ? formatTime(segmentStart)
                                    : "0:00"}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* YouTube Player with Enhanced Controls */}
                          <div className={`relative ${getVideoSizeClasses()}`}>
                            <YouTubePlayer
                              videoId={videoId}
                              onTimeUpdate={handleTimeUpdateWithRepeat}
                              onDurationChange={setDuration}
                              onPlay={() => setIsVideoPlaying(true)}
                              onPause={() => setIsVideoPlaying(false)}
                              onSeek={(time) => setCurrentTime(time)}
                              onEnd={handleVideoEndWithRepeat}
                              ref={youtubePlayerRef}
                              className="rounded-lg"
                            />
                          </div>

                          {/* Enhanced Captions Below Video */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-medium text-gray-700">
                                  {useEnhancedSync
                                    ? "⚡ High-Performance Live Captions"
                                    : "Live Captions"}
                                </h3>
                                <span className="text-xs text-gray-500 font-mono">
                                  {Math.floor(currentTime / 60)}:
                                  {Math.floor(currentTime % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setCaptionMode("EN")}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    captionMode === "EN"
                                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105"
                                      : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300"
                                  }`}
                                >
                                  🇺🇸 EN
                                </button>
                                <button
                                  onClick={() => setCaptionMode("KO")}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    captionMode === "KO"
                                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md transform scale-105"
                                      : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-600 border border-gray-200 hover:border-green-300"
                                  }`}
                                >
                                  🇰🇷 KO
                                </button>
                                <button
                                  onClick={() => setCaptionMode("BOTH")}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    captionMode === "BOTH"
                                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md transform scale-105"
                                      : "bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300"
                                  }`}
                                >
                                  🌍 BOTH
                                </button>
                              </div>
                            </div>

                            {/* Enhanced Captions Display */}
                            {useEnhancedSync ? (
                              <EnhancedCaptionSync
                                cues={normalizedSegments}
                                playerRef={youtubePlayerRef}
                                videoRef={null}
                                captionMode={captionMode}
                                maxHeight="max-h-48"
                                onCueClick={(cue, time) => {
                                  youtubePlayerRef.current?.seekTo(time, true);
                                }}
                                showTimestamps={true}
                                debug={true}
                              />
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                {normalizedSegments.length > 0 ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      // Find the current active segment with small tolerance
                                      const activeSegment =
                                        normalizedSegments.find(
                                          (segment) =>
                                            currentTime >=
                                              segment.start - 0.1 &&
                                            currentTime <= segment.end + 0.1
                                        );

                                      // Get current segment and next 2 segments
                                      const currentIndex = activeSegment
                                        ? normalizedSegments.indexOf(
                                            activeSegment
                                          )
                                        : -1;
                                      const segmentsToShow =
                                        normalizedSegments.slice(
                                          Math.max(0, currentIndex),
                                          Math.max(3, currentIndex + 3)
                                        );

                                      return segmentsToShow.map(
                                        (segment, index) => {
                                          const isActive =
                                            currentTime >= segment.start &&
                                            currentTime <= segment.end;
                                          const isCurrent =
                                            segment === activeSegment;

                                          return (
                                            <div
                                              key={`${segment.start}-${segment.end}-${index}`}
                                              className={`p-3 rounded-lg transition-all ${
                                                isActive
                                                  ? "bg-blue-100 border-l-4 border-blue-500 shadow-sm transform scale-[1.02]"
                                                  : isCurrent
                                                  ? "bg-yellow-50 border-l-4 border-yellow-400"
                                                  : "bg-white border border-gray-200"
                                              }`}
                                            >
                                              {captionMode === "EN" && (
                                                <div className="text-sm font-medium text-gray-800">
                                                  {segment.en}
                                                </div>
                                              )}
                                              {captionMode === "KO" && (
                                                <div className="text-sm font-medium text-gray-800">
                                                  {segment.ko}
                                                </div>
                                              )}
                                              {captionMode === "BOTH" && (
                                                <div className="space-y-1">
                                                  <div className="text-sm font-medium text-gray-800">
                                                    {segment.en}
                                                  </div>
                                                  <div className="text-sm text-gray-600">
                                                    {segment.ko}
                                                  </div>
                                                </div>
                                              )}
                                              <div className="text-xs text-gray-500 mt-1">
                                                {Math.floor(segment.start / 60)}
                                                :
                                                {Math.floor(segment.start % 60)
                                                  .toString()
                                                  .padStart(2, "0")}{" "}
                                                - {Math.floor(segment.end / 60)}
                                                :
                                                {Math.floor(segment.end % 60)
                                                  .toString()
                                                  .padStart(2, "0")}
                                              </div>
                                            </div>
                                          );
                                        }
                                      );
                                    })()}
                                    {(() => {
                                      const activeSegment =
                                        normalizedSegments.find(
                                          (segment) =>
                                            currentTime >= segment.start &&
                                            currentTime <= segment.end
                                        );
                                      return (
                                        !activeSegment && (
                                          <div className="text-center text-gray-500 py-8">
                                            <p className="text-sm">
                                              재생 중인 자막이 없습니다
                                            </p>
                                            <p className="text-xs">
                                              비디오를 재생하면 자막이
                                              표시됩니다
                                            </p>
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-500 py-8">
                                    <p className="text-sm">
                                      자막을 불러올 수 없습니다
                                    </p>
                                    <p className="text-xs">
                                      자막 데이터가 없거나 처리 중입니다
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Video Controls for Original Player */}
                          <div className="space-y-3">
                            {/* Video Size Controls */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  영상 크기:
                                </span>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() =>
                                      handleVideoSizeChange("small")
                                    }
                                    className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                                      videoSize === "small"
                                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105"
                                        : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300"
                                    }`}
                                    title="작은 크기"
                                  >
                                    <Minimize className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleVideoSizeChange("medium")
                                    }
                                    className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                                      videoSize === "medium"
                                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md transform scale-105"
                                        : "bg-white text-gray-600 hover:bg-green-50 hover:text-green-600 border border-gray-200 hover:border-green-300"
                                    }`}
                                    title="중간 크기"
                                  >
                                    <Square className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleVideoSizeChange("large")
                                    }
                                    className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                                      videoSize === "large"
                                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md transform scale-105"
                                        : "bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300"
                                    }`}
                                    title="큰 크기"
                                  >
                                    <Maximize className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {videoSize === "small" && "작은 크기"}
                                {videoSize === "medium" && "중간 크기"}
                                {videoSize === "large" && "큰 크기"}
                              </div>
                            </div>

                            {/* Video Repeat Controls */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  반복하기:
                                </span>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() =>
                                      handleRepeatModeChange("none")
                                    }
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                                      repeatMode === "none"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border"
                                    }`}
                                    title="반복 없음"
                                  >
                                    없음
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRepeatModeChange("all")
                                    }
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                                      repeatMode === "all"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border"
                                    }`}
                                    title="전체 반복"
                                  >
                                    <Repeat className="w-3 h-3 inline mr-1" />
                                    전체
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (isSelectingSegment) {
                                        endSegmentSelection();
                                      } else {
                                        startSegmentSelection();
                                      }
                                    }}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${
                                      isSelectingSegment ||
                                      repeatMode === "segment"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border"
                                    }`}
                                    title={
                                      isSelectingSegment
                                        ? "구간 선택 완료"
                                        : "구간 반복 설정"
                                    }
                                  >
                                    {isSelectingSegment ? (
                                      <>
                                        <Check className="w-3 h-3 inline mr-1" />
                                        완료
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw className="w-3 h-3 inline mr-1" />
                                        구간
                                      </>
                                    )}
                                  </button>
                                  {isSelectingSegment && (
                                    <button
                                      onClick={cancelSegmentSelection}
                                      className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-600 hover:bg-red-200 border border-red-300"
                                      title="취소"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {repeatMode === "none" && "반복 없음"}
                                {repeatMode === "all" && "전체 반복"}
                                {repeatMode === "segment" &&
                                  (repeatSegment
                                    ? `구간: ${formatTime(
                                        repeatSegment.start
                                      )} - ${formatTime(repeatSegment.end)}`
                                    : "구간 선택 필요")}
                                {isSelectingSegment &&
                                  segmentStart !== null &&
                                  `시작: ${formatTime(segmentStart)}`}
                              </div>
                            </div>

                            {/* Segment Selection Instructions */}
                            {isSelectingSegment && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <Play className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-800">
                                    구간을 선택하고 있습니다. 원하는 종료
                                    시점에서 "완료" 버튼을 클릭하세요.
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-blue-600">
                                  현재 시작점:{" "}
                                  {segmentStart !== null
                                    ? formatTime(segmentStart)
                                    : "0:00"}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Original YouTube Player with Size Control */}
                          <div className={`${getVideoSizeClasses()}`}>
                            <YouTubePlayer
                              videoId={videoId}
                              onTimeUpdate={handleTimeUpdateWithRepeat}
                              onDurationChange={setDuration}
                              onPlay={() => setIsVideoPlaying(true)}
                              onPause={() => setIsVideoPlaying(false)}
                              onSeek={(time) => setCurrentTime(time)}
                              onEnd={handleVideoEndWithRepeat}
                              ref={youtubePlayerRef}
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-600 mb-2">
                          비디오를 불러올 수 없습니다
                        </p>
                        <p className="text-sm text-gray-500">
                          YouTube URL이 올바르지 않습니다
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pre-study / Transcript / Practice Section */}
          <div className={`${viewMode === "split" ? "lg:col-span-1" : ""}`}>
            {!preStudyCompleted ? (
              <Card className="border-0 shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">
                    🚀 우주 임무 준비
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Complete all sections below to unlock the video
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 max-h-96 overflow-y-auto">
                  {/* Video Summary Section */}
                  <div
                    className={`border rounded-lg p-4 ${
                      preStudySections.summary
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <Brain className="mr-2 w-5 h-5 text-purple-600" />
                        📝 Video Summary (3-5 sentences)
                      </h3>
                      {preStudySections.summary ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="text-xs text-red-600 font-medium">
                          📖 Read Required
                        </div>
                      )}
                    </div>

                    {/* English Summary */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded">
                          🇺🇸 ENGLISH
                        </span>
                        <SpeakerButton
                          text="This video explores the fundamental concepts of cryptocurrency and blockchain technology. You'll discover how digital currencies work and their impact on traditional finance. The content covers real-world applications and future implications of decentralized systems. Key terminology and practical examples help make complex concepts accessible to beginners."
                          language="en"
                          isPlaying={
                            isPlaying && currentText.includes("cryptocurrency")
                          }
                          onPlay={handleTTSPlay}
                          size="md"
                        />
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed space-y-1">
                        {lesson.summary?.enhancedContent?.mainPoints ? (
                          lesson.summary.enhancedContent.mainPoints
                            .slice(0, 4)
                            .map((point: string, index: number) => (
                              <p key={index}>{point}</p>
                            ))
                        ) : (
                          <>
                            <p>
                              This video explores the fundamental concepts of
                              cryptocurrency and blockchain technology.
                            </p>
                            <p>
                              You'll discover how digital currencies work and
                              their impact on traditional finance.
                            </p>
                            <p>
                              The content covers real-world applications and
                              future implications of decentralized systems.
                            </p>
                            <p>
                              Key terminology and practical examples help make
                              complex concepts accessible to beginners.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Korean Translation */}
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded">
                          🇰🇷 한국어 번역
                        </span>
                        <SpeakerButton
                          text="이 영상은 암호화폐와 블록체인 기술의 기본 개념을 탐구합니다. 디지털 화폐가 어떻게 작동하며 전통적인 금융에 미치는 영향을 알아보게 됩니다. 분산 시스템의 실제 적용 사례와 미래 전망을 다룹니다. 핵심 용어와 실용적인 예시로 복잡한 개념을 초보자도 이해하기 쉽게 설명합니다."
                          language="ko"
                          isPlaying={
                            isPlaying && currentText.includes("암호화폐")
                          }
                          onPlay={handleTTSPlay}
                          size="md"
                        />
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed space-y-1">
                        <p>
                          이 영상은 암호화폐와 블록체인 기술의 기본 개념을
                          탐구합니다.
                        </p>
                        <p>
                          디지털 화폐가 어떻게 작동하며 전통적인 금융에 미치는
                          영향을 알아보게 됩니다.
                        </p>
                        <p>
                          분산 시스템의 실제 적용 사례와 미래 전망을 다룹니다.
                        </p>
                        <p>
                          핵심 용어와 실용적인 예시로 복잡한 개념을 초보자도
                          이해하기 쉽게 설명합니다.
                        </p>
                      </div>
                    </div>

                    {/* Interactive Completion */}
                    {!preStudySections.summary && (
                      <div className="text-center">
                        <button
                          onClick={() => markSectionCompleted("summary")}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          ✅ I've Read the Summary
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Key Vocabulary Section */}
                  <div
                    className={`border rounded-lg p-4 ${
                      preStudySections.vocabulary
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <BookOpen className="mr-2 w-5 h-5 text-blue-600" />
                        📚 Key Vocabulary ({Math.ceil(duration / 60) * 5} words)
                      </h3>
                      <div className="flex items-center space-x-2">
                        <PlayAllButton
                          onPlayAll={playAllVocabulary}
                          isPlaying={isPlaying}
                          className="text-xs"
                        />
                        {preStudySections.vocabulary ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="text-xs text-orange-600 font-medium">
                            📝 Study Required
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!preStudySections.vocabulary && (
                      <div className="mb-4 p-2 bg-blue-50 rounded">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>
                            Progress: {studiedWords.size}/
                            {Math.ceil(duration / 60) * 5}
                          </span>
                          <span>{Math.round(vocabularyProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${vocabularyProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">
                          Practice Progress
                        </span>
                        <span className="text-sm font-bold text-blue-800">
                          {getVocabularyProgressPercent()}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${getVocabularyProgressPercent()}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Complete speaking and typing practice for all words to
                        proceed
                      </div>
                    </div>

                    <div className="space-y-3">
                      {mockVocab
                        .slice(0, Math.ceil(duration / 60) * 5)
                        .map((vocab, index) => (
                          <div
                            key={index}
                            className={`bg-white p-6 rounded-lg border-2 transition-all duration-200 ${
                              (dbProgress?.detail?.vocabularyProgress ||
                                vocabPracticeProgress)[index]
                                ?.speakingCompleted &&
                              (dbProgress?.detail?.vocabularyProgress ||
                                vocabPracticeProgress)[index]?.typingCompleted
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200 hover:border-blue-300"
                            }`}
                          >
                            {/* Step 1: Word + Meaning */}
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center">
                                <span className="text-xl font-bold text-gray-900 mr-3">
                                  {vocab.word}
                                </span>
                                <SpeakerButton
                                  text={vocab.word}
                                  language="en"
                                  isPlaying={
                                    isPlaying && currentText === vocab.word
                                  }
                                  onPlay={handleTTSPlay}
                                  className="mr-3"
                                />
                                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {vocab.pronunciation}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {(dbProgress?.detail?.vocabularyProgress ||
                                  vocabPracticeProgress)[index]
                                  ?.speakingCompleted && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <span className="text-xs text-green-600 font-medium">
                                      Speaking ✓
                                    </span>
                                  </div>
                                )}
                                {(dbProgress?.detail?.vocabularyProgress ||
                                  vocabPracticeProgress)[index]
                                  ?.typingCompleted && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-5 h-5 text-blue-500" />
                                    <span className="text-xs text-blue-600 font-medium">
                                      Typing ✓
                                    </span>
                                  </div>
                                )}
                                {(dbProgress?.detail?.vocabularyProgress ||
                                  vocabPracticeProgress)[index]
                                  ?.speakingCompleted &&
                                  (dbProgress?.detail?.vocabularyProgress ||
                                    vocabPracticeProgress)[index]
                                    ?.typingCompleted && (
                                    <div className="bg-green-500 text-white rounded-full p-1 ml-2">
                                      <CheckCircle className="w-4 h-4" />
                                    </div>
                                  )}
                              </div>
                            </div>

                            <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-bold text-red-700">
                                    🇰🇷 Korean:
                                  </span>
                                  <span className="text-base text-gray-800 ml-2 font-medium">
                                    {vocab.meaning}
                                  </span>
                                </div>
                                <SpeakerButton
                                  text={vocab.meaning}
                                  language="ko"
                                  isPlaying={
                                    isPlaying && currentText === vocab.meaning
                                  }
                                  onPlay={handleTTSPlay}
                                />
                              </div>
                            </div>

                            {/* Step 2: Example Sentences */}
                            <div className="space-y-3 mb-4">
                              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <span className="text-sm font-bold text-blue-700">
                                      🇺🇸 Example:
                                    </span>
                                    <p className="text-base text-gray-800 mt-1">
                                      {vocab.example
                                        .split(
                                          new RegExp(`(${vocab.word})`, "gi")
                                        )
                                        .map((part, i) =>
                                          part.toLowerCase() ===
                                          vocab.word.toLowerCase() ? (
                                            <span
                                              key={i}
                                              className="bg-yellow-200 px-1 rounded"
                                            >
                                              {part}
                                            </span>
                                          ) : (
                                            part
                                          )
                                        )}
                                    </p>
                                  </div>
                                  <div className="flex space-x-1 ml-2">
                                    <SpeakerButton
                                      text={vocab.example}
                                      language="en"
                                      isPlaying={
                                        isPlaying &&
                                        currentText === vocab.example
                                      }
                                      onPlay={handleTTSPlay}
                                    />
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    playSequence([
                                      { text: vocab.example, lang: "en" },
                                      { text: vocab.exampleKo, lang: "ko" },
                                    ])
                                  }
                                  className="text-xs"
                                >
                                  🔊 Play EN → KO
                                </Button>
                              </div>

                              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <span className="text-sm font-bold text-gray-700">
                                      🇰🇷 번역:
                                    </span>
                                    <p className="text-base text-gray-800 mt-1">
                                      {vocab.exampleKo}
                                    </p>
                                  </div>
                                  <SpeakerButton
                                    text={vocab.exampleKo}
                                    language="ko"
                                    isPlaying={
                                      isPlaying &&
                                      currentText === vocab.exampleKo
                                    }
                                    onPlay={handleTTSPlay}
                                    className="ml-2"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Step 3: Practice Exercises */}
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
                              <h4 className="font-semibold text-gray-800 text-center">
                                Practice Exercises
                              </h4>

                              {/* Speaking Practice */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">
                                    🎤 Speaking Practice
                                  </span>
                                  {(dbProgress?.detail?.vocabularyProgress ||
                                    vocabPracticeProgress)[index]
                                    ?.speakingCompleted && (
                                    <span className="text-xs text-green-600 font-medium">
                                      ✓ Completed - Score:{" "}
                                      {
                                        (dbProgress?.detail
                                          ?.vocabularyProgress ||
                                          vocabPracticeProgress)[index]
                                          ?.speakingScore
                                      }
                                      %
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Repeat this sentence: "{vocab.example}"
                                </p>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant={
                                      voiceIsRecording &&
                                      currentVocabIndex === index
                                        ? "destructive"
                                        : "default"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleSpeakingPractice(
                                        index,
                                        vocab.example
                                      )
                                    }
                                    disabled={
                                      (dbProgress?.detail?.vocabularyProgress ||
                                        vocabPracticeProgress)[index]
                                        ?.speakingCompleted
                                    }
                                  >
                                    {voiceIsRecording &&
                                    currentVocabIndex === index ? (
                                      <>
                                        <MicOff className="w-4 h-4 mr-1" />
                                        Stop Recording
                                      </>
                                    ) : (
                                      <>
                                        <Mic className="w-4 h-4 mr-1" />
                                        {(dbProgress?.detail
                                          ?.vocabularyProgress ||
                                          vocabPracticeProgress)[index]
                                          ?.speakingCompleted
                                          ? "✓ Completed"
                                          : "Start Speaking"}
                                      </>
                                    )}
                                  </Button>
                                  {currentVocabIndex === index &&
                                    recordingText && (
                                      <span className="text-xs text-gray-600">
                                        "{recordingText}"
                                      </span>
                                    )}
                                </div>
                              </div>

                              {/* Typing Practice */}
                              <div className="space-y-2">
                                <span className="text-sm font-medium text-gray-700">
                                  ⌨️ Typing Practice
                                </span>
                                <p className="text-sm text-gray-600">
                                  Complete this sentence: "
                                  {vocab.example.replace(
                                    new RegExp(vocab.word, "gi"),
                                    "___"
                                  )}
                                  "
                                </p>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    placeholder="Type the missing word..."
                                    value={typingAnswers[index] || ""}
                                    onChange={(e) =>
                                      setTypingAnswers((prev) => ({
                                        ...prev,
                                        [index]: e.target.value,
                                      }))
                                    }
                                    disabled={
                                      (dbProgress?.detail?.vocabularyProgress ||
                                        vocabPracticeProgress)[index]
                                        ?.typingCompleted
                                    }
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleTypingSubmit(
                                        index,
                                        typingAnswers[index] || "",
                                        vocab.word
                                      )
                                    }
                                    disabled={
                                      !typingAnswers[index] ||
                                      (dbProgress?.detail?.vocabularyProgress ||
                                        vocabPracticeProgress)[index]
                                        ?.typingCompleted
                                    }
                                  >
                                    <Type className="w-4 h-4 mr-1" />
                                    {(dbProgress?.detail?.vocabularyProgress ||
                                      vocabPracticeProgress)[index]
                                      ?.typingCompleted
                                      ? "✓ Completed"
                                      : "Check"}
                                  </Button>
                                </div>
                                {(dbProgress?.detail?.vocabularyProgress ||
                                  vocabPracticeProgress)[index]
                                  ?.typingCompleted && (
                                  <div className="text-xs text-green-600">
                                    ✅ Correct! The answer was "{vocab.word}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Completion Message */}
                    {preStudySections.vocabulary && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-300 text-center">
                        <p className="text-sm text-green-800 font-medium">
                          🎉 All vocabulary studied! Great job!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Key Expressions Section */}
                  <div
                    className={`border rounded-lg p-4 ${
                      preStudySections.patterns
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <Target className="mr-2 w-5 h-5 text-green-600" />
                        🎯 Key Expressions ({Math.ceil(duration / 60)} patterns)
                      </h3>
                      <div className="flex items-center space-x-2">
                        <PlayAllButton
                          onPlayAll={playAllExpressions}
                          isPlaying={isPlaying}
                          className="text-xs"
                        />
                        {preStudySections.patterns ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="text-xs text-purple-600 font-medium">
                            🧩 Practice Required
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!preStudySections.patterns && (
                      <div className="mb-4 p-2 bg-purple-50 rounded">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>
                            Exercises: {completedExercises.size}/
                            {Math.ceil(duration / 60)}
                          </span>
                          <span>{Math.round(expressionProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${expressionProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {[
                        {
                          expression: "It's worth noting that...",
                          meaning: "주목할 점은...",
                          explanation: "중요한 정보를 강조할 때 사용하는 표현",
                          exercise:
                            "Fill in the blank: ___ ___ ___ that blockchain technology is revolutionary.",
                          answer: "It's worth noting",
                        },
                        {
                          expression: "As a result of...",
                          meaning: "...의 결과로",
                          explanation: "원인과 결과를 연결할 때 사용하는 표현",
                          exercise:
                            "Complete: ___ ___ ___ digital innovation, financial services are changing rapidly.",
                          answer: "As a result of",
                        },
                        {
                          expression: "In other words...",
                          meaning: "다시 말해서...",
                          explanation:
                            "앞서 말한 내용을 다른 방식으로 설명할 때",
                          exercise:
                            "Transform: 'This means that...' → '___ ___ ___...'",
                          answer: "In other words",
                        },
                      ]
                        .slice(0, Math.ceil(duration / 60))
                        .map((pattern, index) => (
                          <div
                            key={index}
                            className={`bg-white p-4 rounded-lg border-2 transition-all duration-200 ${
                              completedExercises.has(index)
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200"
                            }`}
                          >
                            {/* Expression Header */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <span className="text-lg font-bold text-purple-700 mr-2">
                                    "{pattern.expression}"
                                  </span>
                                  <SpeakerButton
                                    text={pattern.expression}
                                    language="en"
                                    isPlaying={
                                      isPlaying &&
                                      currentText === pattern.expression
                                    }
                                    onPlay={handleTTSPlay}
                                  />
                                </div>
                                {completedExercises.has(index) ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    Exercise {index + 1}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                <div className="p-2 bg-red-50 rounded border border-red-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <span className="text-xs font-bold text-red-700">
                                        🇰🇷 Korean:
                                      </span>
                                      <p className="text-sm text-gray-800">
                                        {pattern.meaning}
                                      </p>
                                    </div>
                                    <SpeakerButton
                                      text={pattern.meaning}
                                      language="ko"
                                      isPlaying={
                                        isPlaying &&
                                        currentText === pattern.meaning
                                      }
                                      onPlay={handleTTSPlay}
                                      className="ml-2"
                                    />
                                  </div>
                                </div>
                                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                  <span className="text-xs font-bold text-blue-700">
                                    📝 Usage:
                                  </span>
                                  <p className="text-sm text-gray-800">
                                    {pattern.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Interactive Exercise */}
                            {!completedExercises.has(index) ? (
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="mb-2">
                                  <span className="text-xs font-bold text-purple-700">
                                    🧩 Practice Exercise:
                                  </span>
                                  <p className="text-sm text-gray-800 mt-1">
                                    {pattern.exercise}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Type your answer..."
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-purple-500"
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        const target =
                                          e.target as HTMLInputElement;
                                        completeExercise(index, target.value);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      const input = (e.target as HTMLElement)
                                        .previousElementSibling as HTMLInputElement;
                                      completeExercise(index, input.value);
                                    }}
                                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xs font-bold text-green-700">
                                      ✅ Your Answer:
                                    </span>
                                    <p className="text-sm text-gray-800">
                                      {exerciseAnswers[index]}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-blue-700">
                                      💡 Correct:
                                    </span>
                                    <p className="text-sm text-blue-800">
                                      {pattern.answer}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Completion Message */}
                    {preStudySections.patterns && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-300 text-center">
                        <p className="text-sm text-green-800 font-medium">
                          🎉 All expressions practiced! Excellent work!
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : practiceUnlocked ? (
              <Card className="border-0 shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center">
                    <Star className="mr-2 w-6 h-6 text-yellow-600" />
                    🏃‍♀️ Practice Exercises
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Complete exercises to master what you've learned
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    {Object.entries(practiceResults).map(([key, result]) => (
                      <div key={key} className="flex items-center">
                        {result !== null ? (
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600 ml-1">
                              {result}%
                            </span>
                          </div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 max-h-96 overflow-y-auto">
                  {/* Vocabulary Quiz */}
                  <div
                    className={`border rounded-lg p-4 ${
                      practiceResults.vocabularyQuiz !== null
                        ? "bg-green-50 border-green-300"
                        : "bg-blue-50 border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <BookOpen className="mr-2 w-5 h-5 text-blue-600" />
                        Vocabulary Quiz (MCQ)
                      </h3>
                      {practiceResults.vocabularyQuiz !== null ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {practiceResults.vocabularyQuiz}%
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            updatePracticeResult("vocabularyQuiz", 85)
                          }
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Start Quiz
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>
                        🎯 Test your vocabulary knowledge with multiple choice
                        questions
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        5 questions • 2 minutes
                      </p>
                    </div>
                  </div>

                  {/* Pattern Exercise */}
                  <div
                    className={`border rounded-lg p-4 ${
                      practiceResults.patternExercise !== null
                        ? "bg-green-50 border-green-300"
                        : "bg-purple-50 border-purple-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <Target className="mr-2 w-5 h-5 text-purple-600" />
                        Pattern Exercise
                      </h3>
                      {practiceResults.patternExercise !== null ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {practiceResults.patternExercise}%
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            updatePracticeResult("patternExercise", 92)
                          }
                          className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                        >
                          Start Exercise
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>
                        ✨ Practice sentence transformation with key patterns
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        3 patterns • 3 minutes
                      </p>
                    </div>
                  </div>

                  {/* Speaking Cards */}
                  <div
                    className={`border rounded-lg p-4 ${
                      practiceResults.speakingCards !== null
                        ? "bg-green-50 border-green-300"
                        : "bg-orange-50 border-orange-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <MessageSquare className="mr-2 w-5 h-5 text-orange-600" />
                        Speaking Cards
                      </h3>
                      {practiceResults.speakingCards !== null ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {practiceResults.speakingCards}%
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            updatePracticeResult("speakingCards", 78)
                          }
                          className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                        >
                          Start Speaking
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>
                        🎤 Record your voice or type responses with AI feedback
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        4 cards • 5 minutes
                      </p>
                    </div>
                  </div>

                  {/* Writing Exercise */}
                  <div
                    className={`border rounded-lg p-4 ${
                      practiceResults.writingExercise !== null
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <PenTool className="mr-2 w-5 h-5 text-red-600" />
                        Writing Exercise
                      </h3>
                      {practiceResults.writingExercise !== null ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {practiceResults.writingExercise}%
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            updatePracticeResult("writingExercise", 88)
                          }
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Start Writing
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>
                        ✍️ Write short answers with AI grammar and style
                        correction
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        3 questions • 7 minutes
                      </p>
                    </div>
                  </div>

                  {/* Practice Completion Summary & Review */}
                  {Object.values(practiceResults).every(
                    (result) => result !== null
                  ) && (
                    <div className="border-2 border-green-300 rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50">
                      <div className="flex items-center justify-center mb-3">
                        <Award className="w-8 h-8 text-yellow-500 mr-2" />
                        <h3 className="text-lg font-bold text-green-700">
                          🎉 Practice Complete!
                        </h3>
                      </div>
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-700 mb-2">
                          Overall Score:{" "}
                          {Math.round(
                            Object.values(practiceResults).reduce(
                              (acc: number, score) => acc + (score || 0),
                              0
                            ) / 4
                          )}
                          %
                        </p>
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-300"
                        >
                          Lesson Mastered ⭐
                        </Badge>
                      </div>

                      {/* Review Options */}
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                          onClick={() => {
                            // Reset practice to allow retake
                            setPracticeResults({
                              vocabularyQuiz: null,
                              patternExercise: null,
                              speakingCards: null,
                              writingExercise: null,
                            });
                          }}
                          className="px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          🔄 Retry Practice
                        </button>
                        <button
                          onClick={() => {
                            // Scroll back to video for review
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          📹 Review Video
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg h-full">
                <CardContent className="p-0 h-full">
                  <div className="relative h-full">
                    {/* Caption Mode Indicator */}
                    <div className="absolute top-2 right-2 z-10 bg-black/80 text-white px-2 py-1 rounded-md text-xs">
                      {captionMode === "EN"
                        ? "🇺🇸 English"
                        : captionMode === "KO"
                        ? "🇰🇷 한국어"
                        : "🌍 English + 한국어"}
                    </div>
                    {/* Live Captions in Split View */}
                    {useEnhancedSync ? (
                      <EnhancedCaptionSync
                        cues={normalizedSegments}
                        playerRef={youtubePlayerRef}
                        videoRef={null}
                        captionMode={captionMode}
                        maxHeight="max-h-96"
                        onCueClick={(cue, time) => {
                          youtubePlayerRef.current?.seekTo(time, true);
                        }}
                        showTimestamps={true}
                        debug={false}
                      />
                    ) : (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-3 p-3 border-b border-gray-200">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-semibold text-gray-800">
                              Live Captions
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              실시간
                            </Badge>
                          </div>

                          {/* Compact Caption Mode Toggle */}
                          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
                            <button
                              onClick={() => setCaptionMode("EN")}
                              className={`px-2 py-1 text-xs rounded-md transition-all ${
                                captionMode === "EN"
                                  ? "bg-blue-600 text-white shadow-md"
                                  : "bg-transparent text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              EN
                            </button>
                            <button
                              onClick={() => setCaptionMode("KO")}
                              className={`px-2 py-1 text-xs rounded-md transition-all ${
                                captionMode === "KO"
                                  ? "bg-red-600 text-white shadow-md"
                                  : "bg-transparent text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              KO
                            </button>
                            <button
                              onClick={() => setCaptionMode("BOTH")}
                              className={`px-2 py-1 text-xs rounded-md transition-all ${
                                captionMode === "BOTH"
                                  ? "bg-green-600 text-white shadow-md"
                                  : "bg-transparent text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              둘다
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                          {normalizedSegments.length > 0 ? (
                            <div className="space-y-2">
                              {(() => {
                                // Find the current active segment with small tolerance
                                const activeSegment = normalizedSegments.find(
                                  (segment) =>
                                    currentTime >= segment.start - 0.1 &&
                                    currentTime <= segment.end + 0.1
                                );

                                // Get current segment and next 3 segments
                                const currentIndex = activeSegment
                                  ? normalizedSegments.indexOf(activeSegment)
                                  : -1;
                                const segmentsToShow = normalizedSegments.slice(
                                  Math.max(0, currentIndex),
                                  Math.max(4, currentIndex + 4)
                                );

                                return segmentsToShow.map((segment, index) => {
                                  const isActive =
                                    currentTime >= segment.start &&
                                    currentTime <= segment.end;
                                  const isCurrent = segment === activeSegment;
                                  const isPast = currentTime > segment.end;

                                  return (
                                    <div
                                      key={`split-${segment.start}-${segment.end}-${index}`}
                                      className={`p-3 rounded-lg transition-all duration-300 cursor-pointer ${
                                        isActive
                                          ? "bg-blue-50 border-l-3 border-blue-500 shadow-sm transform scale-[1.01]"
                                          : isCurrent
                                          ? "bg-yellow-50 border-l-3 border-yellow-400"
                                          : isPast
                                          ? "bg-gray-50 border border-gray-200 opacity-60"
                                          : "bg-white border border-gray-200 hover:bg-gray-50"
                                      }`}
                                      onClick={() => handleSeek(segment.start)}
                                    >
                                      <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center space-x-2">
                                          <div
                                            className={`w-1.5 h-1.5 rounded-full ${
                                              currentTime >= segment.start &&
                                              currentTime <= segment.end
                                                ? "bg-blue-500 animate-pulse"
                                                : currentTime > segment.end
                                                ? "bg-gray-400"
                                                : "bg-gray-300"
                                            }`}
                                          ></div>
                                          <span className="text-xs text-gray-500 font-mono">
                                            {Math.floor(segment.start / 60)}:
                                            {Math.floor(segment.start % 60)
                                              .toString()
                                              .padStart(2, "0")}
                                          </span>
                                        </div>
                                        <SpeakerButton
                                          text={
                                            captionMode === "EN"
                                              ? segment.en
                                              : captionMode === "KO"
                                              ? segment.ko
                                              : `${segment.en} / ${segment.ko}`
                                          }
                                          className="text-gray-400 hover:text-blue-500 text-xs"
                                        />
                                      </div>

                                      {captionMode === "EN" && (
                                        <div className="text-sm leading-relaxed text-gray-800">
                                          {renderClickableText(
                                            segment.en,
                                            segment
                                          )}
                                        </div>
                                      )}
                                      {captionMode === "KO" && (
                                        <div className="text-sm leading-relaxed text-gray-800">
                                          {renderClickableText(
                                            segment.ko,
                                            segment
                                          )}
                                        </div>
                                      )}
                                      {captionMode === "BOTH" && (
                                        <div className="space-y-1">
                                          <div className="text-sm leading-relaxed text-gray-800">
                                            {renderClickableText(
                                              segment.en,
                                              segment
                                            )}
                                          </div>
                                          <div className="text-xs leading-relaxed text-gray-600 border-l-2 border-gray-300 pl-2">
                                            {renderClickableText(
                                              segment.ko,
                                              segment
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}

                              {(() => {
                                const activeSegment = normalizedSegments.find(
                                  (segment) =>
                                    currentTime >= segment.start &&
                                    currentTime <= segment.end
                                );
                                return (
                                  !activeSegment && (
                                    <div className="text-center text-gray-500 py-8">
                                      <div className="text-2xl mb-2">📺</div>
                                      <p className="text-sm font-medium mb-1">
                                        재생 중인 자막이 없습니다
                                      </p>
                                      <p className="text-xs">
                                        비디오를 재생하면 자막이 표시됩니다
                                      </p>
                                    </div>
                                  )
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-8">
                              <div className="text-2xl mb-2">📝</div>
                              <p className="text-sm font-medium mb-1">
                                자막을 불러올 수 없습니다
                              </p>
                              <p className="text-xs">
                                자막 데이터가 없거나 처리 중입니다
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compact Time Display */}
                    {!useEnhancedSync && (
                      <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-center space-x-3 text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>
                              {Math.floor(currentTime / 60)}:
                              {Math.floor(currentTime % 60)
                                .toString()
                                .padStart(2, "0")}
                            </span>
                          </div>
                          <div className="text-gray-400">•</div>
                          <div>
                            {Math.floor(duration / 60)}:
                            {Math.floor(duration % 60)
                              .toString()
                              .padStart(2, "0")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Stacked View: Tabs Below Video */}
        {viewMode === "stacked" && (
          <div className="mt-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 md:gap-2 mb-4 md:mb-6 bg-gray-100 p-1 md:p-2 rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveTab(tab.id);
                      }
                    }}
                    aria-label={`${tab.label} 탭으로 이동`}
                    aria-pressed={activeTab === tab.id}
                    role="tab"
                    tabIndex={0}
                    className={`flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      activeTab === tab.id
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-3 h-3 md:w-4 md:h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 md:p-6">
                {activeTab === "vocabulary" && (
                  <div className="space-y-4">
                    <VocabularySection
                      lessonId={lesson.id}
                      onSeekTo={(timestamp) => {
                        youtubePlayerRef.current?.seekTo(timestamp);
                      }}
                    />
                  </div>
                )}
                {activeTab === "qa" && (
                  <div className="space-y-4">
                    <QASection
                      lessonId={lesson.id}
                      transcript={
                        lesson.script ? JSON.stringify(lesson.script) : ""
                      }
                      onSeekTo={(timestamp) => {
                        youtubePlayerRef.current?.seekTo(timestamp);
                      }}
                    />
                  </div>
                )}
                {activeTab === "download" && (
                  <div className="space-y-4">
                    <DownloadSection
                      lessonId={lesson.id}
                      transcript={lesson.script}
                      title={lesson.title || "레슨"}
                    />
                  </div>
                )}
                {activeTab === "summary" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-starWhite font-space flex items-center">
                      📡 미션 브리핑
                    </h3>

                    {/* Enhanced Summary Info */}
                    {lesson.summary?.enhancedContent && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {lesson.summary.enhancedContent.sections?.length ||
                              0}
                          </div>
                          <div className="text-sm text-gray-600">섹션</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {lesson.summary.enhancedContent.totalVocabulary ||
                              0}
                          </div>
                          <div className="text-sm text-gray-600">어휘</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {lesson.summary.enhancedContent.totalPhrases || 0}
                          </div>
                          <div className="text-sm text-gray-600">핵심 표현</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-600">
                            {lesson.summary.enhancedContent
                              .estimatedStudyTime || "정보 없음"}
                          </div>
                          <div className="text-sm text-gray-600">
                            예상 학습시간
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          한국어
                        </h4>
                        <p className="text-gray-600">
                          {lesson.summary?.kr ||
                            "요약이 아직 생성되지 않았습니다."}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          English
                        </h4>
                        <p className="text-gray-600">
                          {lesson.summary?.en || "Summary not yet generated."}
                        </p>
                      </div>
                    </div>

                    {/* Section Breakdown */}
                    {lesson.summary?.enhancedContent?.sections &&
                      lesson.summary.enhancedContent.sections.length > 1 && (
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-700 mb-3">
                            섹션별 학습 내용
                          </h4>
                          <div className="space-y-2">
                            {lesson.summary.enhancedContent.sections.map(
                              (section: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <span className="font-medium">
                                      섹션 {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-500 ml-2">
                                      {Math.floor(section.start / 60)}:
                                      {(section.start % 60)
                                        .toString()
                                        .padStart(2, "0")}{" "}
                                      -{Math.floor(section.end / 60)}:
                                      {(section.end % 60)
                                        .toString()
                                        .padStart(2, "0")}
                                    </span>
                                  </div>
                                  <div className="flex space-x-4 text-sm">
                                    <span className="text-purple-600">
                                      {section.vocabulary?.length || 0} 어휘
                                    </span>
                                    <span className="text-green-600">
                                      {section.phrases?.length || 0} 표현
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {activeTab === "vocab" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-starWhite font-space flex items-center">
                      🛠️ 필수 장비 체크
                    </h3>
                    <div className="space-y-4">
                      {lesson.vocab &&
                      Array.isArray(lesson.vocab) &&
                      lesson.vocab.length > 0 ? (
                        lesson.vocab.map((word: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-semibold text-lg">
                                  {word.word}
                                </h4>
                                {word.cefr && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      word.cefr === "A2"
                                        ? "border-green-500 text-green-700 bg-green-50"
                                        : word.cefr === "B1"
                                        ? "border-blue-500 text-blue-700 bg-blue-50"
                                        : word.cefr === "B2"
                                        ? "border-purple-500 text-purple-700 bg-purple-50"
                                        : word.cefr === "C1"
                                        ? "border-red-500 text-red-700 bg-red-50"
                                        : "border-gray-500 text-gray-700 bg-gray-50"
                                    }`}
                                  >
                                    {word.cefr}
                                  </Badge>
                                )}
                              </div>
                              <Button variant="outline" size="sm">
                                <Star className="w-4 h-4 mr-1" />
                                단어장에 추가
                              </Button>
                            </div>
                            <p className="text-gray-600 mb-3">{word.meaning}</p>
                            {word.examples && word.examples.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">
                                  예문:
                                </div>
                                {word.examples.map(
                                  (example: string, i: number) => (
                                    <div
                                      key={i}
                                      className="text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-200"
                                    >
                                      <p className="font-medium text-gray-800">
                                        {example}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>어휘가 아직 생성되지 않았습니다.</p>
                          <p className="text-sm">
                            AI가 영상을 분석하여 어휘를 추출하는 중입니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "patterns" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-starWhite font-space flex items-center">
                      🎯 시뮬레이션 훈련
                    </h3>
                    <div className="space-y-4">
                      {lesson.patterns &&
                      Array.isArray(lesson.patterns) &&
                      lesson.patterns.length > 0 ? (
                        lesson.patterns.map((pattern: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-semibold text-lg mb-2">
                              {pattern.pattern}
                            </h4>
                            <p className="text-gray-600 mb-3">
                              {pattern.explanation}
                            </p>
                            <div className="bg-blue-50 p-3 rounded mb-2">
                              <p className="font-medium">{pattern.example}</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded">
                              <p className="text-sm text-gray-700">
                                <strong>💡 팁:</strong> {pattern.tip}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>패턴이 아직 생성되지 않았습니다.</p>
                          <p className="text-sm">
                            AI가 영상을 분석하여 유용한 패턴을 추출하는
                            중입니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "transcript" && (
                  <div className="space-y-4">
                    {/* Live Captions Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Live Captions
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          실시간 자막
                        </Badge>
                      </div>

                      {/* Caption Mode Toggle */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">언어:</span>
                        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
                          <button
                            onClick={() => setCaptionMode("EN")}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                              captionMode === "EN"
                                ? "bg-blue-600 text-white shadow-md transform scale-105"
                                : "bg-transparent text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            🇺🇸 English
                          </button>
                          <button
                            onClick={() => setCaptionMode("KO")}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                              captionMode === "KO"
                                ? "bg-red-600 text-white shadow-md transform scale-105"
                                : "bg-transparent text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            🇰🇷 한국어
                          </button>
                          <button
                            onClick={() => setCaptionMode("BOTH")}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                              captionMode === "BOTH"
                                ? "bg-green-600 text-white shadow-md transform scale-105"
                                : "bg-transparent text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            🌍 둘 다
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live Captions Display */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="p-4 max-h-96 overflow-y-auto">
                        {normalizedSegments.length > 0 ? (
                          <div className="space-y-3">
                            {(() => {
                              // Find the current active segment with small tolerance
                              const activeSegment = normalizedSegments.find(
                                (segment) =>
                                  currentTime >= segment.start - 0.1 &&
                                  currentTime <= segment.end + 0.1
                              );

                              // Get current segment and next 4 segments
                              const currentIndex = activeSegment
                                ? normalizedSegments.indexOf(activeSegment)
                                : -1;
                              const segmentsToShow = normalizedSegments.slice(
                                Math.max(0, currentIndex),
                                Math.max(5, currentIndex + 5)
                              );

                              return segmentsToShow.map((segment, index) => {
                                const isActive =
                                  currentTime >= segment.start &&
                                  currentTime <= segment.end;
                                const isCurrent = segment === activeSegment;
                                const isPast = currentTime > segment.end;

                                return (
                                  <div
                                    key={`transcript-${segment.start}-${segment.end}-${index}`}
                                    className={`p-4 rounded-lg transition-all duration-300 cursor-pointer ${
                                      isActive
                                        ? "bg-blue-50 border-l-4 border-blue-500 shadow-md transform scale-[1.02]"
                                        : isCurrent
                                        ? "bg-yellow-50 border-l-4 border-yellow-400"
                                        : isPast
                                        ? "bg-gray-50 border border-gray-200 opacity-70"
                                        : "bg-white border border-gray-200 hover:bg-gray-50"
                                    }`}
                                    onClick={() => handleSeek(segment.start)}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center space-x-2">
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            currentTime >= segment.start &&
                                            currentTime <= segment.end
                                              ? "bg-blue-500 animate-pulse"
                                              : currentTime > segment.end
                                              ? "bg-gray-400"
                                              : "bg-gray-300"
                                          }`}
                                        ></div>
                                        <span className="text-xs text-gray-500 font-mono">
                                          {Math.floor(segment.start / 60)}:
                                          {Math.floor(segment.start % 60)
                                            .toString()
                                            .padStart(2, "0")}{" "}
                                          - {Math.floor(segment.end / 60)}:
                                          {Math.floor(segment.end % 60)
                                            .toString()
                                            .padStart(2, "0")}
                                        </span>
                                      </div>
                                      <SpeakerButton
                                        text={
                                          captionMode === "EN"
                                            ? segment.en
                                            : captionMode === "KO"
                                            ? segment.ko
                                            : `${segment.en} / ${segment.ko}`
                                        }
                                        className="text-gray-400 hover:text-blue-500"
                                      />
                                    </div>

                                    {captionMode === "EN" && (
                                      <div className="text-sm leading-relaxed text-gray-800">
                                        {renderClickableText(
                                          segment.en,
                                          segment
                                        )}
                                      </div>
                                    )}
                                    {captionMode === "KO" && (
                                      <div className="text-sm leading-relaxed text-gray-800">
                                        {renderClickableText(
                                          segment.ko,
                                          segment
                                        )}
                                      </div>
                                    )}
                                    {captionMode === "BOTH" && (
                                      <div className="space-y-2">
                                        <div className="text-sm leading-relaxed text-gray-800">
                                          {renderClickableText(
                                            segment.en,
                                            segment
                                          )}
                                        </div>
                                        <div className="text-sm leading-relaxed text-gray-600 border-l-2 border-gray-300 pl-3">
                                          {renderClickableText(
                                            segment.ko,
                                            segment
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}

                            {(() => {
                              const activeSegment = normalizedSegments.find(
                                (segment) =>
                                  currentTime >= segment.start &&
                                  currentTime <= segment.end
                              );
                              return (
                                !activeSegment && (
                                  <div className="text-center text-gray-500 py-12">
                                    <div className="text-4xl mb-4">📺</div>
                                    <p className="text-lg font-medium mb-2">
                                      재생 중인 자막이 없습니다
                                    </p>
                                    <p className="text-sm">
                                      비디오를 재생하면 실시간 자막이 표시됩니다
                                    </p>
                                  </div>
                                )
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-12">
                            <div className="text-4xl mb-4">📝</div>
                            <p className="text-lg font-medium mb-2">
                              자막을 불러올 수 없습니다
                            </p>
                            <p className="text-sm">
                              자막 데이터가 없거나 처리 중입니다
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Time Display */}
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>
                          현재 시간: {Math.floor(currentTime / 60)}:
                          {Math.floor(currentTime % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </div>
                      <div className="text-gray-400">•</div>
                      <div>
                        총 시간: {Math.floor(duration / 60)}:
                        {Math.floor(duration % 60)
                          .toString()
                          .padStart(2, "0")}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "quiz" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">퀴즈</h3>
                    <div className="space-y-4">
                      {lesson.quizzes &&
                      Array.isArray(lesson.quizzes) &&
                      lesson.quizzes.length > 0 ? (
                        <>
                          {lesson.quizzes.map((quiz: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="font-semibold mb-3">
                                문제 {index + 1}
                              </h4>
                              {quiz.type === "mcq" ? (
                                <div>
                                  <p className="mb-3">{quiz.question}</p>
                                  <div className="space-y-2">
                                    {quiz.options &&
                                      quiz.options.map(
                                        (option: string, i: number) => (
                                          <label
                                            key={i}
                                            className="flex items-center space-x-2 cursor-pointer"
                                          >
                                            <input
                                              type="radio"
                                              name={`quiz-${index}`}
                                              value={i}
                                            />
                                            <span>{option}</span>
                                          </label>
                                        )
                                      )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="mb-3">{quiz.question}</p>
                                  <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="답을 입력하세요"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                            퀴즈 제출하기
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>퀴즈가 아직 생성되지 않았습니다.</p>
                          <p className="text-sm">
                            AI가 영상 내용을 분석하여 퀴즈를 생성하는 중입니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "speaking" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">스피킹 연습</h3>
                    <div className="space-y-4">
                      {lesson.speaking &&
                      Array.isArray(lesson.speaking) &&
                      lesson.speaking.length > 0 ? (
                        lesson.speaking.map((item: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline" className="capitalize">
                                {item.type}
                              </Badge>
                              <Button variant="outline" size="sm">
                                <Play className="w-4 h-4 mr-1" />
                                녹음하기
                              </Button>
                            </div>
                            <p className="font-medium mb-2">{item.prompt}</p>
                            <p className="text-sm text-gray-600">{item.kr}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>스피킹 연습이 아직 생성되지 않았습니다.</p>
                          <p className="text-sm">
                            AI가 영상 내용을 분석하여 스피킹 연습을 생성하는
                            중입니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar - Only shown in stacked view */}
        {viewMode === "stacked" && (
          <div className="grid xl:grid-cols-3 gap-4 md:gap-8 mt-4 md:mt-8">
            <div className="lg:col-span-2"></div>
            <div className="space-y-6">
              {/* Sync Status */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">동기화 상태</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>대본 세그먼트</span>
                      <span>{normalizedSegments.length}개</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>현재 세그먼트</span>
                      <span>
                        {currentSegmentIndex >= 0
                          ? `${currentSegmentIndex + 1}번째`
                          : "없음"}
                      </span>
                    </div>
                    {syncOffsetMs !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span>동기화 오프셋</span>
                        <span className="font-mono text-purple-600">
                          {syncOffsetMs >= 0 ? "+" : ""}
                          {(syncOffsetMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                    )}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width:
                            normalizedSegments.length > 0
                              ? `${
                                  ((currentSegmentIndex + 1) /
                                    normalizedSegments.length) *
                                  100
                                }%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">학습 진도</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoadingProgress ? (
                      <div className="text-center text-sm text-gray-500">
                        Loading progress...
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Pre-Study Progress</span>
                          <span>
                            {Math.round(
                              (Object.values(
                                dbProgress?.detail?.sections || preStudySections
                              ).filter(Boolean).length /
                                Object.keys(
                                  dbProgress?.detail?.sections ||
                                    preStudySections
                                ).length) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (Object.values(
                                  dbProgress?.detail?.sections ||
                                    preStudySections
                                ).filter(Boolean).length /
                                  Object.keys(
                                    dbProgress?.detail?.sections ||
                                      preStudySections
                                  ).length) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          {/* Summary Section */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center space-x-2">
                              {dbProgress?.detail?.sections?.summary ||
                              preStudySections.summary ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-gray-300" />
                              )}
                              <span>Summary (1/3)</span>
                            </span>
                            <span
                              className={
                                dbProgress?.detail?.sections?.summary ||
                                preStudySections.summary
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }
                            >
                              {dbProgress?.detail?.sections?.summary ||
                              preStudySections.summary
                                ? "완료"
                                : "대기"}
                            </span>
                          </div>

                          {/* Vocabulary Section */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center space-x-2">
                              {dbProgress?.detail?.sections?.vocabulary ||
                              preStudySections.vocabulary ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-gray-300" />
                              )}
                              <span>
                                Vocabulary (2/3) -{" "}
                                {
                                  Object.values(
                                    dbProgress?.detail?.vocabularyProgress ||
                                      vocabPracticeProgress
                                  ).filter(
                                    (p: any) =>
                                      p?.speakingCompleted && p?.typingCompleted
                                  ).length
                                }
                                /{mockVocab.length} words
                              </span>
                            </span>
                            <span
                              className={
                                dbProgress?.detail?.sections?.vocabulary ||
                                preStudySections.vocabulary
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }
                            >
                              {dbProgress?.detail?.sections?.vocabulary ||
                              preStudySections.vocabulary
                                ? "완료"
                                : "진행중"}
                            </span>
                          </div>

                          {/* Patterns Section */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center space-x-2">
                              {dbProgress?.detail?.sections?.patterns ||
                              preStudySections.patterns ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-gray-300" />
                              )}
                              <span>Patterns (3/3)</span>
                            </span>
                            <span
                              className={
                                dbProgress?.detail?.sections?.patterns ||
                                preStudySections.patterns
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }
                            >
                              {dbProgress?.detail?.sections?.patterns ||
                              preStudySections.patterns
                                ? "완료"
                                : "대기"}
                            </span>
                          </div>

                          {/* Overall Status */}
                          <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                            <div className="text-xs font-medium">
                              {dbProgress?.state === "DONE" ||
                              dbProgress?.detail?.creditUnlocked ||
                              preStudyCompleted ? (
                                <span className="text-green-600">
                                  🎉 All sections completed! Video unlocked.
                                </span>
                              ) : (
                                <span className="text-orange-600">
                                  📚 Complete all sections to unlock video.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Orbit Days */}
              <Card className="nebula-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-starWhite font-space flex items-center">
                    <Satellite className="w-5 h-5 mr-2 text-neonCyan animate-twinkle" />
                    궤도 유지일
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-neonCyan mb-2 animate-glow font-space">
                      7일 🛰️
                    </div>
                    <div className="text-sm text-starWhite/80 mb-4">
                      연속 궤도 유지 중!
                    </div>
                    <div className="flex justify-center space-x-1">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 bg-gradient-to-r from-cosmicPurple to-neonCyan rounded-full animate-twinkle space-glow"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stardust */}
              <Card className="nebula-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-starWhite font-space flex items-center">
                    <Star className="w-5 h-5 mr-2 text-meteorOrange animate-twinkle" />
                    스타더스트 ✨
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-meteorOrange mb-2 animate-pulse font-space">
                      1,250 ✨
                    </div>
                    <div className="text-sm text-starWhite/80">
                      이번 주 수집
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
