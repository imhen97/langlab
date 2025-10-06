"use client";

import React, { useState, useRef } from "react";
import { EnhancedCaptionSync } from "@/components/EnhancedCaptionSync";
import { Cue } from "@/hooks/useHighPerformanceSync";

export default function TestEnhancedSync() {
  const [captionMode, setCaptionMode] = useState<"EN" | "KO" | "BOTH">("BOTH");
  const [debug, setDebug] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sample cue data for testing
  const sampleCues: Cue[] = [
    {
      start: 0,
      end: 3,
      en: "Welcome to this lesson.",
      ko: "이 수업에 오신 것을 환영합니다.",
    },
    {
      start: 3,
      end: 6,
      en: "Let's learn together.",
      ko: "함께 배워보겠습니다.",
    },
    {
      start: 6,
      end: 10,
      en: "This is a test of the enhanced sync system.",
      ko: "이것은 향상된 동기화 시스템의 테스트입니다.",
    },
    {
      start: 10,
      end: 15,
      en: "The sync should be frame-accurate.",
      ko: "동기화는 프레임 정확해야 합니다.",
    },
    {
      start: 15,
      end: 20,
      en: "Watch how the highlight moves smoothly.",
      ko: "하이라이트가 부드럽게 움직이는 것을 보세요.",
    },
    {
      start: 20,
      end: 25,
      en: "Binary search ensures optimal performance.",
      ko: "이진 검색으로 최적의 성능을 보장합니다.",
    },
    {
      start: 25,
      end: 30,
      en: "RequestAnimationFrame provides smooth updates.",
      ko: "RequestAnimationFrame이 부드러운 업데이트를 제공합니다.",
    },
    {
      start: 30,
      end: 35,
      en: "This completes our test sequence.",
      ko: "이것으로 테스트 시퀀스가 완료됩니다.",
    },
  ];

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            ⚡ Enhanced Subtitle Sync Test
          </h1>
          <p className="text-gray-600 mb-6">
            This page demonstrates the high-performance subtitle synchronization
            system. The sync uses requestAnimationFrame and binary search for
            optimal performance.
          </p>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Caption Mode:</label>
              <select
                value={captionMode}
                onChange={(e) =>
                  setCaptionMode(e.target.value as "EN" | "KO" | "BOTH")
                }
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="EN">🇺🇸 English Only</option>
                <option value="KO">🇰🇷 Korean Only</option>
                <option value="BOTH">🌍 Both Languages</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Debug Mode:</label>
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>

          {/* Video Player */}
          <div className="mb-6">
            <video
              ref={videoRef}
              className="w-full rounded-lg shadow-md"
              controls
              preload="metadata"
              style={{ maxHeight: "400px" }}
            >
              <source
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handlePlay}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ▶️ Play
              </button>
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                ⏸️ Pause
              </button>
            </div>
          </div>

          {/* Enhanced Caption Sync Component */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                🎯 Enhanced Sync (High-Performance)
              </h2>
              <EnhancedCaptionSync
                cues={sampleCues}
                playerRef={null}
                videoRef={videoRef}
                captionMode={captionMode}
                maxHeight="max-h-96"
                onCueClick={(cue, time) => handleSeek(time)}
                showTimestamps={true}
                debug={debug}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                📊 Performance Features
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-sm">
                    RequestAnimationFrame (~60fps)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="text-sm">Binary Search Lookup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span className="text-sm">
                    Frame-Accurate Synchronization
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span className="text-sm">Auto-Scroll to Active Cue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span className="text-sm">Periodic Resync Safeguard</span>
                </div>
              </div>

              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Test Instructions:
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Click play to start the video</li>
                  <li>• Watch the caption highlighting sync with playback</li>
                  <li>• Click on any caption to seek to that time</li>
                  <li>• Try changing playback speed to test sync accuracy</li>
                  <li>• Enable debug mode to see sync information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
