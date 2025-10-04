import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";

const execAsync = promisify(exec);

export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface CleanTranscriptOptions {
  removeTimestamps?: boolean;
  removeTags?: boolean;
  mergeSegments?: boolean;
  deduplicate?: boolean;
  postProcessWithLLM?: boolean;
  maxSegmentLength?: number;
}

/**
 * Fetch captions from YouTube using multiple methods
 * @param videoUrl - YouTube video URL
 * @param options - Extraction options
 * @returns Array of caption segments
 */
export async function fetchCaptions(
  videoUrl: string,
  options: { preferLanguage?: string; useYtDlp?: boolean } = {}
): Promise<CaptionSegment[]> {
  console.log(`🎬 Fetching captions for: ${videoUrl}`);

  const { preferLanguage = "en", useYtDlp = true } = options;

  try {
    // Method 1: Try yt-dlp first (most reliable for auto-generated captions)
    if (useYtDlp) {
      try {
        console.log("📡 Trying yt-dlp extraction...");
        const ytDlpCaptions = await fetchCaptionsWithYtDlp(
          videoUrl,
          preferLanguage
        );
        if (ytDlpCaptions.length > 0) {
          console.log(`✅ yt-dlp success: ${ytDlpCaptions.length} segments`);
          return ytDlpCaptions;
        }
      } catch (error) {
        console.warn("⚠️ yt-dlp failed:", error);
      }
    }

    // Method 2: Try YouTube Data API v3
    try {
      console.log("📡 Trying YouTube Data API v3...");
      const apiCaptions = await fetchCaptionsWithYouTubeAPI(
        videoUrl,
        preferLanguage
      );
      if (apiCaptions.length > 0) {
        console.log(`✅ YouTube API success: ${apiCaptions.length} segments`);
        return apiCaptions;
      }
    } catch (error) {
      console.warn("⚠️ YouTube API failed:", error);
    }

    // Method 3: Try YouTube's timedtext endpoint
    try {
      console.log("📡 Trying YouTube timedtext endpoint...");
      const timedtextCaptions = await fetchCaptionsWithTimedtext(
        videoUrl,
        preferLanguage
      );
      if (timedtextCaptions.length > 0) {
        console.log(
          `✅ timedtext success: ${timedtextCaptions.length} segments`
        );
        return timedtextCaptions;
      }
    } catch (error) {
      console.warn("⚠️ timedtext endpoint failed:", error);
    }

    throw new Error("All caption extraction methods failed");
  } catch (error) {
    console.error("❌ Caption extraction failed:", error);
    throw error;
  }
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  throw new Error("Could not extract video ID from YouTube URL");
}

/**
 * Fetch captions using yt-dlp
 */
async function fetchCaptionsWithYtDlp(
  videoUrl: string,
  language: string
): Promise<CaptionSegment[]> {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `captions_${Date.now()}.vtt`);

  try {
    // Try to find yt-dlp in common locations
    const ytDlpPaths = [
      "/usr/local/bin/yt-dlp",
      "/opt/homebrew/bin/yt-dlp",
      "/Users/haenakim/Library/Python/3.9/bin/yt-dlp",
      "/Users/haenakim/Library/Python/3.10/bin/yt-dlp",
      "/Users/haenakim/Library/Python/3.11/bin/yt-dlp",
      "yt-dlp", // Try system PATH
    ];

    let ytDlpPath = "";
    for (const path of ytDlpPaths) {
      try {
        await execAsync(`"${path}" --version`);
        ytDlpPath = path;
        break;
      } catch {
        continue;
      }
    }

    if (!ytDlpPath) {
      throw new Error("yt-dlp not found. Please install yt-dlp first.");
    }

    // Extract auto-generated captions
    const command = `"${ytDlpPath}" --write-auto-sub --sub-lang ${language} --skip-download --output "${outputPath}" "${videoUrl}"`;
    console.log("Running yt-dlp command:", command);

    await execAsync(command);

    // Find the generated VTT file
    const files = await fs.promises.readdir(tempDir);
    const vttFile = files.find(
      (file) =>
        file.startsWith(`captions_`) && file.endsWith(`.${language}.vtt`)
    );

    if (!vttFile) {
      throw new Error("No VTT file generated");
    }

    const vttPath = path.join(tempDir, vttFile);
    const vttContent = await fs.promises.readFile(vttPath, "utf-8");

    // Parse VTT content
    const segments = parseVTTContent(vttContent);

    // Clean up
    await fs.promises.unlink(vttPath).catch(() => {});

    return segments;
  } catch (error) {
    // Clean up on error
    await fs.promises.unlink(outputPath).catch(() => {});
    throw error;
  }
}

