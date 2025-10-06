"use client";

import React, { useState, useEffect } from "react";
import {
  TranscriptHighlighter,
  TranscriptHighlighterDemo,
} from "@/components/TranscriptHighlighter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useTranscriptHighlighter,
  generateWordTimings,
  type CaptionSegment,
} from "@/hooks/useTranscriptHighlighter";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export default function TestTranscriptHighlightingPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [customTranscript, setCustomTranscript] = useState("");
  const [showDemo, setShowDemo] = useState(true);

  // Parse custom transcript JSON
  const parseCustomTranscript = (): CaptionSegment[] => {
    try {
      const parsed = JSON.parse(customTranscript);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parsedTranscript = parseCustomTranscript();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transcript Highlighter Test</h1>
        <p className="text-gray-600 mb-4">
          Test real-time word-level highlighting with video transcripts. The
          highlighting should move smoothly from word to word as the video
          plays.
        </p>

        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setShowDemo(true)}
            variant={showDemo ? "default" : "outline"}
          >
            Demo Mode
          </Button>
          <Button
            onClick={() => setShowDemo(false)}
            variant={!showDemo ? "default" : "outline"}
          >
            Custom Test
          </Button>
        </div>
      </div>

      {showDemo ? (
        <TranscriptHighlighterDemo />
      ) : (
        <div className="space-y-6">
          {/* Custom Video Input */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Video Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="videoUrl">Video URL (optional)</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="transcript">Transcript JSON</Label>
                  <textarea
                    id="transcript"
                    value={customTranscript}
                    onChange={(e) => setCustomTranscript(e.target.value)}
                    placeholder={`[
  {
    "start": 0.0,
    "end": 3.0,
    "text": "Hello world",
    "words": [
      {"text": "Hello", "start": 0.0, "end": 1.0},
      {"text": "world", "start": 1.0, "end": 3.0}
    ]
  }
]`}
                    className="w-full h-32 p-3 border rounded-md font-mono text-sm mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      parsedTranscript.length > 0 ? "default" : "secondary"
                    }
                  >
                    {parsedTranscript.length} segments parsed
                  </Badge>
                  {parsedTranscript.length === 0 && customTranscript && (
                    <Badge variant="destructive">Invalid JSON</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Transcript Highlighter */}
          {parsedTranscript.length > 0 && (
            <TranscriptHighlighter
              transcript={parsedTranscript}
              videoUrl={videoUrl || undefined}
              autoScroll={true}
              showTimestamps={true}
            />
          )}
        </div>
      )}

      {/* Debug Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Common Issues & Solutions:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Issue:</strong> Highlighting stuck on first word
                  <br />
                  <strong>Solution:</strong> Ensure video ref is properly
                  connected and currentTime is updating
                </div>
                <div>
                  <strong>Issue:</strong> Highlighting not smooth
                  <br />
                  <strong>Solution:</strong> Check updateInterval (should be
                  50ms or less) and use requestAnimationFrame
                </div>
                <div>
                  <strong>Issue:</strong> Words not clickable
                  <br />
                  <strong>Solution:</strong> Verify word timings are accurate
                  and video element supports seeking
                </div>
                <div>
                  <strong>Issue:</strong> Performance issues
                  <br />
                  <strong>Solution:</strong> Use React.memo, useMemo for
                  expensive calculations, and throttle updates
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Key Implementation Details:
              </h3>
              <ul className="space-y-1 text-sm">
                <li>
                  • Uses <code>requestAnimationFrame</code> for smooth 60fps
                  updates
                </li>
                <li>• Binary search for efficient word lookup (O(log n))</li>
                <li>• Throttled updates to prevent excessive re-renders</li>
                <li>• Event listeners for play/pause/seek to maintain sync</li>
                <li>
                  • Automatic word timing generation for segment-only data
                </li>
                <li>• CSS transitions for smooth visual feedback</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sample Transcript JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
            {`[
  {
    "start": 0.0,
    "end": 3.5,
    "text": "Hello everyone, welcome to today's lesson",
    "words": [
      {"text": "Hello", "start": 0.0, "end": 0.5},
      {"text": "everyone,", "start": 0.5, "end": 1.2},
      {"text": "welcome", "start": 1.2, "end": 1.8},
      {"text": "to", "start": 1.8, "end": 2.0},
      {"text": "today's", "start": 2.0, "end": 2.5},
      {"text": "lesson", "start": 2.5, "end": 3.5}
    ]
  },
  {
    "start": 3.5,
    "end": 7.2,
    "text": "We will learn about advanced JavaScript concepts",
    "words": [
      {"text": "We", "start": 3.5, "end": 3.7},
      {"text": "will", "start": 3.7, "end": 3.9},
      {"text": "learn", "start": 3.9, "end": 4.3},
      {"text": "about", "start": 4.3, "end": 4.6},
      {"text": "advanced", "start": 4.6, "end": 5.2},
      {"text": "JavaScript", "start": 5.2, "end": 6.0},
      {"text": "concepts", "start": 6.0, "end": 7.2}
    ]
  }
]`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Standalone Video Player Component for testing without external video
 */
function MockVideoPlayer() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15); // 15 seconds mock duration

  // Mock transcript for testing
  const mockTranscript: CaptionSegment[] = [
    {
      start: 0.0,
      end: 5.0,
      text: "This is a test video with synchronized captions",
      words: [
        { text: "This", start: 0.0, end: 0.5 },
        { text: "is", start: 0.5, end: 0.8 },
        { text: "a", start: 0.8, end: 1.0 },
        { text: "test", start: 1.0, end: 1.5 },
        { text: "video", start: 1.5, end: 2.2 },
        { text: "with", start: 2.2, end: 2.5 },
        { text: "synchronized", start: 2.5, end: 3.8 },
        { text: "captions", start: 3.8, end: 5.0 },
      ],
    },
    {
      start: 5.0,
      end: 10.0,
      text: "Watch the highlighting move in real time",
      words: [
        { text: "Watch", start: 5.0, end: 5.5 },
        { text: "the", start: 5.5, end: 5.7 },
        { text: "highlighting", start: 5.7, end: 6.8 },
        { text: "move", start: 6.8, end: 7.2 },
        { text: "in", start: 7.2, end: 7.4 },
        { text: "real", start: 7.4, end: 8.0 },
        { text: "time", start: 8.0, end: 10.0 },
      ],
    },
  ];

  const processedTranscript = React.useMemo(() => {
    return generateWordTimings(mockTranscript);
  }, []);

  const {
    activeWordIndex,
    activeSegmentIndex,
    isPlaying: hookIsPlaying,
  } = useTranscriptHighlighter(videoRef, processedTranscript);

  // Mock video playback
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 0.1;
          return newTime >= duration ? duration : newTime;
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  };

  // Create a mock video element
  const mockVideo = {
    current: {
      currentTime,
      paused: !isPlaying,
      ended: currentTime >= duration,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  } as any;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Mock Video Player (for testing without video file)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mock Video Display */}
          <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-2">🎥</div>
              <div className="text-lg font-semibold">Mock Video Player</div>
              <div className="text-sm text-gray-600">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button onClick={togglePlayPause} size="sm">
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="flex-1"
            />
          </div>

          {/* Status */}
          <div className="text-sm text-gray-600">
            Active Word: {activeWordIndex >= 0 ? activeWordIndex + 1 : "None"} |
            Active Segment:{" "}
            {activeSegmentIndex >= 0 ? activeSegmentIndex + 1 : "None"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
