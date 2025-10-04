import { NextRequest, NextResponse } from "next/server";
import { getVideoId, getYouTubeVideoInfo } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // URL 디코딩 처리
    const decodedUrl = decodeURIComponent(url);
    
    let videoId: string;
    try {
      videoId = getVideoId(decodedUrl);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid YouTube URL", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 400 }
      );
    }

    // YouTube API 키 확인
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // 비디오 정보 가져오기
    const videoInfo = await getYouTubeVideoInfo(videoId);

    if (!videoInfo) {
      return NextResponse.json(
        { error: "Video not found or not accessible" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      videoInfo,
      videoId,
      apiKey: process.env.YOUTUBE_API_KEY ? "Configured" : "Not configured",
    });
  } catch (error) {
    console.error("Error testing YouTube API:", error);
    return NextResponse.json(
      {
        error: "Failed to test YouTube API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