/**
 * Fetch captions using YouTube Data API v3
 */
async function fetchCaptionsWithYouTubeAPI(
  videoUrl: string,
  language: string
): Promise<CaptionSegment[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API key not configured");
  }

  const videoId = extractVideoId(videoUrl);

  // Get available captions
  const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
  const captionsResponse = await fetch(captionsUrl);

  if (!captionsResponse.ok) {
    throw new Error(`YouTube Captions API error: ${captionsResponse.status}`);
  }

  const captionsData = await captionsResponse.json();

  if (!captionsData.items || captionsData.items.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Find captions in preferred language
  const caption = captionsData.items.find(
    (item: any) =>
      item.snippet.language === language ||
      item.snippet.name.toLowerCase().includes(language)
  );

  if (!caption) {
    throw new Error(`No ${language} captions found`);
  }

  // Download caption content
  const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${caption.id}?key=${apiKey}`;
  const downloadResponse = await fetch(downloadUrl);

  if (!downloadResponse.ok) {
    throw new Error(`Caption download error: ${downloadResponse.status}`);
  }

  const captionText = await downloadResponse.text();

  // Parse SRT format
  return parseSRTContent(captionText);
}

/**
 * Fetch captions using YouTube's timedtext endpoint
 */
async function fetchCaptionsWithTimedtext(
  videoUrl: string,
  language: string
): Promise<CaptionSegment[]> {
  const videoId = extractVideoId(videoUrl);

  const url = `https://video.google.com/timedtext?lang=${language}&v=${videoId}&fmt=vtt`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const vttContent = await response.text();
  return parseVTTContent(vttContent);
}

/**
 * Parse VTT content into segments
 */
function parseVTTContent(vttContent: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const lines = vttContent.split("\n");

  let currentSegment: Partial<CaptionSegment> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for timestamp line
    const timeMatch = line.match(
      /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
    );

    if (timeMatch) {
      const startTime = parseVTTTime(timeMatch[1]);
      const endTime = parseVTTTime(timeMatch[2]);

      currentSegment = { start: startTime, end: endTime, text: "" };
    } else if (
      line &&
      !line.startsWith("WEBVTT") &&
      !line.startsWith("NOTE") &&
      currentSegment.start !== undefined
    ) {
      // This is text content
      if (currentSegment.text) {
        currentSegment.text += " " + line;
      } else {
        currentSegment.text = line;
      }
    } else if (line === "" && currentSegment.text) {
      // End of segment
      segments.push(currentSegment as CaptionSegment);
      currentSegment = {};
    }
  }

  // Add last segment if exists
  if (currentSegment.text) {
    segments.push(currentSegment as CaptionSegment);
  }

  return segments;
}

/**
 * Parse SRT content into segments
 */
function parseSRTContent(srtContent: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );
    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(2).join(" ").replace(/\s+/g, " ").trim();

    if (text) {
      segments.push({
        start: startTime,
        end: endTime,
        text: text,
      });
    }
  }

  return segments;
}

/**
 * Parse VTT time format to seconds
 */
