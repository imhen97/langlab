import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { dedupeCaptions, type Cap } from "@/lib/transcript/clean";

const execAsync = promisify(exec);

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface BilingualTranscriptSegment {
  start: number;
  end: number;
  en: string;
  ko: string;
}

interface TranscriptResponse {
  success: boolean;
  transcript?: BilingualTranscriptSegment[];
  error?: string;
  method?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<TranscriptResponse>> {
  try {
    console.log("🎬 Starting transcript extraction...");

    const { url } = await request.json();

    if (!url) {
      console.error("❌ No URL provided");
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Step 1: Validate YouTube URL
    console.log("🔍 Step 1: Validating YouTube URL...");
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error("❌ Invalid YouTube URL:", url);
      return NextResponse.json(
        { success: false, error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }
    console.log("✅ Valid YouTube URL, video ID:", videoId);

    // Step 2: Try YouTube Data API v3
    console.log("📡 Step 2: Trying YouTube Data API v3...");
    try {
      const transcript = await fetchYouTubeTranscript(videoId);
      if (transcript && transcript.length > 0) {
        console.log("✅ YouTube API success:", transcript.length, "segments");
        const bilingualTranscript = convertToBilingualFormat(transcript);
        return NextResponse.json({
          success: true,
          transcript: bilingualTranscript,
          method: "YouTube Data API v3",
        });
      }
    } catch (error) {
      console.warn("⚠️ YouTube API failed:", error);
    }

    // Step 3: Try yt-dlp for auto-generated captions (if available)
    console.log("🔄 Step 3: Trying yt-dlp for auto-generated captions...");
    try {
      const transcript = await fetchTranscriptWithYtDlp(url);
      if (transcript && transcript.length > 0) {
        console.log("✅ yt-dlp success:", transcript.length, "segments");
        const bilingualTranscript = convertToBilingualFormat(transcript);
        return NextResponse.json({
          success: true,
          transcript: bilingualTranscript,
          method: "yt-dlp auto-captions",
        });
      }
    } catch (error) {
      console.warn("⚠️ yt-dlp failed (may not be installed):", error);
    }

    // Step 4: Try yt-dlp + Whisper for audio transcription (if available)
    console.log(
      "🎤 Step 4: Trying yt-dlp + Whisper for audio transcription..."
    );
    try {
      const transcript = await fetchTranscriptWithWhisper(url);
      if (transcript && transcript.length > 0) {
        console.log("✅ Whisper success:", transcript.length, "segments");
        const bilingualTranscript = convertToBilingualFormat(transcript);
        return NextResponse.json({
          success: true,
          transcript: bilingualTranscript,
          method: "yt-dlp + Whisper",
        });
      }
    } catch (error) {
      console.warn("⚠️ Whisper failed (may not be configured):", error);
    }

    // Step 5: Fallback to YouTube API-based content generation
    console.log("📝 Step 5: Using YouTube API fallback...");
    try {
      const { getYouTubeVideoInfo } = await import("@/lib/youtube");
      const videoInfo = await getYouTubeVideoInfo(videoId);

      // 비디오 정보를 기반으로 학습 콘텐츠 생성
      const contentBasedTranscript = generateContentBasedTranscript(videoInfo);
      console.log(
        "✅ Content-based transcript generated:",
        contentBasedTranscript.length,
        "segments"
      );
      const bilingualContentTranscript = convertToBilingualFormat(
        contentBasedTranscript
      );
      return NextResponse.json({
        success: true,
        transcript: bilingualContentTranscript,
        method: "YouTube API fallback",
        videoInfo: {
          title: videoInfo.title,
          channelTitle: videoInfo.channelTitle,
          description: videoInfo.description?.substring(0, 200) + "...",
        },
      });
    } catch (error) {
      console.warn("⚠️ YouTube API fallback failed:", error);

      // Final fallback to mock transcript
      console.log("📝 Final fallback: Using mock transcript...");
      const mockTranscript = generateMockTranscript();
      console.log(
        "✅ Mock transcript generated:",
        mockTranscript.length,
        "segments"
      );
      const bilingualMockTranscript = convertToBilingualFormat(mockTranscript);
      return NextResponse.json({
        success: true,
        transcript: bilingualMockTranscript,
        method: "Mock transcript (final fallback)",
      });
    }
  } catch (error) {
    console.error("💥 Transcript extraction failed:", error);
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

async function fetchYouTubeTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YouTube API key not configured");
  }

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

  // Find English captions
  const englishCaption = captionsData.items.find(
    (item: any) =>
      item.snippet.language === "en" ||
      item.snippet.name.toLowerCase().includes("english")
  );

  if (!englishCaption) {
    throw new Error("No English captions found");
  }

  // Download caption content
  const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${englishCaption.id}?key=${apiKey}`;
  const downloadResponse = await fetch(downloadUrl);

  if (!downloadResponse.ok) {
    throw new Error(`Caption download error: ${downloadResponse.status}`);
  }

  const captionText = await downloadResponse.text();

  // Parse SRT format
  const raw = parseSRTCaptions(captionText);
  // Server-side de-duplication
  const caps: Cap[] = raw.map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text,
  }));
  const deduped = dedupeCaptions(caps).map((c) => ({
    start: c.start,
    end: c.end,
    text: c.text,
  }));
  return deduped;
}

function parseSRTCaptions(srtContent: string): TranscriptSegment[] {
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
      segments.push({
        start: startTime,
        end: endTime,
        text: text,
      });
    }
  }

  return segments;
}

async function fetchTranscriptWithYtDlp(
  url: string
): Promise<TranscriptSegment[]> {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `transcript_${Date.now()}.vtt`);

  try {
    // Use yt-dlp to extract auto-generated captions
    const ytDlpPath = "/Users/haenakim/Library/Python/3.9/bin/yt-dlp";
    const command = `${ytDlpPath} --write-auto-sub --sub-lang en --skip-download --output "${outputPath}" "${url}"`;
    console.log("Running yt-dlp command:", command);

    await execAsync(command);

    // Check if VTT file was created
    const vttFiles = await fs.promises.readdir(tempDir);
    const vttFile = vttFiles.find(
      (file) => file.startsWith("transcript_") && file.endsWith(".en.vtt")
    );

    if (!vttFile) {
      throw new Error("No VTT file generated");
    }

    const vttPath = path.join(tempDir, vttFile);
    const vttContent = await fs.promises.readFile(vttPath, "utf-8");

    // Parse VTT format
    const segments = parseVTTCaptions(vttContent);

    // Server-side de-duplication
    const caps: Cap[] = segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    }));
    const deduped = dedupeCaptions(caps).map((c) => ({
      start: c.start,
      end: c.end,
      text: c.text,
    }));

    // Clean up
    await fs.promises.unlink(vttPath).catch(() => {});

    return deduped;
  } catch (error) {
    // Clean up on error
    await fs.promises.unlink(outputPath).catch(() => {});
    throw error;
  }
}

function parseVTTCaptions(vttContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const lines = vttContent.split("\n");

  let currentSegment: Partial<TranscriptSegment> = {};

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
      // This is text content - clean it
      const cleanedLine = cleanTranscriptText(line);
      if (currentSegment.text) {
        currentSegment.text += " " + cleanedLine;
      } else {
        currentSegment.text = cleanedLine;
      }
    } else if (line === "" && currentSegment.text) {
      // End of segment
      segments.push(currentSegment as TranscriptSegment);
      currentSegment = {};
    }
  }

  // Add last segment if exists
  if (currentSegment.text) {
    segments.push(currentSegment as TranscriptSegment);
  }

  return segments;
}

function parseVTTTime(timeStr: string): number {
  const [time, ms] = timeStr.split(".");
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

function cleanTranscriptText(text: string): string {
  // Remove raw XML-like tags: <00:00:51.399><c> ... </c>
  let cleaned = text
    .replace(/<[^>]*>/g, "") // Remove all XML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Remove any remaining timestamp patterns
  cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, "");

  return cleaned;
}

// Enhanced text cleaning with GPT post-processing
async function postProcessTranscriptWithGPT(text: string): Promise<string> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn("OpenAI API key not available, skipping post-processing");
      return text;
    }

    const openai = new (await import("openai")).default({
      apiKey: openaiApiKey,
    });

    const prompt = `Fix the spacing and punctuation in this transcript text. Make it readable and properly formatted:

"${text}"

Return only the corrected text with proper spacing and punctuation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a text formatting expert. Fix spacing and punctuation in transcript text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    return response ? response.trim() : text;
  } catch (error) {
    console.warn("GPT post-processing failed:", error);
    return text;
  }
}

// Convert transcript segments to bilingual format
function convertToBilingualFormat(
  segments: TranscriptSegment[]
): BilingualTranscriptSegment[] {
  return segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    en: segment.text,
    ko: "", // Korean translation will be added by AI later
  }));
}

