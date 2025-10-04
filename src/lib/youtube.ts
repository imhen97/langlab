import { z } from "zod";

// Validation schemas
const VideoUrlSchema = z
  .string()
  .min(1, "URL cannot be empty")
  .refine((url) => {
    try {
      // URL이 완전한 URL이 아닌 경우 https:// 추가
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      const parsed = new URL(fullUrl);

      const validHostnames = [
        "www.youtube.com",
        "youtube.com",
        "youtu.be",
        "m.youtube.com",
      ];

      return validHostnames.includes(parsed.hostname);
    } catch {
      return false;
    }
  }, "Must be a valid YouTube URL");

export type CaptionTrack = {
  langCode: string;
  langName: string;
  kind: "manual" | "asr";
};

export type Cue = {
  start: number;
  end: number;
  text: string;
};

/**
 * Extract video ID from YouTube URL
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/, etc.
 */
export function getVideoId(url: string): string {
  const validatedUrl = VideoUrlSchema.parse(url);

  // URL이 완전한 URL이 아닌 경우 https:// 추가
  const fullUrl = validatedUrl.startsWith("http")
    ? validatedUrl
    : `https://${validatedUrl}`;
  const parsed = new URL(fullUrl);

  // Handle youtu.be/VIDEO_ID
  if (parsed.hostname === "youtu.be") {
    return parsed.pathname.slice(1);
  }

  // Handle youtube.com/shorts/VIDEO_ID
  const shortsMatch = parsed.pathname.match(/^\/shorts\/([^\/\?]+)/);
  if (shortsMatch) {
    return shortsMatch[1];
  }

  // Handle youtube.com/watch?v=VIDEO_ID and other formats
  const videoId = parsed.searchParams.get("v");
  if (videoId) {
    return videoId;
  }

  // Handle youtube.com/embed/VIDEO_ID
  const embedMatch = parsed.pathname.match(/^\/embed\/([^\/]+)/);
  if (embedMatch) {
    return embedMatch[1];
  }

  throw new Error("Could not extract video ID from YouTube URL");
}

/**
 * Fetch available caption tracks for a YouTube video
 * Uses Google's timedtext API to get all available languages
 */
export async function fetchCaptionList(
  videoId: string
): Promise<CaptionTrack[]> {
  console.log(`🔍 Fetching caption list for video: ${videoId}`);

  // Try YouTube Data API v3 first (more reliable)
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      console.log("📡 Trying YouTube Data API v3...");
      const tracks = await fetchCaptionListFromAPI(videoId, apiKey);
      if (tracks.length > 0) {
        console.log(`✅ Found ${tracks.length} tracks via YouTube Data API`);
        return tracks;
      }
    }
  } catch (error) {
    console.warn("⚠️ YouTube Data API failed:", error);
  }

  // Fallback to timedtext API
  console.log("📡 Trying timedtext API...");
  const url = `https://video.google.com/timedtext?type=list&v=${videoId}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("noCaptions");
      }
      if (response.status === 403) {
        throw new Error("regionBlocked");
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const tracks = parseCaptionListXml(xmlText);
    console.log(`📊 Found ${tracks.length} tracks via timedtext API`);
    return tracks;
  } catch (error) {
    if (error instanceof Error && error.message === "noCaptions") {
      throw error;
    }
    if (error instanceof Error && error.message === "regionBlocked") {
      throw error;
    }
    console.error("Failed to fetch caption list:", error);
    throw new Error("Failed to fetch caption tracks");
  }
}

/**
 * Fetch caption list using YouTube Data API v3
 */
async function fetchCaptionListFromAPI(
  videoId: string,
  apiKey: string
): Promise<CaptionTrack[]> {
  const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `YouTube API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map((item: any) => ({
    langCode: item.snippet.language,
    langName: item.snippet.name || item.snippet.language,
    kind: item.snippet.trackKind === "asr" ? "asr" : "manual",
  }));
}

/**
 * Parse XML response from timedtext list endpoint
 */