function parseVTTTime(timeStr: string): number {
  const [time, ms] = timeStr.split(".");
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

/**
 * Clean transcript text by removing timestamps, tags, and duplicates
 * @param segments - Raw caption segments
 * @param options - Cleaning options
 * @returns Cleaned caption segments
 */
export function cleanTranscript(
  segments: CaptionSegment[],
  options: CleanTranscriptOptions = {}
): CaptionSegment[] {
  console.log(`🧹 Cleaning transcript: ${segments.length} segments`);

  const {
    removeTimestamps = true,
    removeTags = true,
    mergeSegments = true,
    deduplicate = true,
    maxSegmentLength = 300, // 5 minutes max per segment
  } = options;

  let cleaned = [...segments];

  // Step 1: Remove HTML tags and timestamps from text
  if (removeTags) {
    cleaned = cleaned.map((segment) => ({
      ...segment,
      text: cleanTextContent(segment.text),
    }));
  }

  // Step 2: Remove empty or very short segments
  cleaned = cleaned.filter(
    (segment) =>
      segment.text &&
      segment.text.trim().length > 2 &&
      segment.end > segment.start
  );

  // Step 3: Deduplicate overlapping segments
  if (deduplicate) {
    cleaned = deduplicateSegments(cleaned);
  }

  // Step 4: Merge adjacent segments
  if (mergeSegments) {
    cleaned = mergeAdjacentSegments(cleaned);
  }

  // Step 5: Split very long segments
  cleaned = splitLongSegments(cleaned, maxSegmentLength);

  console.log(
    `✅ Transcript cleaned: ${segments.length} → ${cleaned.length} segments`
  );
  return cleaned;
}

/**
 * Clean individual text content
 */
function cleanTextContent(text: string): string {
  let cleaned = text;

  // Remove HTML-like tags: <c>, <c.colorXXXXXX>, </c>, etc.
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // Remove timestamp patterns: 00:00:01.790, 01:23:45, etc.
  cleaned = cleaned.replace(/\d{1,2}:\d{2}:\d{2}(?:\.\d{3})?/g, "");

  // Remove HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Deduplicate overlapping or identical segments
 */
function deduplicateSegments(segments: CaptionSegment[]): CaptionSegment[] {
  if (segments.length === 0) return segments;

  // Sort by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const deduped: CaptionSegment[] = [];
  let lastSegment: CaptionSegment | null = null;

  for (const segment of sorted) {
    if (!lastSegment) {
      deduped.push(segment);
      lastSegment = segment;
      continue;
    }

    const isOverlapping = segment.start < lastSegment.end;
    const isIdentical =
      segment.text.toLowerCase().trim() ===
      lastSegment.text.toLowerCase().trim();
    const isSubset =
      lastSegment.text.toLowerCase().includes(segment.text.toLowerCase()) ||
      segment.text.toLowerCase().includes(lastSegment.text.toLowerCase());

    if (isOverlapping && (isIdentical || isSubset)) {
      // Merge overlapping segments
      if (segment.text.length > lastSegment.text.length) {
        lastSegment.text = segment.text;
      }
      lastSegment.end = Math.max(lastSegment.end, segment.end);
    } else {
      // Add as new segment
      deduped.push(segment);
      lastSegment = segment;
    }
  }

  return deduped;
}

/**
 * Merge adjacent segments with small gaps
 */
function mergeAdjacentSegments(segments: CaptionSegment[]): CaptionSegment[] {
  if (segments.length === 0) return segments;

  const merged: CaptionSegment[] = [];
  let currentSegment = segments[0];

  for (let i = 1; i < segments.length; i++) {
    const nextSegment = segments[i];
    const gap = nextSegment.start - currentSegment.end;

    // Merge if gap is less than 2 seconds and total length is reasonable
    if (
      gap <= 2 &&
      (currentSegment.text + " " + nextSegment.text).length < 500
    ) {
      currentSegment.text += " " + nextSegment.text;
      currentSegment.end = nextSegment.end;
    } else {
      merged.push(currentSegment);
      currentSegment = nextSegment;
    }
  }

  merged.push(currentSegment);
  return merged;
}

/**
 * Split very long segments
 */
function splitLongSegments(
  segments: CaptionSegment[],
  maxLength: number
): CaptionSegment[] {
  const split: CaptionSegment[] = [];

  for (const segment of segments) {
    if (segment.end - segment.start <= maxLength) {
      split.push(segment);
    } else {
      // Split long segment into smaller chunks
      const duration = segment.end - segment.start;
      const chunkCount = Math.ceil(duration / maxLength);
      const chunkDuration = duration / chunkCount;
      const words = segment.text.split(" ");
      const wordsPerChunk = Math.ceil(words.length / chunkCount);

      for (let i = 0; i < chunkCount; i++) {
        const startTime = segment.start + i * chunkDuration;
        const endTime = Math.min(
          segment.start + (i + 1) * chunkDuration,
          segment.end
        );
        const startWord = i * wordsPerChunk;
        const endWord = Math.min((i + 1) * wordsPerChunk, words.length);
        const chunkText = words.slice(startWord, endWord).join(" ");

        if (chunkText.trim()) {
          split.push({
            start: startTime,
            end: endTime,
            text: chunkText.trim(),
          });
        }
      }
    }
  }

  return split;
}

/**
 * Post-process transcript with LLM for natural sentence formatting
 * @param segments - Caption segments
 * @param options - Processing options
 * @returns Post-processed segments
 */
export async function postProcessTranscriptWithLLM(
  segments: CaptionSegment[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    preserveTiming?: boolean;
  } = {}
): Promise<CaptionSegment[]> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.2,
    maxTokens = 2000,
    preserveTiming = true,
  } = options;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      "⚠️ OpenAI API key not available, skipping LLM post-processing"
    );
    return segments;
  }

  try {
    console.log("🤖 Post-processing transcript with LLM...");

    const openai = new OpenAI({ apiKey });

    // Combine all text
    const fullText = segments.map((s) => s.text).join(" ");

    const prompt = `Please reformat this transcript text into natural, readable sentences with proper punctuation and spacing. Remove any broken word segments and fix grammar where needed. Keep the content accurate but make it flow naturally.

Original text:
"${fullText}"

Return only the corrected text with proper sentences and punctuation.`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a professional text formatter. Fix transcript text to be natural and readable while preserving the original meaning.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const processedText = completion.choices[0]?.message?.content?.trim();

    if (!processedText) {
      console.warn("⚠️ No response from LLM, returning original segments");
      return segments;
    }

    if (preserveTiming) {
      // Split processed text back into segments with preserved timing
      return splitProcessedTextWithTiming(processedText, segments);
    } else {
      // Return as single segment
      return [
        {
          start: segments[0]?.start || 0,
          end: segments[segments.length - 1]?.end || 0,
          text: processedText,
        },
      ];
    }
  } catch (error) {
    console.error("❌ LLM post-processing failed:", error);
    return segments;
  }
}

