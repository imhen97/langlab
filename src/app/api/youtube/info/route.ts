import { NextRequest, NextResponse } from "next/server";

interface YouTubeVideoInfo {
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

interface YouTubeInfoResponse {
  success: boolean;
  videoInfo?: YouTubeVideoInfo;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<YouTubeInfoResponse>> {
  try {
    console.log("🎬 Fetching YouTube video info...");

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    console.log("📺 Video ID:", videoId);

    // Check environment variables
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { success: false, error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Fetch video information from YouTube Data API v3
    const apiKey = process.env.YOUTUBE_API_KEY;
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;

    console.log("🔍 Fetching from YouTube API...");
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `YouTube API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    const video = data.items[0];
    const videoInfo: YouTubeVideoInfo = {
      title: video.snippet.title,
      description: video.snippet.description,
      duration: video.contentDetails.duration,
      thumbnail:
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.default?.url,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
    };

    console.log("✅ Video info retrieved:", videoInfo.title);

    return NextResponse.json({
      success: true,
      videoInfo,
    });
  } catch (error) {
    console.error("💥 Error fetching YouTube video info:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
