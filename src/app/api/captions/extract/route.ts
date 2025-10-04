import { NextRequest, NextResponse } from "next/server";
import {
  fetchCaptions,
  cleanTranscript,
  postProcessTranscriptWithLLM,
  segmentsToPlainText,
  type CaptionSegment,
  type CleanTranscriptOptions,
} from "@/lib/captions";

interface ExtractCaptionsRequest {
  videoUrl: string;
  language?: string;
  cleanOptions?: CleanTranscriptOptions;
  useLLM?: boolean;
  outputFormat?: "segments" | "plaintext";
}

interface ExtractCaptionsResponse {
  success: boolean;
  data?: {
    segments: CaptionSegment[];
    plainText?: string;
    statistics: {
      originalCount: number;
      cleanedCount: number;
      totalDuration: number;
      extractionMethod: string;
    };
  };
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExtractCaptionsResponse>> {
  try {
    console.log("🎬 Starting enhanced caption extraction...");

    const body: ExtractCaptionsRequest = await request.json();
    const {
      videoUrl,
      language = "en",
      cleanOptions = {},
      useLLM = false,
      outputFormat = "segments",
    } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: "videoUrl is required" },
        { status: 400 }
      );
    }

    console.log("📝 Request parameters:", {
      videoUrl,
      language,
      useLLM,
      outputFormat,
      cleanOptions,
    });

    // Step 1: Fetch raw captions
    console.log("📡 Step 1: Fetching raw captions...");
    let extractionMethod = "unknown";
    let rawSegments: CaptionSegment[] = [];

    try {
      rawSegments = await fetchCaptions(videoUrl, {
        preferLanguage: language,
        useYtDlp: true,
      });
      extractionMethod = "yt-dlp";
    } catch (error) {
      console.warn("⚠️ yt-dlp failed, trying alternatives:", error);

      try {
        rawSegments = await fetchCaptions(videoUrl, {
          preferLanguage: language,
          useYtDlp: false,
        });
        extractionMethod = "youtube-api";
      } catch (fallbackError) {
        console.error("❌ All extraction methods failed:", fallbackError);
        throw new Error(
          `Caption extraction failed: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error"
          }`
        );
      }
    }

    if (rawSegments.length === 0) {
      return NextResponse.json(
        { success: false, error: "No captions found for this video" },
        { status: 404 }
      );
    }

    console.log(
      `✅ Raw captions extracted: ${rawSegments.length} segments via ${extractionMethod}`
    );

    // Step 2: Clean the transcript
    console.log("🧹 Step 2: Cleaning transcript...");
    const cleanedSegments = cleanTranscript(rawSegments, {
      removeTimestamps: true,
      removeTags: true,
      mergeSegments: true,
      deduplicate: true,
      maxSegmentLength: 300,
      ...cleanOptions,
    });

    console.log(
      `✅ Transcript cleaned: ${rawSegments.length} → ${cleanedSegments.length} segments`
    );

    // Step 3: Optional LLM post-processing
    let finalSegments = cleanedSegments;
    if (useLLM && cleanedSegments.length > 0) {
      console.log("🤖 Step 3: Post-processing with LLM...");
      try {
        finalSegments = await postProcessTranscriptWithLLM(cleanedSegments, {
          preserveTiming: true,
          temperature: 0.2,
        });
        console.log(
          `✅ LLM post-processing complete: ${finalSegments.length} segments`
        );
      } catch (error) {
        console.warn("⚠️ LLM post-processing failed:", error);
        // Continue with cleaned segments if LLM fails
      }
    }

    // Step 4: Calculate statistics
    const totalDuration =
      finalSegments.length > 0
        ? Math.max(...finalSegments.map((s) => s.end))
        : 0;

    const statistics = {
      originalCount: rawSegments.length,
      cleanedCount: finalSegments.length,
      totalDuration,
      extractionMethod,
    };

    // Step 5: Prepare response
    const response: ExtractCaptionsResponse = {
      success: true,
      data: {
        segments: finalSegments,
        statistics,
      },
    };

    // Add plain text if requested
    if (outputFormat === "plaintext" || outputFormat === "segments") {
      response.data!.plainText = segmentsToPlainText(finalSegments, {
        includeTimestamps: false,
        separator: " ",
        maxLength: 10000, // Limit for API response
      });
    }

    console.log("✅ Caption extraction complete:", statistics);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Caption extraction failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Missing 'url' parameter" },
      { status: 400 }
    );
  }

  // Test with default options
  try {
    const testRequest = {
      videoUrl,
      language: "en",
      cleanOptions: {
        removeTimestamps: true,
        removeTags: true,
        mergeSegments: true,
        deduplicate: true,
      },
      useLLM: false,
      outputFormat: "segments" as const,
    };

    // Simulate POST request
    const mockRequest = new NextRequest(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testRequest),
    });

    return POST(mockRequest);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



