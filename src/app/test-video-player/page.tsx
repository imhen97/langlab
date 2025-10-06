"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoPlayerWithCaptions } from "@/components/VideoPlayerWithCaptions";
import { CaptionSegment } from "@/components/CaptionsRenderer";
import { Play, Settings, FileVideo, Youtube } from "lucide-react";

// Sample video URLs for testing
const sampleVideos = [
  {
    title: "Big Buck Bunny (Recommended)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    type: "mp4",
  },
  {
    title: "Sintel (Open Source Movie)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    type: "mp4",
  },
  {
    title: "Elephant Dream",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    type: "mp4",
  },
  {
    title: "Tears of Steel",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    type: "mp4",
  },
  {
    title: "We Are Going on Bullrun",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    type: "mp4",
  },
  {
    title: "What Car?",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    type: "mp4",
  },
];

// Sample captions for testing
const sampleEnglishCaptions: CaptionSegment[] = [
  {
    start: 0,
    end: 5,
    text: "Welcome to our enhanced video player with volume and speed controls.",
    words: [
      { text: "Welcome", start: 0, end: 0.8 },
      { text: "to", start: 0.8, end: 1.0 },
      { text: "our", start: 1.0, end: 1.3 },
      { text: "enhanced", start: 1.3, end: 2.0 },
      { text: "video", start: 2.0, end: 2.5 },
      { text: "player", start: 2.5, end: 3.0 },
      { text: "with", start: 3.0, end: 3.3 },
      { text: "volume", start: 3.3, end: 3.8 },
      { text: "and", start: 3.8, end: 4.0 },
      { text: "speed", start: 4.0, end: 4.5 },
      { text: "controls.", start: 4.5, end: 5.0 },
    ],
  },
  {
    start: 5,
    end: 10,
    text: "You can adjust the volume using the slider and change playback speed.",
    words: [
      { text: "You", start: 5, end: 5.3 },
      { text: "can", start: 5.3, end: 5.6 },
      { text: "adjust", start: 5.6, end: 6.2 },
      { text: "the", start: 6.2, end: 6.4 },
      { text: "volume", start: 6.4, end: 6.9 },
      { text: "using", start: 6.9, end: 7.3 },
      { text: "the", start: 7.3, end: 7.5 },
      { text: "slider", start: 7.5, end: 8.0 },
      { text: "and", start: 8.0, end: 8.3 },
      { text: "change", start: 8.3, end: 8.8 },
      { text: "playback", start: 8.8, end: 9.3 },
      { text: "speed.", start: 9.3, end: 10.0 },
    ],
  },
  {
    start: 10,
    end: 15,
    text: "Try different speeds like 0.5x for slow learning or 2x for quick review.",
    words: [
      { text: "Try", start: 10, end: 10.3 },
      { text: "different", start: 10.3, end: 10.8 },
      { text: "speeds", start: 10.8, end: 11.3 },
      { text: "like", start: 11.3, end: 11.6 },
      { text: "0.5x", start: 11.6, end: 12.0 },
      { text: "for", start: 12.0, end: 12.3 },
      { text: "slow", start: 12.3, end: 12.8 },
      { text: "learning", start: 12.8, end: 13.3 },
      { text: "or", start: 13.3, end: 13.6 },
      { text: "2x", start: 13.6, end: 14.0 },
      { text: "for", start: 14.0, end: 14.3 },
      { text: "quick", start: 14.3, end: 14.8 },
      { text: "review.", start: 14.8, end: 15.0 },
    ],
  },
];

