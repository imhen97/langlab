/**
 * Advanced YouTube Transcript Extraction with Multiple Fallback Methods
 *
 * This module provides a comprehensive solution for extracting YouTube transcripts
 * using multiple fallback methods to ensure reliability even when YouTube changes
 * its API or when different videos have varying caption availability.
 *
 * Methods implemented:
 * 1. yt-dlp Integration (Preferred, Free)
 * 2. timedtext Endpoint Scraping (Backup Free Option)
 * 3. Whisper STT (When no captions exist)
 * 4. DumplingAI Transcript API (Stable Paid Option)
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";

const execAsync = promisify(exec);

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  success: boolean;
  segments: TranscriptSegment[];
  method: string;
  error?: string;
  metadata?: {
    totalDuration: number;
    segmentCount: number;
    language?: string;
  };
}

/**
 * Main function to get transcript with multiple fallback methods
 * @param videoUrl - YouTube video URL
 * @param options - Configuration options
 * @returns Transcript result with segments and metadata
 */
export async function getTranscript(
  videoUrl: string,
  options: {
    language?: string;
    preferMethod?: "yt-dlp" | "timedtext" | "dumpling" | "whisper";
    enableWhisper?: boolean;
    enableDumpling?: boolean;
    timeout?: number;
  } = {}
): Promise<TranscriptResult> {
  console.log(`🎬 Getting transcript for: ${videoUrl}`);

  const {
    language = "en",
    preferMethod,
    enableWhisper = true,
    enableDumpling = true,
    timeout = 60000, // 60 seconds default timeout
  } = options;

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return {
      success: false,
      segments: [],
      method: "none",
      error: "Invalid YouTube URL",
    };
  }

  // Define method priority based on preference
  const methods = preferMethod
    ? [
        preferMethod,
        ...getOtherMethods(preferMethod, enableWhisper, enableDumpling),
      ]
    : ["yt-dlp", "timedtext", "dumpling", "whisper"].filter((method) => {
        if (method === "whisper" && !enableWhisper) return false;
        if (method === "dumpling" && !enableDumpling) return false;
        return true;
      });

  // Try each method in order
  for (const method of methods) {
    try {
      console.log(`📡 Trying method: ${method}`);

      const result = await Promise.race([
        executeMethod(method, videoUrl, videoId, language),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Method ${method} timeout`)),
            timeout
          )
        ),
      ]);

      if (result.success && result.segments.length > 0) {
        console.log(`✅ ${method} success: ${result.segments.length} segments`);
        return result;
      }
    } catch (error) {
      console.warn(`⚠️ ${method} failed:`, error);
      continue;
    }
  }

  return {
    success: false,
    segments: [],
    method: "none",
    error: "All transcript extraction methods failed",
  };
}

/**
 * Get other methods excluding the preferred one
 */
function getOtherMethods(
  preferred: string,
  enableWhisper: boolean,
  enableDumpling: boolean
): string[] {
  const allMethods = ["yt-dlp", "timedtext", "dumpling", "whisper"];
  return allMethods
    .filter((method) => method !== preferred)
    .filter((method) => {
      if (method === "whisper" && !enableWhisper) return false;
      if (method === "dumpling" && !enableDumpling) return false;
      return true;
    });
}

/**
 * Execute specific transcript extraction method
 */
async function executeMethod(
  method: string,
  videoUrl: string,
  videoId: string,
  language: string
): Promise<TranscriptResult> {
  switch (method) {
    case "yt-dlp":
      return await extractWithYtDlp(videoUrl, language);
    case "timedtext":
      return await extractWithTimedtext(videoId, language);
    case "dumpling":
      return await extractWithDumplingAI(videoUrl);
    case "whisper":
      return await extractWithWhisper(videoUrl);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

/**
 * Extract transcript using yt-dlp (Preferred method)
 */
async function extractWithYtDlp(
  videoUrl: string,
  language: string
): Promise<TranscriptResult> {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `ytdlp_captions_${Date.now()}.vtt`);

  try {
    // Find yt-dlp executable
    const ytDlpPath = await findYtDlpExecutable();
    if (!ytDlpPath) {
      throw new Error("yt-dlp not found. Install with: pip install yt-dlp");
    }

    // Build command with multiple subtitle options
    const command = [
      `"${ytDlpPath}"`,
      `--write-sub`,
      `--write-auto-sub`,
      `--sub-lang ${language}`,
      `--sub-lang "${language}.*"`, // Include language variants
      `--skip-download`,
      `--output "${outputPath}"`,
      `"${videoUrl}"`,
    ].join(" ");

    console.log(`Running yt-dlp command: ${command}`);
    await execAsync(command);

    // Find generated subtitle files
    const files = await fs.promises.readdir(tempDir);
    const subtitleFiles = files.filter(
      (file) =>
        file.includes(`ytdlp_captions_`) &&
        (file.endsWith(".vtt") || file.endsWith(".srt"))
    );

    if (subtitleFiles.length === 0) {
      throw new Error("No subtitle files generated");
    }

    // Process the first available subtitle file
    const subtitleFile = subtitleFiles[0];
    const subtitlePath = path.join(tempDir, subtitleFile);
    const content = await fs.promises.readFile(subtitlePath, "utf-8");

    // Parse based on file extension
    const segments = subtitleFile.endsWith(".vtt")
      ? parseVTTContent(content)
      : parseSRTContent(content);

    // Clean up
    await fs.promises.unlink(subtitlePath).catch(() => {});

    return {
      success: true,
      segments: cleanSegments(segments),
      method: "yt-dlp",
      metadata: {
        totalDuration:
          segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0,
        segmentCount: segments.length,
        language,
      },
    };
  } catch (error) {
    // Clean up on error
    await fs.promises.unlink(outputPath).catch(() => {});
    throw error;
  }
}

/**
 * Extract transcript using YouTube's timedtext endpoint scraping
 */
async function extractWithTimedtext(
  videoId: string,
  language: string
): Promise<TranscriptResult> {
  try {
    // Step 1: Fetch the YouTube watch page
    const watchPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`📄 Fetching watch page: ${watchPageUrl}`);

    const watchPageResponse = await fetch(watchPageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!watchPageResponse.ok) {
      throw new Error(
        `Failed to fetch watch page: ${watchPageResponse.status}`
      );
    }

    const htmlContent = await watchPageResponse.text();

    // Step 2: Search for timedtext URL in HTML
    const timedtextRegex =
      /"captions":\s*\{[^}]*"playerCaptionsTracklistRenderer":\s*\{[^}]*"captionTracks":\s*\[([^\]]+)\]/;
    const match = htmlContent.match(timedtextRegex);

    if (!match) {
      throw new Error("No captions found in watch page");
    }

    // Step 3: Parse caption tracks JSON
    const captionTracksJson = `[${match[1]}]`;
    const captionTracks = JSON.parse(captionTracksJson);

    // Find appropriate caption track
    const captionTrack = captionTracks.find(
      (track: any) =>
        track.languageCode === language ||
        track.languageCode.startsWith(language)
    );

    if (!captionTrack || !captionTrack.baseUrl) {
      throw new Error(`No ${language} caption track found`);
    }

    // Step 4: Decode escaped characters and fetch captions
    const timedtextUrl = captionTrack.baseUrl
      .replace(/\\u0026/g, "&")
      .replace(/\\u003d/g, "=")
      .replace(/\\u003c/g, "<")
      .replace(/\\u003e/g, ">");

    console.log(`📡 Fetching timedtext: ${timedtextUrl}`);

    const captionsResponse = await fetch(timedtextUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!captionsResponse.ok) {
      throw new Error(`Failed to fetch captions: ${captionsResponse.status}`);
    }

    const captionsXml = await captionsResponse.text();
    const segments = parseTimedtextXML(captionsXml);

    return {
      success: true,
      segments: cleanSegments(segments),
      method: "timedtext",
      metadata: {
        totalDuration:
          segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0,
        segmentCount: segments.length,
        language,
      },
    };
  } catch (error) {
    throw new Error(`Timedtext extraction failed: ${error}`);
  }
}

/**
 * Extract transcript using DumplingAI API (Paid service)
 */
async function extractWithDumplingAI(
  videoUrl: string
): Promise<TranscriptResult> {
  const apiKey = process.env.DUMPLING_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "DumplingAI API key not configured. Set DUMPLING_AI_API_KEY environment variable."
    );
  }

  try {
    console.log(`🤖 Using DumplingAI API for: ${videoUrl}`);

    const response = await fetch(
      "https://app.dumplingai.com/api/v1/get-youtube-transcript",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: videoUrl,
          language: "en",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `DumplingAI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success || !data.transcript) {
      throw new Error("DumplingAI returned no transcript");
    }

    // Convert DumplingAI response to our format
    const segments: TranscriptSegment[] = data.transcript.map(
      (item: any, index: number) => ({
        start: item.start || index * 5, // Estimate timing if not provided
        end: item.end || (index + 1) * 5,
        text: item.text || item,
      })
    );

    return {
      success: true,
      segments: cleanSegments(segments),
      method: "dumpling",
      metadata: {
        totalDuration:
          segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0,
        segmentCount: segments.length,
        language: "en",
      },
    };
  } catch (error) {
    throw new Error(`DumplingAI extraction failed: ${error}`);
  }
}

/**
 * Extract transcript using Whisper STT (When no captions exist)
 */
async function extractWithWhisper(videoUrl: string): Promise<TranscriptResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured for Whisper. Set OPENAI_API_KEY environment variable."
    );
  }

  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `whisper_audio_${Date.now()}.mp3`);

  try {
    console.log(`🎤 Using Whisper STT for: ${videoUrl}`);

    // Step 1: Extract audio using yt-dlp
    const ytDlpPath = await findYtDlpExecutable();
    if (!ytDlpPath) {
      throw new Error("yt-dlp required for audio extraction");
    }

    const audioCommand = [
      `"${ytDlpPath}"`,
      `-x --audio-format mp3`,
      `--audio-quality 0`,
      `--output "${audioPath}"`,
      `"${videoUrl}"`,
    ].join(" ");

    console.log(`🎵 Extracting audio: ${audioCommand}`);
    await execAsync(audioCommand);

    // Find the generated audio file
    const files = await fs.promises.readdir(tempDir);
    const audioFile = files.find(
      (file) => file.startsWith(`whisper_audio_`) && file.endsWith(".mp3")
    );

    if (!audioFile) {
      throw new Error("Audio extraction failed");
    }

    const actualAudioPath = path.join(tempDir, audioFile);

    // Step 2: Transcribe with Whisper
    const openai = new OpenAI({ apiKey });

    console.log(`🤖 Transcribing with Whisper...`);
    const audioBuffer = await fs.promises.readFile(actualAudioPath);

    const transcription = await openai.audio.transcriptions.create({
      file: new File([new Uint8Array(audioBuffer)], "audio.mp3", {
        type: "audio/mp3",
      }),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Convert Whisper segments to our format
    const segments: TranscriptSegment[] = transcription.segments?.map(
      (segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
      })
    ) || [
      {
        start: 0,
        end: 10,
        text: transcription.text,
      },
    ];

    // Clean up audio file
    await fs.promises.unlink(actualAudioPath).catch(() => {});

    return {
      success: true,
      segments: cleanSegments(segments),
      method: "whisper",
      metadata: {
        totalDuration:
          segments.length > 0 ? Math.max(...segments.map((s) => s.end)) : 0,
        segmentCount: segments.length,
        language: "auto-detected",
      },
    };
  } catch (error) {
    // Clean up on error
    await fs.promises.unlink(audioPath).catch(() => {});
    throw new Error(`Whisper extraction failed: ${error}`);
  }
}