function parseCaptionListXml(xmlText: string): CaptionTrack[] {
  const tracks: CaptionTrack[] = [];

  console.log("🔍 Parsing caption list XML...");
  console.log("📄 XML content preview:", xmlText.substring(0, 500));

  try {
    // More flexible XML parsing for track elements
    const trackRegex = /<track[^>]*>/g;
    let match;

    while ((match = trackRegex.exec(xmlText)) !== null) {
      const trackElement = match[0];
      console.log("🔍 Found track element:", trackElement);

      // Extract attributes using more flexible regex
      const langCodeMatch = trackElement.match(/lang_code="([^"]*)"/);
      const nameMatch = trackElement.match(/name="([^"]*)"/);
      const kindMatch = trackElement.match(/kind="([^"]*)"/);

      if (langCodeMatch && nameMatch) {
        const langCode = langCodeMatch[1].trim();
        const langName = nameMatch[1].trim();
        const kind = (kindMatch ? kindMatch[1].trim() : "asr") as
          | "manual"
          | "asr";

        console.log(
          `✅ Found caption track: ${langCode} (${langName}) - ${kind}`
        );

        tracks.push({
          langCode,
          langName,
          kind,
        });
      }
    }

    // Additional fallback: look for any language codes in the XML
    if (tracks.length === 0) {
      console.log("🔄 Trying fallback parsing...");
      const langCodeRegex = /lang_code="([a-zA-Z-]+)"/g;
      let langMatch;

      while ((langMatch = langCodeRegex.exec(xmlText)) !== null) {
        const langCode = langMatch[1];
        console.log(`🔄 Found language code: ${langCode}`);

        // Check if we already have this language
        if (!tracks.some((t) => t.langCode === langCode)) {
          tracks.push({
            langCode,
            langName: langCode, // Use langCode as name if name not found
            kind: "asr",
          });
        }
      }
    }

    console.log(`📊 Total tracks found: ${tracks.length}`);
    tracks.forEach((track) => {
      console.log(`  - ${track.langCode}: ${track.langName} (${track.kind})`);
    });
  } catch (error) {
    console.error("❌ Error parsing caption list XML:", error);
  }

  return tracks;
}

/**
 * Fetch VTT content for a specific caption track
 */
export async function fetchVtt(
  videoId: string,
  langCode: string,
  format: "vtt" | "srv3" = "vtt"
): Promise<string> {
  const baseUrl = `https://video.google.com/timedtext`;
  const params = new URLSearchParams({
    v: videoId,
    lang: langCode,
    fmt: format,
    name: "",
  });

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("noCaptions");
      }
      if (response.status === 403) {
        throw new Error("regionBlocked");
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "noCaptions" || error.message === "regionBlocked")
    ) {
      throw error;
    }
    console.error("Failed to fetch VTT:", error);
    throw new Error("Failed to fetch caption content");
  }
}

/**
 * Parse VTT content into structured cues
 * Handles both VTT and SRV3 formats
 */
export function parseVttToCues(vttContent: string): Cue[] {
  console.log("🔍 Parsing VTT content...");
  console.log("📄 VTT content preview:", vttContent.substring(0, 500));

  const cues: Cue[] = [];
  const lines = vttContent.split("\n");

  let currentCue: Partial<Cue> | null = null;
  let cueText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and WEBVTT header
    if (
      !trimmedLine ||
      trimmedLine.startsWith("WEBVTT") ||
      trimmedLine.startsWith("NOTE") ||
      trimmedLine.startsWith("STYLE") ||
      trimmedLine.startsWith("REGION")
    ) {
      continue;
    }

    // Check if this line contains timing information (more flexible pattern)
    const timingMatch = trimmedLine.match(
      /^(\d{1,2}:\d{2}:\d{2}(?:\.\d{3})?)\s*-->\s*(\d{1,2}:\d{2}:\d{2}(?:\.\d{3})?)/
    );

    if (timingMatch) {
      // Save previous cue if exists
      if (
        currentCue &&
        currentCue.start !== undefined &&
        currentCue.end !== undefined &&
        cueText.trim()
      ) {
        const cleanText = cueText
          .trim()
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        if (cleanText) {
          cues.push({
            start: currentCue.start,
            end: currentCue.end,
            text: cleanText,
          });
          console.log(
            `✅ Added cue: ${currentCue.start}s-${
              currentCue.end
            }s: ${cleanText.substring(0, 50)}...`
          );
        }
      }

      // Start new cue
      const startTime = parseTimeToSeconds(timingMatch[1]);
      const endTime = parseTimeToSeconds(timingMatch[2]);

      currentCue = {
        start: startTime,
        end: endTime,
      };
      cueText = "";

      // Collect text lines until next timing line or end
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();

        // Stop if we hit another timing line or empty line
        if (!nextLine || nextLine.match(/^\d{1,2}:\d{2}:\d{2}/)) {
          break;
        }

        // Skip cue identifiers (numbers)
        if (!/^\d+$/.test(nextLine)) {
          if (cueText) cueText += " ";
          cueText += nextLine;
        }
        j++;
      }

      i = j - 1; // Adjust loop index
    }
  }

  // Handle last cue
  if (
    currentCue &&
    currentCue.start !== undefined &&
    currentCue.end !== undefined &&
    cueText.trim()
  ) {
    const cleanText = cueText
      .trim()
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    if (cleanText) {
      cues.push({
        start: currentCue.start,
        end: currentCue.end,
        text: cleanText,
      });
    }
  }

  console.log(`📊 Parsed ${cues.length} cues from VTT content`);
  return cues;
}

