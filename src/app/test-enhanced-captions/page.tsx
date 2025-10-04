"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { EnhancedTranscript } from "@/components/player/EnhancedTranscript";
import { getVideoId } from "@/lib/youtube";

export default function TestEnhancedCaptionsPage() {
  const [videoUrl, setVideoUrl] = useState(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  const [videoId, setVideoId] = useState("");
  const [selectedLang, setSelectedLang] = useState("en");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handleUrlSubmit = () => {
    try {
      const id = getVideoId(videoUrl);
      setVideoId(id);
    } catch (error) {
      alert("Invalid YouTube URL");
    }
  };

  const getCurrentTime = () => currentTime;
  const getPlaybackRate = () => playbackRate;

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    // In a real implementation, this would seek the video player
    console.log(`Seeking to: ${time}s`);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Enhanced YouTube Captions Test
            </CardTitle>
            <CardDescription>
              Test the improved subtitle system with better overlap handling and
              word-level highlighting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="videoUrl">YouTube URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Enter YouTube URL"
                    className="flex-1"
                  />
                  <Button onClick={handleUrlSubmit}>Load</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  placeholder="Language code (e.g., en, ko)"
                />
              </div>
            </div>

            {videoId && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Video ID:</strong> {videoId}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>URL:</strong> {videoUrl}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {videoId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Player Controls (Mock) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Player Controls</CardTitle>
                <CardDescription>
                  Mock player controls for testing synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={togglePlay}
                    className="flex items-center space-x-2"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                  </Button>

                  <Button
                    onClick={toggleMute}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>
                    Current Time: {Math.floor(currentTime / 60)}:
                    {(currentTime % 60).toFixed(1).padStart(4, "0")}
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0:00</span>
                    <span>
                      {Math.floor((duration || 100) / 60)}:
                      {(duration || 100) % 60}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Playback Rate</Label>
                  <div className="flex space-x-2">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <Button
                        key={rate}
                        variant={playbackRate === rate ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePlaybackRateChange(rate)}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Volume: {isMuted ? 0 : volume}%</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="p-3 bg-gray-100 rounded text-sm">
                  <p>
                    <strong>Duration:</strong> {Math.floor(duration / 60)}:
                    {(duration % 60).toFixed(1).padStart(4, "0")}
                  </p>
                  <p>
                    <strong>Status:</strong> {isPlaying ? "Playing" : "Paused"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Transcript */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enhanced Transcript</CardTitle>
                <CardDescription>
                  Word-level highlighting with improved overlap handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedTranscript
                  videoId={videoId}
                  selectedLang={selectedLang}
                  playerType="youtube"
                  getCurrentTime={getCurrentTime}
                  getPlaybackRate={getPlaybackRate}
                  onSeek={handleSeek}
                  className="h-96"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Description */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Enhanced Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-600 mb-2">
                  ✅ Improved Overlap Handling
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Detects and merges identical overlapping subtitles</li>
                  <li>• Handles partial text overlaps intelligently</li>
                  <li>• Adjusts timing to prevent conflicts</li>
                  <li>• Sorts cues by start time for proper ordering</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">
                  🎯 Word-Level Highlighting
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Generates word-level timing automatically</li>
                  <li>• Highlights individual words as they're spoken</li>
                  <li>• Click words to seek to specific timestamps</li>
                  <li>• Smooth animation with requestAnimationFrame</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