/**
 * Utility Functions
 */

function extractVideoId(url: string): string | null {
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

  return null;
}

async function findYtDlpExecutable(): Promise<string | null> {
  const possiblePaths = [
    "/usr/local/bin/yt-dlp",
    "/opt/homebrew/bin/yt-dlp",
    "/Users/haenakim/Library/Python/3.9/bin/yt-dlp",
    "/Users/haenakim/Library/Python/3.10/bin/yt-dlp",
    "/Users/haenakim/Library/Python/3.11/bin/yt-dlp",
    "yt-dlp", // Try system PATH
  ];

  for (const path of possiblePaths) {
    try {
      await execAsync(`"${path}" --version`);
      return path;
    } catch {
      continue;
    }
  }

  return null;
}

function parseVTTContent(vttContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const lines = vttContent.split("\n");

  let currentSegment: Partial<TranscriptSegment> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

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
      if (currentSegment.text) {
        currentSegment.text += " " + line;
      } else {
        currentSegment.text = line;
      }
    } else if (line === "" && currentSegment.text) {
      segments.push(currentSegment as TranscriptSegment);
      currentSegment = {};
    }
  }

  if (currentSegment.text) {
    segments.push(currentSegment as TranscriptSegment);
  }

  return segments;
}

function parseSRTContent(srtContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
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
      segments.push({ start: startTime, end: endTime, text });
    }
  }

  return segments;
}

function parseTimedtextXML(xmlContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Parse XML and extract text elements with timing
  const textRegex = /<text start="([^"]+)"[^>]*>([^<]+)<\/text>/g;
  let match;

  while ((match = textRegex.exec(xmlContent)) !== null) {
    const startTime = parseFloat(match[1]);
    const text = match[2]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (text) {
      segments.push({
        start: startTime,
        end: startTime + 3, // Estimate 3 second duration
        text,
      });
    }
  }

  return segments;
}

function parseVTTTime(timeStr: string): number {
  const [time, ms] = timeStr.split(".");
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

function cleanSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      text: cleanText(segment.text),
    }))
    .filter(
      (segment) =>
        segment.text &&
        segment.text.trim().length > 2 &&
        segment.end > segment.start
    );
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Convert segments to plain text transcript
 */
export function segmentsToPlainText(
  segments: TranscriptSegment[],
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