const sampleKoreanCaptions: CaptionSegment[] = [
  {
    start: 0,
    end: 5,
    text: "볼륨과 속도 조절이 가능한 향상된 비디오 플레이어에 오신 것을 환영합니다.",
    words: [
      { text: "볼륨과", start: 0, end: 1.0 },
      { text: "속도", start: 1.0, end: 1.5 },
      { text: "조절이", start: 1.5, end: 2.0 },
      { text: "가능한", start: 2.0, end: 2.5 },
      { text: "향상된", start: 2.5, end: 3.0 },
      { text: "비디오", start: 3.0, end: 3.5 },
      { text: "플레이어에", start: 3.5, end: 4.0 },
      { text: "오신", start: 4.0, end: 4.5 },
      { text: "것을", start: 4.5, end: 5.0 },
      { text: "환영합니다.", start: 5.0, end: 5.5 },
    ],
  },
  {
    start: 5,
    end: 10,
    text: "슬라이더를 사용하여 볼륨을 조절하고 재생 속도를 변경할 수 있습니다.",
    words: [
      { text: "슬라이더를", start: 5, end: 5.8 },
      { text: "사용하여", start: 5.8, end: 6.5 },
      { text: "볼륨을", start: 6.5, end: 7.0 },
      { text: "조절하고", start: 7.0, end: 7.8 },
      { text: "재생", start: 7.8, end: 8.3 },
      { text: "속도를", start: 8.3, end: 8.8 },
      { text: "변경할", start: 8.8, end: 9.3 },
      { text: "수", start: 9.3, end: 9.6 },
      { text: "있습니다.", start: 9.6, end: 10.0 },
    ],
  },
  {
    start: 10,
    end: 15,
    text: "천천히 학습하려면 0.5x, 빠른 복습을 위해 2x 등 다양한 속도를 시도해보세요.",
    words: [
      { text: "천천히", start: 10, end: 10.8 },
      { text: "학습하려면", start: 10.8, end: 11.5 },
      { text: "0.5x,", start: 11.5, end: 12.0 },
      { text: "빠른", start: 12.0, end: 12.5 },
      { text: "복습을", start: 12.5, end: 13.0 },
      { text: "위해", start: 13.0, end: 13.3 },
      { text: "2x", start: 13.3, end: 13.8 },
      { text: "등", start: 13.8, end: 14.0 },
      { text: "다양한", start: 14.0, end: 14.5 },
      { text: "속도를", start: 14.5, end: 15.0 },
      { text: "시도해보세요.", start: 15.0, end: 15.5 },
    ],
  },
];