/**
 * Parse time string to seconds
 * Supports formats: HH:MM:SS.mmm, MM:SS.mmm, SS.mmm
 */
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  let seconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    seconds += parseInt(parts[0]) * 3600;
    seconds += parseInt(parts[1]) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    seconds += parseInt(parts[0]) * 60;
    seconds += parseFloat(parts[1]);
  } else {
    // SS.mmm
    seconds = parseFloat(parts[0]);
  }

  return Math.round(seconds * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Enhanced deduplication with better overlap handling and word-level timing
 * Based on patterns from Reddit data analysis and YouTube subtitle issues
 */
export function dedupeCues(cues: Cue[]): Cue[] {
  if (cues.length === 0) return cues;

  // Sort cues by start time to ensure proper ordering
  const sortedCues = [...cues].sort((a, b) => a.start - b.start);

  const deduped: Cue[] = [];
  let lastCue: Cue | null = null;

  for (const cue of sortedCues) {
    // Skip zero-length or negative-length cues
    if (cue.end <= cue.start) {
      console.log(`⚠️ Skipping invalid cue: ${cue.start}-${cue.end}`);
      continue;
    }

    // Normalize text for comparison
    const normalizedText = cue.text.toLowerCase().replace(/\s+/g, " ").trim();

    if (!normalizedText) {
      console.log(`⚠️ Skipping empty text cue: ${cue.start}-${cue.end}`);
      continue;
    }

    if (lastCue) {
      const lastNormalizedText = lastCue.text
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      // Check for overlapping cues
      const isOverlapping = cue.start < lastCue.end;
      const timeGap = cue.start - lastCue.end;
      const isSmallGap = timeGap <= 0.3; // 300ms gap tolerance
      const isIdentical = normalizedText === lastNormalizedText;

      // Check for partial text overlap (one contains the other)
      const isSubset =
        normalizedText.includes(lastNormalizedText) ||
        lastNormalizedText.includes(normalizedText);
      const isSuperset = normalizedText.length > lastNormalizedText.length;

      if (isIdentical && (isOverlapping || isSmallGap)) {
        // Merge identical overlapping cues
        lastCue.end = Math.max(lastCue.end, cue.end);
        lastCue.text = isSuperset ? cue.text : lastCue.text; // Use longer text, or keep original for identical length
        console.log(
          `🔄 Merged identical cue: ${cue.start}-${cue.end} with ${lastCue.start}-${lastCue.end}`
        );
        continue;
      }

      if (isOverlapping && isSubset) {
        // Handle partial overlaps - extend the longer cue
        if (isSuperset) {
          // Current cue is longer, replace last cue
          lastCue.start = Math.min(lastCue.start, cue.start);
          lastCue.end = Math.max(lastCue.end, cue.end);
          lastCue.text = cue.text;
          console.log(
            `🔄 Extended cue with longer text: ${cue.start}-${cue.end}`
          );
          continue;
        } else {
          // Last cue is longer, extend its end time
          lastCue.end = Math.max(lastCue.end, cue.end);
          console.log(
            `🔄 Extended existing cue end time: ${lastCue.start}-${lastCue.end}`
          );
          continue;
        }
      }

      if (isOverlapping && !isSubset) {
        // Handle non-subset overlaps - split or adjust timing
        const overlapDuration = lastCue.end - cue.start;
        const lastCueDuration = lastCue.end - lastCue.start;
        const currentCueDuration = cue.end - cue.start;

        if (
          overlapDuration >
          Math.min(lastCueDuration, currentCueDuration) * 0.5
        ) {
          // Significant overlap - merge and use longer text
          const mergedText =
            lastCueDuration > currentCueDuration ? lastCue.text : cue.text;

          lastCue.start = Math.min(lastCue.start, cue.start);
          lastCue.end = Math.max(lastCue.end, cue.end);
          lastCue.text = mergedText;
          console.log(
            `🔄 Merged overlapping cues: ${cue.start}-${cue.end} with ${lastCue.start}-${lastCue.end}`
          );
          continue;
        } else {
          // Minor overlap - adjust timing to remove overlap
          const adjustedStart = Math.max(cue.start, lastCue.end);
          if (adjustedStart < cue.end) {
            cue.start = adjustedStart;
            console.log(
              `⏰ Adjusted cue start to remove overlap: ${adjustedStart}-${cue.end}`
            );
          } else {
            console.log(
              `⚠️ Skipping cue due to timing conflict: ${cue.start}-${cue.end}`
            );
            continue;
          }
        }
      }
    }

    // Add the cue
    deduped.push(cue);
    lastCue = cue;
  }

  console.log(
    `📊 Enhanced deduplication: ${cues.length} → ${deduped.length} cues`
  );
  return deduped;
}

/**
 * Detect if video is restricted (age-restricted, members-only, region-blocked)
 */
export function detectRestrictedVideo(vttContent: string): string | null {
  const lowerContent = vttContent.toLowerCase();

  if (
    lowerContent.includes("age-restricted") ||
    lowerContent.includes("age restricted")
  ) {
    return "ageRestricted";
  }

  if (
    lowerContent.includes("members-only") ||
    lowerContent.includes("members only")
  ) {
    return "membersOnly";
  }

  if (
    lowerContent.includes("region-blocked") ||
    lowerContent.includes("region blocked")
  ) {
    return "regionBlocked";
  }

  if (lowerContent.includes("live") && lowerContent.includes("not supported")) {
    return "liveUnsupported";
  }

  return null;
}

/**
 * Decode HTML entities in text
 */
export function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

/**
 * Fetch YouTube video metadata using YouTube Data API v3
 */
export async function getYouTubeVideoInfo(videoId: string): Promise<any> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YouTube API key not configured");
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `YouTube API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const video = data.items[0];

  return {
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    channelTitle: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    duration: video.contentDetails.duration,
    viewCount: video.statistics.viewCount,
    likeCount: video.statistics.likeCount,
    commentCount: video.statistics.commentCount,
  };
}

/**
 * Fetch YouTube video metadata with transcript/caption information
 */
export async function getYouTubeVideoWithTranscript(videoId: string): Promise<{
  videoId: string;
  videoInfo?: any;
  transcript?: any[];
  hasCaptions: boolean;
  error?: string;
  trackInfo?: CaptionTrack[];
}> {
  try {
    // Get video metadata
    const videoInfo = await getYouTubeVideoInfo(videoId);

    if (!videoInfo) {
      return {
        videoId,
        hasCaptions: false,
        error: "Video not found",
      };
    }

    // Try to get caption tracks
    let captionTracks: CaptionTrack[] = [];
    let hasCaptions = false;

    try {
      captionTracks = await fetchCaptionList(videoId);
      hasCaptions = captionTracks.length > 0;
    } catch (error) {
      console.warn("Failed to fetch caption tracks:", error);
    }

    // Try to get transcript if captions are available
    let transcript: any[] = [];
    let trackInfo: CaptionTrack[] = [];

    if (hasCaptions) {
      // Find English caption track (manual or auto)
      const englishTrack = captionTracks.find(
        (track) => track.langCode.startsWith("en") || track.langCode === "en"
      );

      if (englishTrack) {
        try {
          const vttContent = await fetchVtt(videoId, englishTrack.langCode);
          const cues = parseVttToCues(vttContent);
          const processedCues = dedupeCues(cues);

          transcript = processedCues.map((cue) => ({
            start: cue.start,
            end: cue.end,
            text: decodeHtmlEntities(cue.text),
          }));

          trackInfo = [englishTrack];
        } catch (error) {
          console.warn("Failed to fetch transcript content:", error);
        }
      }
    }

    return {
      videoId,
      videoInfo,
      transcript,
      hasCaptions,
      trackInfo,
    };
  } catch (error) {
    console.error("Error in getYouTubeVideoWithTranscript:", error);
    return {
      videoId,
      hasCaptions: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Legacy exports for backward compatibility
export const getVideoIdFromUrl = getVideoId;
export const fetchCaptionTracks = fetchCaptionList;
export const parseVttContent = parseVttToCues;