async function fetchTranscriptWithWhisper(
  url: string
): Promise<TranscriptSegment[]> {
  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `audio_${Date.now()}.wav`);

  try {
    // Step 1: Extract audio with yt-dlp
    console.log("🎵 Extracting audio with yt-dlp...");
    const ytdlpCommand = `yt-dlp -x --audio-format wav --output "${audioPath}" "${url}"`;
    await execAsync(ytdlpCommand);

    // Step 2: Get audio duration and split into chunks
    console.log("📏 Getting audio duration...");
    const ffprobeCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`;
    const durationOutput = await execAsync(ffprobeCommand);
    const totalDuration = parseFloat(durationOutput.stdout.trim());

    console.log(`🎵 Audio duration: ${totalDuration} seconds`);

    // Step 3: Split audio into 60-second chunks for faster processing
    const chunkDuration = 60; // 60 seconds per chunk for faster processing
    const chunks = Math.ceil(totalDuration / chunkDuration);
    console.log(`📦 Splitting into ${chunks} chunks of ${chunkDuration}s each`);

    const allSegments: TranscriptSegment[] = [];

    for (let i = 0; i < chunks; i++) {
      const startTime = i * chunkDuration;
      const endTime = Math.min((i + 1) * chunkDuration, totalDuration);

      console.log(
        `🎤 Processing chunk ${i + 1}/${chunks} (${startTime}s - ${endTime}s)`
      );

      // Extract chunk
      const chunkPath = path.join(tempDir, `chunk_${i}_${Date.now()}.wav`);
      const ffmpegCommand = `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${chunkDuration} -c copy "${chunkPath}"`;
      await execAsync(ffmpegCommand);

      try {
        // Transcribe chunk with Whisper
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new Error("OpenAI API key not configured");
        }

        const audioBuffer = await fs.promises.readFile(chunkPath);
        const formData = new FormData();
        formData.append(
          "file",
          new Blob([new Uint8Array(audioBuffer)]),
          "audio.wav"
        );
        formData.append("model", "whisper-1");
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities[]", "segment");

        const whisperResponse = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: formData,
          }
        );

        if (!whisperResponse.ok) {
          throw new Error(`Whisper API error: ${whisperResponse.status}`);
        }

        const whisperData = await whisperResponse.json();

        // Convert Whisper segments to our format and adjust timestamps
        const chunkSegments: TranscriptSegment[] = whisperData.segments.map(
          (segment: any) => ({
            start: segment.start + startTime, // Adjust timestamp
            end: segment.end + startTime, // Adjust timestamp
            text: segment.text.trim(),
          })
        );

        allSegments.push(...chunkSegments);
        console.log(
          `✅ Chunk ${i + 1} processed: ${chunkSegments.length} segments`
        );

        // Clean up chunk file
        await fs.promises.unlink(chunkPath).catch(() => {});
      } catch (chunkError) {
        console.warn(`⚠️ Chunk ${i + 1} failed:`, chunkError);
        // Continue with next chunk
      }
    }

    // Step 4: Post-process with GPT for better formatting
    console.log("🧹 Post-processing transcript with GPT...");
    const fullText = allSegments.map((segment) => segment.text).join(" ");
    const processedText = await postProcessTranscriptWithGPT(fullText);

    // Split processed text back into segments (simple approach)
    const processedSegments = processedText
      .split(/[.!?]+/)
      .filter((s) => s.trim());
    const finalSegments: TranscriptSegment[] = [];

    let currentTime = 0;
    for (const text of processedSegments) {
      if (text.trim()) {
        const duration = Math.max(2, text.trim().length * 0.1); // Estimate duration
        finalSegments.push({
          start: currentTime,
          end: currentTime + duration,
          text: text.trim(),
        });
        currentTime += duration;
      }
    }

    // Clean up
    await fs.promises.unlink(audioPath).catch(() => {});

    console.log(
      `✅ Whisper transcription complete: ${finalSegments.length} segments`
    );
    // Server-side de-duplication
    const caps: Cap[] = finalSegments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    }));
    const deduped = dedupeCaptions(caps).map((c) => ({
      start: c.start,
      end: c.end,
      text: c.text,
    }));
    return deduped;
  } catch (error) {
    // Clean up on error
    await fs.promises.unlink(audioPath).catch(() => {});
    throw error;
  }
}

function generateContentBasedTranscript(videoInfo: any): TranscriptSegment[] {
  const title = videoInfo.title || "YouTube Video";
  const description = videoInfo.description || "";
  const channelTitle = videoInfo.channelTitle || "Unknown Channel";

  // 비디오 제목과 설명을 기반으로 학습 콘텐츠 생성
  const segments: TranscriptSegment[] = [];

  // 제목 기반 세그먼트
  segments.push({
    start: 0.0,
    end: 3.0,
    text: `Welcome to ${channelTitle}'s video: ${title}`,
  });

  // 설명에서 문장들을 추출하여 세그먼트로 변환
  const sentences = description
    .split(/[.!?]+/)
    .filter((sentence: string) => sentence.trim().length > 10)
    .slice(0, 6); // 최대 6개 문장

  let currentTime = 3.0;
  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence) {
      segments.push({
        start: currentTime,
        end: currentTime + 4.0,
        text: trimmedSentence,
      });
      currentTime += 4.5;
    }
  });

  // 마지막 세그먼트
  segments.push({
    start: currentTime,
    end: currentTime + 3.0,
    text: "Thank you for watching this video. I hope you learned something new today.",
  });

  return segments;
}

function generateMockTranscript(): TranscriptSegment[] {
  return [
    {
      start: 0.0,
      end: 4.5,
      text: "Hello everyone, welcome to today's lesson.",
    },
    {
      start: 4.6,
      end: 8.2,
      text: "Today we will discuss important market trends.",
    },
    {
      start: 8.3,
      end: 12.1,
      text: "Let's start with the basic concepts.",
    },
    {
      start: 12.2,
      end: 16.8,
      text: "This information will be very useful for your learning.",
    },
    {
      start: 16.9,
      end: 20.5,
      text: "Please pay attention to the key points.",
    },
    {
      start: 20.6,
      end: 24.3,
      text: "We will cover several important topics today.",
    },
    {
      start: 24.4,
      end: 28.7,
      text: "Make sure to take notes during the presentation.",
    },
    {
      start: 28.8,
      end: 32.1,
      text: "Thank you for watching and learning with us.",
    },
  ];
}