export default function TestVideoPlayerPage() {
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(sampleVideos[0]);
  const [playerType, setPlayerType] = useState<"basic" | "with-captions">(
    "basic"
  );
  const [currentTime, setCurrentTime] = useState(0);

  const handleVideoReady = () => {
    console.log("✅ Video is ready to play");
    console.log("📹 Video URL:", selectedVideo.url);
    console.log("🎬 Video Title:", selectedVideo.title);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlay = () => {
    console.log("Video started playing");
  };

  const handlePause = () => {
    console.log("Video paused");
  };

  const handleEnded = () => {
    console.log("Video ended");
  };

  const handleWordClick = (word: {
    text: string;
    start: number;
    end: number;
  }) => {
    console.log("Word clicked:", word);
  };

  const handleSegmentClick = (segment: CaptionSegment) => {
    console.log("Segment clicked:", segment);
  };

  const isValidVideoUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const supportedFormats = [
        ".mp4",
        ".webm",
        ".ogg",
        ".mov",
        ".avi",
        ".mkv",
      ];
      const pathname = urlObj.pathname.toLowerCase();
      return (
        supportedFormats.some((format) => pathname.endsWith(format)) ||
        urlObj.hostname.includes("youtube.com") ||
        urlObj.hostname.includes("youtu.be") ||
        urlObj.hostname.includes("vimeo.com")
      );
    } catch {
      return false;
    }
  };

  const handleCustomUrlSubmit = () => {
    if (!customVideoUrl) return;

    if (!isValidVideoUrl(customVideoUrl)) {
      alert(
        "지원되지 않는 비디오 URL입니다. MP4, WebM, OGG 형식이나 YouTube, Vimeo URL을 사용해주세요."
      );
      return;
    }

    setSelectedVideo({
      title: "Custom Video",
      url: customVideoUrl,
      type: "custom",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Video Player Test
          </h1>
          <p className="text-gray-600">
            Test the video player with volume control and playback speed
            adjustment
          </p>

          {/* Browser Compatibility Notice */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-900 mb-2">
              💡 브라우저 호환성 안내
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>자동재생 정책:</strong> 일부 브라우저에서는 자동재생이
                차단될 수 있습니다. 재생 버튼을 클릭하여 수동으로 비디오를
                시작해주세요.
              </p>
              <p>
                <strong>지원 형식:</strong> MP4, WebM, OGG 형식의 비디오 파일을
                지원합니다.
              </p>
              <p>
                <strong>권장 비디오:</strong> 위의 샘플 비디오들은 모두 테스트에
                적합합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Player Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎮 Player Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Player Type:</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPlayerType("basic")}
                  variant={playerType === "basic" ? "default" : "outline"}
                  size="sm"
                >
                  <FileVideo className="w-4 h-4 mr-2" />
                  Basic Player
                </Button>
                <Button
                  onClick={() => setPlayerType("with-captions")}
                  variant={
                    playerType === "with-captions" ? "default" : "outline"
                  }
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  With Captions
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Current Time:</span>
              <Badge variant="secondary">
                {Math.floor(currentTime / 60)}:
                {(currentTime % 60).toFixed(1).padStart(4, "0")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Video Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📹 Video Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sample Videos */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Sample Videos:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {sampleVideos.map((video, index) => (
                  <Button
                    key={index}
                    onClick={() => setSelectedVideo(video)}
                    variant={
                      selectedVideo.url === video.url ? "default" : "outline"
                    }
                    className="justify-start"
                  >
                    <FileVideo className="w-4 h-4 mr-2" />
                    {video.title}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Video URL */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Custom Video URL:</span>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Enter video URL (MP4, WebM, etc.)"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleCustomUrlSubmit}
                  disabled={!customVideoUrl}
                  size="sm"
                >
                  Load
                </Button>
              </div>
            </div>

            {/* YouTube URL */}
            <div className="space-y-2">
              <span className="text-sm font-medium">YouTube Video:</span>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Enter YouTube URL"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" disabled>
                  <Youtube className="w-4 h-4 mr-2" />
                  Extract (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Video Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📹 현재 선택된 비디오
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">제목:</span>
                <span>{selectedVideo.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">URL:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                  {selectedVideo.url}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">형식:</span>
                <span className="uppercase">{selectedVideo.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">플레이어 타입:</span>
                <span>
                  {playerType === "basic"
                    ? "기본 플레이어"
                    : "자막 포함 플레이어"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Player */}
        <div className="space-y-4">
          {playerType === "basic" ? (
            <VideoPlayer
              videoUrl={selectedVideo.url}
              title={selectedVideo.title}
              autoPlay={false}
              muted={false}
              showControls={true}
              onVideoReady={handleVideoReady}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
            />
          ) : (
            <VideoPlayerWithCaptions
              videoUrl={selectedVideo.url}
              englishCaptions={sampleEnglishCaptions}
              koreanCaptions={sampleKoreanCaptions}
              initialCaptionMode="en"
              persistKey="test-video-caption-mode"
              showControls={true}
              autoPlay={false}
              onVideoReady={handleVideoReady}
              onTimeUpdate={handleTimeUpdate}
              onWordClick={handleWordClick}
              onSegmentClick={handleSegmentClick}
            />
          )}
        </div>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✨ Enhanced Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  🎵 Volume Control
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Horizontal slider (0% - 100%)</li>
                  <li>• Real-time volume adjustment</li>
                  <li>• Mute/unmute toggle button</li>
                  <li>• Visual volume percentage display</li>
                  <li>• Smooth volume transitions</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  ⚡ Speed Control
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Dropdown with 7 speed options</li>
                  <li>• Range: 0.5x (slow) to 2x (fast)</li>
                  <li>• Quick speed buttons (0.5x, 1x, 1.5x, 2x)</li>
                  <li>• Real-time playback rate changes</li>
                  <li>• Speed indicator badge</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  🎮 Enhanced Controls
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Skip forward/backward (10s)</li>
                  <li>• Progress bar with buffering indicator</li>
                  <li>• Fullscreen support</li>
                  <li>• Advanced settings panel</li>
                  <li>• Responsive design</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  📝 Caption Support
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• English/Korean/Both modes</li>
                  <li>• Word-level highlighting</li>
                  <li>• Interactive transcript</li>
                  <li>• Side-by-side or stacked layout</li>
                  <li>• Click to seek functionality</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💻 Usage Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Basic Video Player:
                </h4>
                <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                  {`<VideoPlayer
  videoUrl="https://example.com/video.mp4"
  title="My Video"
  autoPlay={false}
  showControls={true}
  onVideoReady={() => console.log("Ready!")}
  onTimeUpdate={(time) => setCurrentTime(time)}
/>`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Video Player with Captions:
                </h4>
                <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                  {`<VideoPlayerWithCaptions
  videoUrl="https://example.com/video.mp4"
  englishCaptions={englishCaptions}
  koreanCaptions={koreanCaptions}
  initialCaptionMode="both"
  showControls={true}
  onWordClick={(word) => handleSeek(word.start)}
/>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
