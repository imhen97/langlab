"use client";

import React, { useState } from "react";
import { YouTubeIframeAdapter } from "@/components/player/YouTubeIframeAdapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function YouTubeCaptionsDemo() {
  const [videoUrl, setVideoUrl] = useState(
    "https://www.youtube.com/watch?v=6PDmQu2GLww"
  );
  const [selectedLang, setSelectedLang] = useState("en");
  const [showPlayer, setShowPlayer] = useState(false);

  const handleLoadVideo = () => {
    setShowPlayer(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>YouTube Captions Demo</CardTitle>
          <CardDescription>
            Test the YouTube captions system with any YouTube video URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">YouTube Video URL</Label>
            <Input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language Code</Label>
            <Input
              id="language"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              placeholder="en, ko, ja, etc."
            />
          </div>
          <Button onClick={handleLoadVideo} className="w-full">
            Load Video with Captions
          </Button>
        </CardContent>
      </Card>

      {showPlayer && (
        <YouTubeIframeAdapter
          videoId={videoUrl.split("v=")[1]?.split("&")[0] || ""}
          selectedLang={selectedLang}
          onReady={() => console.log("Player ready")}
          onStateChange={(state) => console.log("Player state changed:", state)}
        />
      )}
    </div>
  );
}




