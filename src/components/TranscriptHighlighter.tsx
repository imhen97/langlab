"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  useTranscriptHighlighter, 
  generateWordTimings,
  seekToWord,
  formatTime,
  type CaptionSegment,
  type WordTiming 
} from "@/hooks/useTranscriptHighlighter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, Settings } from "lucide-react";

interface TranscriptHighlighterProps {
  transcript: CaptionSegment[];
  videoUrl?: string;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  className?: string;
}

export function TranscriptHighlighter({
  transcript,
  videoUrl,
  autoScroll = true,
  showTimestamps = true,
  className = "",
}: TranscriptHighlighterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Generate word timings if not present
  const processedTranscript = React.useMemo(() => {
    return generateWordTimings(transcript);
  }, [transcript]);

  // Use the highlighting hook
  const {
    activeWordIndex,
    activeSegmentIndex,
    currentTime,
    isPlaying,
    progress,
  } = useTranscriptHighlighter(videoRef, processedTranscript, {
    enabled: true,
    updateInterval: 50, // 50ms for smooth highlighting
    threshold: 0.1, // 100ms threshold
  });

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentIndex >= 0 && transcriptRef.current) {
      const activeElement = transcriptRef.current.querySelector(
        `[data-segment-index="${activeSegmentIndex}"]`
      );
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeSegmentIndex, autoScroll]);

  // Flatten all words for global indexing
  const allWords = processedTranscript.flatMap(segment => segment.words || []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  const handleWordClick = (word: WordTiming) => {
    seekToWord(videoRef, word);
  };

  const handleSegmentClick = (segment: CaptionSegment) => {
    if (videoRef.current) {
      videoRef.current.currentTime = segment.start;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Video Player */}
      {videoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Video Player</span>
              <div className="flex items-center gap-2">
                <Badge variant={isPlaying ? "default" : "secondary"}>
                  {isPlaying ? "Playing" : "Paused"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full rounded-lg"
                controls
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setIsMuted(videoRef.current.muted);
                  }
                }}
              />
              
              {/* Custom Controls */}
              <div className="flex items-center gap-2">
                <Button onClick={togglePlayPause} size="sm">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button onClick={toggleMute} size="sm" variant="outline">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <span className="text-sm text-gray-600">
                  {formatTime(currentTime)}
                </span>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="space-y-2">
                    <div>
                      <strong>Active Word:</strong> {activeWordIndex >= 0 ? activeWordIndex + 1 : "None"} / {allWords.length}
                    </div>
                    <div>
                      <strong>Active Segment:</strong> {activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : "None"} / {processedTranscript.length}
                    </div>
                    <div>
                      <strong>Word Progress:</strong> {(progress * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Display */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={transcriptRef}
            className="max-h-96 overflow-y-auto space-y-3 pr-2"
          >
            {processedTranscript.map((segment, segmentIndex) => (
              <div
                key={segmentIndex}
                data-segment-index={segmentIndex}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  segmentIndex === activeSegmentIndex
                    ? "bg-blue-50 border border-blue-200 shadow-sm"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => handleSegmentClick(segment)}
              >
                {/* Segment Timestamp */}
                {showTimestamps && (
                  <div className="text-xs text-gray-500 mb-2">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </div>
                )}

                {/* Word-level Highlighting */}
                <div className="text-gray-800 leading-relaxed">
                  {segment.words ? (
                    <div className="flex flex-wrap gap-1">
                      {segment.words.map((word, wordIndex) => {
                        const globalWordIndex = processedTranscript
                          .slice(0, segmentIndex)
                          .reduce((total, seg) => total + (seg.words?.length || 0), wordIndex);
                        
                        const isActive = globalWordIndex === activeWordIndex;
                        const isUpcoming = globalWordIndex === activeWordIndex + 1;

                        return (
                          <span
                            key={`${segmentIndex}-${wordIndex}`}
                            className={`inline-block px-1 py-0.5 rounded transition-all duration-150 cursor-pointer ${
                              isActive
                                ? "bg-yellow-300 text-gray-900 font-semibold shadow-sm scale-105"
                                : isUpcoming
                                ? "bg-yellow-100 text-gray-700"
                                : "hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent segment click
                              handleWordClick(word);
                            }}
                            title={`${formatTime(word.start)} - ${formatTime(word.end)}`}
                          >
                            {word.text}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-600 italic">
                      No word timings available
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status Bar */}
          <div className="mt-4 p-2 bg-gray-50 rounded text-sm">
            <div className="flex justify-between items-center">
              <span>
                Words: {allWords.length} | Segments: {processedTranscript.length}
              </span>
              <span>
                {activeWordIndex >= 0 && (
                  <>
                    Active: Word {activeWordIndex + 1} 
                    {progress > 0 && ` (${(progress * 100).toFixed(0)}%)`}
                  </>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Demo component with sample transcript data
 */
export function TranscriptHighlighterDemo() {
  // Sample transcript data with precise word timings
  const sampleTranscript: CaptionSegment[] = [
    {
      start: 0.0,
      end: 3.5,
      text: "Hello everyone, welcome to today's lesson",
      words: [
        { text: "Hello", start: 0.0, end: 0.5 },
        { text: "everyone,", start: 0.5, end: 1.2 },
        { text: "welcome", start: 1.2, end: 1.8 },
        { text: "to", start: 1.8, end: 2.0 },
        { text: "today's", start: 2.0, end: 2.5 },
        { text: "lesson", start: 2.5, end: 3.5 },
      ],
    },
    {
      start: 3.5,
      end: 7.2,
      text: "We will learn about advanced JavaScript concepts",
      words: [
        { text: "We", start: 3.5, end: 3.7 },
        { text: "will", start: 3.7, end: 3.9 },
        { text: "learn", start: 3.9, end: 4.3 },
        { text: "about", start: 4.3, end: 4.6 },
        { text: "advanced", start: 4.6, end: 5.2 },
        { text: "JavaScript", start: 5.2, end: 6.0 },
        { text: "concepts", start: 6.0, end: 7.2 },
      ],
    },
    {
      start: 7.2,
      end: 11.8,
      text: "Let's start with closures and scope",
      words: [
        { text: "Let's", start: 7.2, end: 7.5 },
        { text: "start", start: 7.5, end: 7.8 },
        { text: "with", start: 7.8, end: 8.0 },
        { text: "closures", start: 8.0, end: 8.8 },
        { text: "and", start: 8.8, end: 9.0 },
        { text: "scope", start: 9.0, end: 11.8 },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Real-time Transcript Highlighter</h1>
        <p className="text-gray-600">
          Click words to seek to specific timestamps. Watch the highlighting move in real-time!
        </p>
      </div>

      <TranscriptHighlighter
        transcript={sampleTranscript}
        autoScroll={true}
        showTimestamps={true}
      />

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>• <strong>Click any word</strong> to seek the video to that timestamp</div>
            <div>• <strong>Click segments</strong> to jump to the beginning of that segment</div>
            <div>• <strong>Watch highlighting</strong> move in real-time as the video plays</div>
            <div>• <strong>Use video controls</strong> or custom controls to play/pause</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



