import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVideoId, fetchCaptionList } from "@/lib/youtube";

// Validation schema
const ListCaptionsSchema = z.object({
  videoUrl: z.string().min(1, "videoUrl is required"),
});

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("videoUrl");

    if (!videoUrl) {
      return NextResponse.json(
        {
          error: "Missing videoUrl parameter",
          code: "MISSING_PARAMETER",
          details: "Please provide a valid YouTube video URL",
        },
        { status: 400 }
      );
    }

    // Validate the videoUrl
    const validatedParams = ListCaptionsSchema.parse({ videoUrl });

    console.log(`🔍 Listing captions for video: ${videoUrl}`);

    // Extract video ID
    let videoId: string;
    try {
      videoId = getVideoId(validatedParams.videoUrl);
      console.log(`📹 Extracted video ID: ${videoId}`);
    } catch (error) {
      console.error("❌ Failed to extract video ID:", error);
      return NextResponse.json(
        {
          error: "Invalid YouTube URL",
          code: "INVALID_URL",
          details: "Could not extract video ID from the provided URL",
        },
        { status: 400 }
      );
    }

    // Fetch caption tracks
    let tracks;
    try {
      tracks = await fetchCaptionList(videoId);
      console.log(`📊 Found ${tracks.length} caption tracks`);
    } catch (error) {
      console.error("❌ Failed to fetch caption tracks:", error);

      if (error instanceof Error) {
        if (error.message === "noCaptions") {
          return NextResponse.json(
            {
              error: "No captions available",
              code: "NO_CAPTIONS",
              reason: "noCaptions",
              details: "This video does not have any captions available",
            },
            { status: 204 }
          );
        }

        if (error.message === "regionBlocked") {
          return NextResponse.json(
            {
              error: "Video is region-blocked",
              code: "REGION_BLOCKED",
              reason: "regionBlocked",
              details: "This video is not available in your region",
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        {
          error: "Failed to fetch caption tracks",
          code: "FETCH_ERROR",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Return the caption tracks
    return NextResponse.json(
      {
        videoId,
        videoUrl: validatedParams.videoUrl,
        tracks,
        totalTracks: tracks.length,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800", // 1 day cache, 1 week stale
        },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error in /api/captions/list:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
