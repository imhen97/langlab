import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getVideoId,
  fetchVtt,
  parseVttToCues,
  dedupeCues,
  detectRestrictedVideo,
  decodeHtmlEntities,
} from "@/lib/youtube";

// Validation schema
const FileCaptionsSchema = z.object({
  videoUrl: z.string().min(1, "videoUrl is required"),
  lang: z.string().min(1, "lang is required"),
  format: z.enum(["vtt", "srv3"]).default("vtt"),
});

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("videoUrl");
    const lang = searchParams.get("lang");
    const format = searchParams.get("format") || "vtt";

    if (!videoUrl || !lang) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          code: "MISSING_PARAMETERS",
          details: "Please provide videoUrl and lang parameters",
        },
        { status: 400 }
      );
    }

    // Validate the parameters
    const validatedParams = FileCaptionsSchema.parse({
      videoUrl,
      lang,
      format: format as "vtt" | "srv3",
    });

    console.log(
      `🔍 Fetching captions for video: ${videoUrl}, lang: ${lang}, format: ${format}`
    );

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

    // Fetch VTT content
    let vttContent: string;
    try {
      console.log(`📡 Fetching VTT content for ${videoId} in ${lang}...`);
      vttContent = await fetchVtt(
        videoId,
        validatedParams.lang,
        validatedParams.format
      );
      console.log(`✅ Fetched VTT content (${vttContent.length} characters)`);
    } catch (error) {
      console.error("❌ Failed to fetch VTT content:", error);

      if (error instanceof Error) {
        if (error.message === "noCaptions") {
          return NextResponse.json(
            {
              error: "No captions available",
              code: "NO_CAPTIONS",
              reason: "noCaptions",
              details:
                "This video does not have captions in the requested language",
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
          error: "Failed to fetch caption content",
          code: "FETCH_ERROR",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Check for restricted video indicators
    const restrictionReason = detectRestrictedVideo(vttContent);
    if (restrictionReason) {
      console.log(`⚠️ Video restriction detected: ${restrictionReason}`);
      return NextResponse.json(
        {
          error: "Video access restricted",
          code: "RESTRICTED_VIDEO",
          reason: restrictionReason,
          details: getRestrictionMessage(restrictionReason),
        },
        { status: 403 }
      );
    }

    // Parse VTT content to cues
    let cues;
    try {
      console.log("🔍 Parsing VTT content to cues...");
      cues = parseVttToCues(vttContent);
      console.log(`📊 Parsed ${cues.length} cues from VTT`);
    } catch (error) {
      console.error("❌ Failed to parse VTT content:", error);
      return NextResponse.json(
        {
          error: "Failed to parse caption content",
          code: "PARSE_ERROR",
          details:
            error instanceof Error ? error.message : "Unknown parsing error",
        },
        { status: 500 }
      );
    }

    // Deduplicate and merge cues
    let processedCues;
    try {
      console.log("🔄 Processing and deduplicating cues...");
      processedCues = dedupeCues(cues);
      console.log(
        `📊 Processed ${processedCues.length} cues after deduplication`
      );
    } catch (error) {
      console.error("❌ Failed to process cues:", error);
      return NextResponse.json(
        {
          error: "Failed to process caption cues",
          code: "PROCESSING_ERROR",
          details:
            error instanceof Error ? error.message : "Unknown processing error",
        },
        { status: 500 }
      );
    }

    // Decode HTML entities in cue text
    const finalCues = processedCues.map((cue) => ({
      ...cue,
      text: decodeHtmlEntities(cue.text),
    }));

    // Validate cue ordering
    const validationResult = validateCueOrdering(finalCues);
    if (!validationResult.isValid) {
      console.warn("⚠️ Cue ordering issues detected:", validationResult.issues);
    }

    // Return the processed cues
    return NextResponse.json(
      {
        videoId,
        videoUrl: validatedParams.videoUrl,
        lang: validatedParams.lang,
        format: validatedParams.format,
        cues: finalCues,
        totalCues: finalCues.length,
        duration:
          finalCues.length > 0 ? finalCues[finalCues.length - 1].end : 0,
        validation: validationResult,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800", // 1 day cache, 1 week stale
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error in /api/captions/file:", error);

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

/**
 * Get user-friendly message for restriction reason
 */
function getRestrictionMessage(reason: string): string {
  switch (reason) {
    case "ageRestricted":
      return "This video is age-restricted and captions are not available";
    case "membersOnly":
      return "This video is members-only and captions are not available";
    case "regionBlocked":
      return "This video is not available in your region";
    case "liveUnsupported":
      return "Live video captions are not supported yet";
    default:
      return "Video access is restricted";
  }
}

/**
 * Validate that cues are properly ordered and have valid timing
 */
function validateCueOrdering(
  cues: Array<{ start: number; end: number; text: string }>
) {
  const issues: string[] = [];

  if (cues.length === 0) {
    return { isValid: true, issues: [] };
  }

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];

    // Check for valid timing
    if (cue.start >= cue.end) {
      issues.push(
        `Cue ${i}: Invalid timing (start >= end): ${cue.start} >= ${cue.end}`
      );
    }

    // Check for ordering
    if (i > 0) {
      const prevCue = cues[i - 1];
      if (cue.start < prevCue.start) {
        issues.push(
          `Cue ${i}: Out of order (start < previous start): ${cue.start} < ${prevCue.start}`
        );
      }
    }

    // Check for overlapping cues
    if (i > 0) {
      const prevCue = cues[i - 1];
      if (cue.start < prevCue.end) {
        issues.push(
          `Cue ${i}: Overlapping with previous cue: ${cue.start} < ${prevCue.end}`
        );
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