/**
 * Split processed text back into segments while preserving timing
 */
function splitProcessedTextWithTiming(
  processedText: string,
  originalSegments: CaptionSegment[]
): CaptionSegment[] {
  const sentences = processedText.split(/[.!?]+/).filter((s) => s.trim());
  const result: CaptionSegment[] = [];

  let sentenceIndex = 0;
  const totalDuration = originalSegments[originalSegments.length - 1]?.end || 0;
  const durationPerSentence = totalDuration / Math.max(sentences.length, 1);

  for (const sentence of sentences) {
    const startTime = sentenceIndex * durationPerSentence;
    const endTime = Math.min(
      (sentenceIndex + 1) * durationPerSentence,
      totalDuration
    );

    result.push({
      start: startTime,
      end: endTime,
      text: sentence.trim(),
    });

    sentenceIndex++;
  }

  return result;
}

/**
 * Convert segments to plain text
 * @param segments - Caption segments
 * @param options - Formatting options
 * @returns Plain text transcript
 */
export function segmentsToPlainText(
  segments: CaptionSegment[],
  options: {
    includeTimestamps?: boolean;
    separator?: string;
    maxLength?: number;
  } = {}
): string {
  const { includeTimestamps = false, separator = " ", maxLength } = options;

  let text = segments
    .map((segment) => {
      if (includeTimestamps) {
        const startTime = formatTime(segment.start);
        return `[${startTime}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(separator);

  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength) + "...";
  }

  return text;
}

/**
 * Format time in seconds to HH:MM:SS format
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
}



