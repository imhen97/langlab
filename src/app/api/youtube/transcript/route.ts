import { NextRequest, NextResponse } from "next/server";
import { getYouTubeVideoWithTranscript, getVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let videoId: string;
    try {
      videoId = getVideoId(url);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid YouTube URL",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    // 비디오 정보와 자막 추출
    const result = await getYouTubeVideoWithTranscript(videoId);

    // 자막이 없는 경우에도 성공 응답 반환 (fallback 처리)
    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      transcript: result.transcript,
      hasCaptions: result.hasCaptions,
      error: result.error,
      trackInfo: result.trackInfo,
    });
  } catch (error) {
    console.error("Error extracting YouTube transcript:", error);
    return NextResponse.json(
      {
        error: "Failed to extract transcript",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
