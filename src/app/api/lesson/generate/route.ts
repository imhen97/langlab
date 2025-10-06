import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import {
  fetchCaptions,
  cleanTranscript,
  postProcessTranscriptWithLLM,
} from "@/lib/captions";
import getServerSession from "next-auth";
import { authOptions } from "@/lib/auth";

// Types for enhanced vocabulary and phrase extraction
interface VocabularyItem {
  word: string;
  meaning: string;
  cefr: string;
  pos: string; // part of speech
  examples: string[];
}

interface PhraseItem {
  phrase: string;
  meaning: string;
  type: string; // collocation, idiom, pattern
  example: string;
}

interface LessonSection {
  start: number;
  end: number;
  vocabulary: VocabularyItem[];
  phrases: PhraseItem[];
}

interface EnhancedLessonContent {
  sections: LessonSection[];
  estimatedStudyTime: string;
  totalVocabulary: number;
  totalPhrases: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic lesson creation without OpenAI
async function createBasicLesson({
  videoId,
  title,
  level,
  purpose,
  session,
}: {
  videoId: string;
  title: string;
  level: string;
  purpose: string;
  session: any;
}) {
  console.log("📝 Creating basic lesson without AI processing...");

  // Create source first
  const source = await prisma.source.create({
    data: {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      type: "YOUTUBE",
      title: title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 300, // 5 minutes default
    },
  });

  // Create lesson in database
  const lesson = await prisma.lesson.create({
    data: {
      sourceId: source.id,
      userId: session.user.id,
      level: level as any,
      purpose: purpose as any,
      title,
      description: `Basic lesson created from YouTube video ${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 300, // 5 minutes default
      // Basic lesson data according to Prisma schema
      summary: {
        kr: "유튜브 비디오로부터 생성된 기본 영어 레슨입니다.",
        en: "This is a basic English lesson created from a YouTube video."
      },
      vocab: [
        {
          word: "lesson",
          meaning: "수업, 레슨",
          cefr: "A2",
          examples: [
            "This is a great lesson.",
            "I learned a lot from this lesson.",
          ],
        },
        {
          word: "practice",
          meaning: "연습하다",
          cefr: "A2",
          examples: ["Practice makes perfect.", "I need to practice more."],
        },
      ],
      patterns: [
        {
          phrase: "Let's learn together",
          meaning: "함께 배워봅시다",
          type: "collocation",
          example: "Let's learn together and improve our English.",
        },
      ],
      script: [
        {
          start: 0,
          end: 5,
          text: "Welcome to this English lesson. Let's learn together!",
        },
        {
          start: 5,
          end: 10,
          text: "This is a basic lesson created from a YouTube video.",
        },
        {
          start: 10,
          end: 15,
          text: "You can practice your English listening skills here.",
        },
      ],
      quizzes: [
        {
          question: "What does 'lesson' mean?",
          options: ["수업", "책", "학교", "학생"],
          correct: 0,
          explanation: "'Lesson' means '수업' in Korean.",
        },
      ],
      speaking: [],
    },
  });

  console.log("✅ Basic lesson created:", lesson.id);
  return lesson;
}

// Stopwords to exclude from vocabulary
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "its",
  "our",
  "their",
]);

/**
 * Split transcript into sections for long videos (>15 minutes)
 */
function splitTranscriptIntoSections(
  transcript: any[],
  videoDurationMinutes: number
): Array<{ start: number; end: number; segments: any[] }> {
  if (videoDurationMinutes <= 15) {
    return [
      {
        start: 0,
        end: videoDurationMinutes * 60,
        segments: transcript,
      },
    ];
  }

  const sections = [];
  const sectionDuration = 5 * 60; // 5 minutes in seconds

  for (
    let startTime = 0;
    startTime < videoDurationMinutes * 60;
    startTime += sectionDuration
  ) {
    const endTime = Math.min(
      startTime + sectionDuration,
      videoDurationMinutes * 60
    );

    const sectionSegments = transcript.filter((segment) => {
      const segmentStart =
        typeof segment.start === "number"
          ? segment.start
          : parseFloat(segment.start);
      return segmentStart >= startTime && segmentStart < endTime;
    });

    if (sectionSegments.length > 0) {
      sections.push({
        start: startTime,
        end: endTime,
        segments: sectionSegments,
      });
    }
  }

  return sections;
}

/**
 * Calculate estimated study time
 */
function calculateStudyTime(
  totalVocab: number,
  totalPhrases: number,
  videoDurationMinutes: number
): string {
  const vocabTime = totalVocab * 25; // 25 seconds per word
  const phraseTime = totalPhrases * 120; // 2 minutes per phrase
  const videoTime = videoDurationMinutes * 60; // full video length

  const totalSeconds = vocabTime + phraseTime + videoTime;
  const totalMinutes = Math.ceil(totalSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else {
    return `${minutes}분`;
  }
}

/**
 * Deduplicate vocabulary words
 */
function deduplicateVocabulary(words: VocabularyItem[]): VocabularyItem[] {
  const seen = new Set<string>();
  const baseWords = new Map<string, VocabularyItem>();

  return words.filter((item) => {
    const word = item.word.toLowerCase().trim();

    // Skip stopwords
    if (STOPWORDS.has(word)) {
      return false;
    }

    // Skip exact duplicates
    if (seen.has(word)) {
      return false;
    }

    // Handle inflections (basic approach)
    const baseWord = getBaseForm(word);
    if (baseWords.has(baseWord)) {
      // Keep the shorter/simpler form
      const existing = baseWords.get(baseWord)!;
      if (word.length < existing.word.length) {
        baseWords.set(baseWord, item);
        seen.delete(existing.word.toLowerCase());
        seen.add(word);
        return true;
      }
      return false;
    }

    baseWords.set(baseWord, item);
    seen.add(word);
    return true;
  });
}

/**
 * Simple base form extraction (basic stemming)
 */
function getBaseForm(word: string): string {
  word = word.toLowerCase();

  // Remove common suffixes
  if (word.endsWith("ing") && word.length > 6) {
    return word.slice(0, -3);
  }
  if (word.endsWith("ed") && word.length > 5) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && word.length > 3 && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  if (word.endsWith("ly") && word.length > 4) {
    return word.slice(0, -2);
  }

  return word;
}

/**
 * Deduplicate phrases
 */
function deduplicatePhrases(phrases: PhraseItem[]): PhraseItem[] {
  const seen = new Set<string>();
  const patterns = new Set<string>();

  return phrases.filter((item) => {
    const phrase = item.phrase.toLowerCase().trim();

    // Skip exact duplicates
    if (seen.has(phrase)) {
      return false;
    }

    // Skip similar sentence patterns
    const pattern = extractPattern(phrase);
    if (patterns.has(pattern)) {
      return false;
    }

    seen.add(phrase);
    patterns.add(pattern);
    return true;
  });
}

/**
 * Extract sentence pattern for duplicate detection
 */
function extractPattern(sentence: string): string {
  // Simple pattern extraction - replace content words with placeholders
  return sentence
    .toLowerCase()
    .replace(/\b(i|you|he|she|it|we|they)\b/g, "PRONOUN")
    .replace(/\b\w+ing\b/g, "VERB_ING")
    .replace(/\b\w+ed\b/g, "VERB_ED")
    .replace(/\b\w{4,}\b/g, "WORD")
    .trim();
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration (PT4M13S) to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Generate enhanced vocabulary and phrases with section-based extraction
 */
async function generateEnhancedContent(
  transcript: any[],
  videoDurationMinutes: number,
  level: string,
  quickMode: boolean = false
): Promise<EnhancedLessonContent> {
  console.log(
    `🎯 Generating enhanced content for ${videoDurationMinutes}min video (${
      quickMode ? "Quick" : "Full"
    } mode)`
  );

  // Split transcript into sections
  const sections = splitTranscriptIntoSections(
    transcript,
    videoDurationMinutes
  );
  console.log(`📑 Split into ${sections.length} sections`);

  const processedSections: LessonSection[] = [];
  let totalVocabulary = 0;
  let totalPhrases = 0;

  // Limit processing to first 3 sections for speed (max 15 minutes)
  const sectionsToProcess = sections.slice(0, 3);
  console.log(
    `⚡ Processing ${sectionsToProcess.length}/${sections.length} sections for speed`
  );

  for (let i = 0; i < sectionsToProcess.length; i++) {
    const section = sectionsToProcess[i];
    const sectionDurationMinutes = (section.end - section.start) / 60;

    // Calculate target counts with speed optimization
    const baseVocabCount = Math.min(Math.ceil(sectionDurationMinutes * 3), 15); // Reduced from 5 to 3 words/min, max 15
    const basePhraseCount = Math.min(
      Math.ceil(sectionDurationMinutes * 0.8),
      5
    ); // Reduced to 0.8 phrases/min, max 5

    // Adjust for quick mode
    const finalVocabCount = quickMode
      ? Math.ceil(baseVocabCount * 0.6) // Further reduction in quick mode
      : baseVocabCount;

    console.log(
      `📝 Section ${i + 1}: ${sectionDurationMinutes.toFixed(
        1
      )}min → ${finalVocabCount} vocab, ${basePhraseCount} phrases`
    );

    // Generate content for this section with more aggressive text limiting
    const sectionText = section.segments
      .map((s) => s.en || s.text || "")
      .join(" ")
      .substring(0, 1200); // Reduced from 2000 to 1200 for faster processing

    if (sectionText.length < 50) {
      console.log(`⚠️ Section ${i + 1} too short, skipping`);
      continue;
    }

    try {
      const sectionContent = await generateSectionContent(
        sectionText,
        finalVocabCount,
        basePhraseCount,
        level,
        i + 1
      );

      processedSections.push({
        start: section.start,
        end: section.end,
        vocabulary: sectionContent.vocabulary,
        phrases: sectionContent.phrases,
      });

      totalVocabulary += sectionContent.vocabulary.length;
      totalPhrases += sectionContent.phrases.length;
    } catch (error) {
      console.error(`❌ Error processing section ${i + 1}:`, error);
      // Add empty section to maintain structure
      processedSections.push({
        start: section.start,
        end: section.end,
        vocabulary: [],
        phrases: [],
      });
    }
  }

  // Calculate study time
  const estimatedStudyTime = calculateStudyTime(
    totalVocabulary,
    totalPhrases,
    videoDurationMinutes
  );

  console.log(
    `✅ Generated ${totalVocabulary} vocab words and ${totalPhrases} phrases. Study time: ${estimatedStudyTime}`
  );

  return {
    sections: processedSections,
    estimatedStudyTime,
    totalVocabulary,
    totalPhrases,
  };
}

/**
 * Generate content for a single section
 */
async function generateSectionContent(
  sectionText: string,
  vocabCount: number,
  phraseCount: number,
  level: string,
  sectionNumber: number
): Promise<{ vocabulary: VocabularyItem[]; phrases: PhraseItem[] }> {
  const prompt = `Analyze this English transcript section and extract vocabulary and key phrases for ${level} level students.

TRANSCRIPT SECTION ${sectionNumber}:
"${sectionText}"

TASK 1 - VOCABULARY EXTRACTION:
Extract exactly ${vocabCount} useful vocabulary words that are:
- CEFR level A2-C1 (appropriate for ${level} students)
- NOT basic words like "the, and, is, have, go, get"
- Contextually relevant to the content
- Educational value for English learners

TASK 2 - KEY PHRASE EXTRACTION:
Extract exactly ${phraseCount} useful phrases that are:
- Collocations, idioms, or reusable sentence patterns
- Contextually meaningful in the transcript
- Useful for English conversation/writing
- Not just random sentence fragments

OUTPUT FORMAT (JSON only):
{
  "vocabulary": [
    {
      "word": "example",
      "meaning": "Korean explanation",
      "cefr": "B1",
      "pos": "noun",
      "examples": ["Example sentence 1", "Example sentence 2"]
    }
  ],
  "phrases": [
    {
      "phrase": "meaningful phrase",
      "meaning": "Korean explanation",
      "type": "collocation",
      "example": "Usage example"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800, // Reduced from 1500 for faster response
    temperature: 0.2, // Lower temperature for more focused output
  });

  let content = response.choices[0]?.message?.content || "";

  // Clean markdown formatting
  content = content
    .replace(/```json\n?/, "")
    .replace(/```\n?$/, "")
    .trim();

  try {
    const parsed = JSON.parse(content);

    // Deduplicate and validate
    const vocabulary = deduplicateVocabulary(parsed.vocabulary || []);
    const phrases = deduplicatePhrases(parsed.phrases || []);

    console.log(
      `📊 Section ${sectionNumber}: ${vocabulary.length}/${vocabCount} vocab, ${phrases.length}/${phraseCount} phrases extracted`
    );

    return { vocabulary, phrases };
  } catch (error) {
    console.error(
      `❌ Failed to parse section ${sectionNumber} content:`,
      error
    );
    console.error("Raw content:", content);
    return { vocabulary: [], phrases: [] };
  }
}

async function generateKoreanTranslations(transcript: any[]): Promise<any[]> {
  if (!transcript || transcript.length === 0) return transcript;

  try {
    // Process all segments in the batch
    const batchSize = 5; // Smaller batches for faster processing
    const batches = [];
    for (let i = 0; i < transcript.length; i += batchSize) {
      batches.push(transcript.slice(i, i + batchSize));
    }

    const translatedTranscript = [];

    for (const batch of batches) {
      const englishTexts = batch
        .map((segment) => segment.en || segment.text || "")
        .join("\n");

      const prompt = `Translate the following English sentences to Korean. Return only the Korean translations, one per line, in the same order:

${englishTexts}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator. Translate English to Korean accurately and naturally.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000, // Increased token limit for better translations
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        // If translation fails, add original segments
        translatedTranscript.push(...batch);
        continue;
      }

      const koreanTranslations = response.trim().split("\n");

      // Update transcript with Korean translations
      batch.forEach((segment, index) => {
        if (koreanTranslations[index]) {
          translatedTranscript.push({
            ...segment,
            ko: koreanTranslations[index].trim(),
          });
        } else {
          translatedTranscript.push(segment);
        }
      });
    }

    return translatedTranscript;
  } catch (error) {
    console.error("Korean translation error:", error);
    return transcript;
  }
}

async function generateAIContent(
  videoInfo: any,
  level: string,
  purpose: string,
  transcript: any[] = []
) {
  const transcriptText =
    transcript.length > 0
      ? transcript
          .map((segment) => segment.en || segment.text || "")
          .join(" ")
          .slice(0, 1000) // Further limit transcript text for faster AI processing
      : "No transcript available";

  const prompt = `
Create learning materials for a YouTube video.

Video: ${videoInfo.title}
Level: ${level}
Purpose: ${purpose}
Transcript: ${transcriptText}

Generate JSON with:
1. Summary (kr/en)
2. Vocabulary (3-5 words)
3. Patterns (2-3 expressions)
4. Quizzes (2-3 questions)
5. Speaking (2-3 prompts)

Return ONLY JSON:
{
  "summary": {"kr": "Korean summary", "en": "English summary"},
  "vocab": [{"word": "word", "meaning": "meaning", "examples": ["ex1"]}],
  "patterns": [{"pattern": "expression", "explanation": "explanation", "example": "example", "tip": "tip"}],
  "quizzes": [{"type": "mcq", "question": "question", "options": ["A", "B", "C", "D"], "correct": 0}],
  "speaking": [{"type": "warm-up", "prompt": "English prompt", "kr": "Korean prompt"}]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert English language learning AI. Generate comprehensive learning materials in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000, // Reduced for faster generation
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response - handle markdown formatting
    let jsonResponse = response;

    // Remove markdown code blocks if present
    if (jsonResponse.includes("```json")) {
      jsonResponse = jsonResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    }
    if (jsonResponse.includes("```")) {
      jsonResponse = jsonResponse.replace(/```\n?/g, "");
    }

    // Clean up any remaining markdown artifacts
    jsonResponse = jsonResponse.trim();

    const aiContent = JSON.parse(jsonResponse);
    return aiContent;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    console.log("🚀 Starting lesson generation API...");

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { url, level, purpose } = await req.json();
    console.log("📝 Request body:", { url, level, purpose });

    if (!url) {
      console.error("❌ Missing URL in request");
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    console.log("🎬 Lesson generation request:", { url, level, purpose });

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    console.log("📹 Extracted video ID:", videoId);

    // Fetch YouTube video information
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    console.log("🔑 YouTube API key available:", !!youtubeApiKey);

    if (!youtubeApiKey) {
      console.warn("⚠️ YouTube API key not configured, using basic video info");
      // Continue with basic video info
      const basicVideoInfo = {
        title: `YouTube Video ${videoId}`,
        description: "Video description not available",
        duration: "PT5M30S",
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };

      // Create basic lesson without YouTube API
      const basicLesson = await createBasicLesson({
        videoId,
        title: basicVideoInfo.title,
        level: level || "B1",
        purpose: purpose || "CONVO",
        session,
      });

      return NextResponse.json({
        success: true,
        lessonId: basicLesson.id,
        message: "Basic lesson created successfully",
      });
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${youtubeApiKey}`;
    console.log("🔍 Fetching YouTube video info...");

    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.warn(
        `⚠️ YouTube API error: ${response.status} ${response.statusText}`
      );
      // Continue with basic video info even if API fails
      const videoInfo = {
        title: "YouTube Video",
        description: "Video description not available",
        thumbnail: null,
        duration: 0,
        channelTitle: "Unknown Channel",
        publishedAt: new Date().toISOString(),
      };

      // Create or get dummy user
      let user = await prisma.user.findUnique({
        where: { id: "dummy-user-id" },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: "dummy-user-id",
            email: "dummy@example.com",
            name: "Dummy User",
          },
        });
        console.log("👤 Dummy user created:", user.id);
      }

      // Create source record
      const source = await prisma.source.create({
        data: {
          url,
          type: "YOUTUBE",
          title: videoInfo.title,
          duration: videoInfo.duration,
          thumbnail: videoInfo.thumbnail,
        },
      });

      console.log("📝 Source created:", source.id);

      // Create lesson record with basic info
      const lesson = await prisma.lesson.create({
        data: {
          sourceId: source.id,
          userId: user.id,
          level: level || "B1",
          purpose: purpose || "CONVO",
          title: videoInfo.title,
          description: videoInfo.description,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration,
          summary: {
            kr: "YouTube 영상에서 추출된 요약이 여기에 표시됩니다.",
            en: "Summary extracted from YouTube video will be displayed here.",
          },
          vocab: [],
          patterns: [],
          script: [],
          quizzes: [],
          speaking: [],
        },
      });

      console.log("🎓 Lesson created:", lesson.id);

      return NextResponse.json({
        success: true,
        lessonId: lesson.id,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          thumbnail: lesson.thumbnail,
          duration: lesson.duration,
          summary: lesson.summary,
          vocab: lesson.vocab,
          patterns: lesson.patterns,
          script: lesson.script,
          quizzes: lesson.quizzes,
          speaking: lesson.speaking,
        },
      });
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const video = data.items[0];
    const videoInfo = {
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail:
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.default?.url,
      duration: parseDuration(video.contentDetails.duration),
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
    };

    console.log("✅ YouTube video info fetched:", {
      title: videoInfo.title,
      duration: videoInfo.duration,
      channel: videoInfo.channelTitle,
    });

    // Create or get dummy user
    console.log("👤 Checking database connection...");
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: "dummy-user-id" },
      });

      if (!user) {
        console.log("👤 Creating dummy user...");
        user = await prisma.user.create({
          data: {
            id: "dummy-user-id",
            email: "dummy@example.com",
            name: "Dummy User",
          },
        });
        console.log("👤 Dummy user created:", user.id);
      } else {
        console.log("👤 Dummy user found:", user.id);
      }
    } catch (dbError) {
      console.error("❌ Database error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Create source record
    const source = await prisma.source.create({
      data: {
        url,
        type: "YOUTUBE",
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
      },
    });

    console.log("📝 Source created:", source.id);

    // Try to extract transcript using enhanced caption extraction
    console.log("📝 Extracting transcript with enhanced caption processing...");
    let transcript: any[] = [];
    try {
      // Use the new enhanced caption extraction
      console.log("🎬 Fetching captions with enhanced processing...");
      const rawCaptions = await fetchCaptions(url, { preferLanguage: "en" });

      if (rawCaptions.length > 0) {
        console.log(
          `✅ Raw captions extracted: ${rawCaptions.length} segments`
        );

        // Clean the transcript with advanced deduplication
        console.log("🧹 Cleaning transcript with advanced deduplication...");
        const cleanedCaptions = cleanTranscript(rawCaptions, {
          removeTimestamps: true,
          removeTags: true,
          mergeSegments: true,
          deduplicate: true,
          maxSegmentLength: 300,
        });

        console.log(
          `✅ Transcript cleaned: ${rawCaptions.length} → ${cleanedCaptions.length} segments`
        );

        // Optional LLM post-processing for better formatting
        const useLLMProcessing =
          process.env.OPENAI_API_KEY && level !== "quick";
        let processedCaptions = cleanedCaptions;

        if (useLLMProcessing) {
          console.log(
            "🤖 Post-processing with LLM for natural sentence formatting..."
          );
          try {
            processedCaptions = await postProcessTranscriptWithLLM(
              cleanedCaptions,
              {
                preserveTiming: true,
                temperature: 0.2,
              }
            );
            console.log(
              `✅ LLM post-processing complete: ${processedCaptions.length} segments`
            );
          } catch (error) {
            console.warn(
              "⚠️ LLM post-processing failed, using cleaned captions:",
              error
            );
          }
        }

        // Convert to the format expected by the lesson system
        transcript = processedCaptions.map((segment) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text,
        }));

        console.log(
          `✅ Enhanced transcript processing complete: ${transcript.length} segments`
        );

        // Generate Korean translations for transcript (limit to first 10 segments for speed)
        if (transcript.length > 0) {
          console.log("🌏 Generating Korean translations...");
          try {
            // Limit to first 10 segments for much faster processing
            const limitedTranscript = transcript.slice(0, 10);
            console.log(
              `🌏 Translating ${limitedTranscript.length} segments (limited for speed)`
            );

            const translatedTranscript = await generateKoreanTranslations(
              limitedTranscript
            );

            // Add remaining segments without translation
            const remainingSegments = transcript.slice(10);
            transcript = [...translatedTranscript, ...remainingSegments];

            console.log(
              "✅ Korean translations generated for",
              translatedTranscript.length,
              "segments (out of",
              transcript.length,
              "total)"
            );
          } catch (error) {
            console.warn("⚠️ Korean translation failed:", error);
            // Continue with original transcript if translation fails
          }
        }
      } else {
        console.warn("⚠️ No captions found for this video");
      }
    } catch (error) {
      console.warn(
        "⚠️ Enhanced transcript extraction failed, trying fallback:",
        error
      );

      // Fallback to original transcript extraction method
      try {
        const host = req.headers.get("host") || "localhost:3002";
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const baseUrl = `${protocol}://${host}`;

        const transcriptResponse = await Promise.race([
          fetch(`${baseUrl}/api/transcript/extract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Transcript extraction timeout")),
              30000
            )
          ),
        ]);

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json();
          if (transcriptData.success && transcriptData.transcript) {
            transcript = transcriptData.transcript;
            console.log(
              "✅ Fallback transcript extracted:",
              transcript.length,
              "segments"
            );
          }
        }
      } catch (fallbackError) {
        console.warn(
          "⚠️ Fallback transcript extraction also failed:",
          fallbackError
        );
        // Continue with empty transcript - lesson generation should still proceed
        transcript = [];
      }
    }

    // Generate enhanced content based on video duration and transcript
    console.log("🎯 Generating enhanced vocabulary and phrases...");
    const videoDurationMinutes = videoInfo.duration
      ? videoInfo.duration / 60
      : 10; // fallback to 10 minutes
    let enhancedContent: EnhancedLessonContent | null = null;

    try {
      if (transcript.length > 0) {
        // Use Quick Mode by default for faster lesson generation
        const quickMode = true; // 50% vocabulary reduction for speed
        enhancedContent = await generateEnhancedContent(
          transcript,
          videoDurationMinutes,
          level || "B1",
          quickMode
        );
        console.log(
          `✅ Enhanced content generated: ${enhancedContent.totalVocabulary} vocab, ${enhancedContent.totalPhrases} phrases`
        );
      } else {
        console.warn(
          "⚠️ No transcript available, creating basic lesson structure"
        );
        enhancedContent = {
          sections: [],
          estimatedStudyTime: `${Math.ceil(videoDurationMinutes)}분`,
          totalVocabulary: 0,
          totalPhrases: 0,
        };
      }
    } catch (error) {
      console.error("❌ Enhanced content generation failed:", error);
      // Fallback to empty enhanced content
      enhancedContent = {
        sections: [],
        estimatedStudyTime: "정보 없음",
        totalVocabulary: 0,
        totalPhrases: 0,
      };
    }

    // Convert enhanced content to legacy format for backward compatibility
    let legacyVocab = enhancedContent.sections.flatMap((section) =>
      section.vocabulary.map((item) => ({
        word: item.word,
        meaning: item.meaning,
        examples: item.examples || [],
        cefr: item.cefr || "B1",
      }))
    );

    let legacyPatterns = enhancedContent.sections.flatMap((section) =>
      section.phrases.map((item) => ({
        pattern: item.phrase,
        explanation: item.meaning,
        example: item.example || "",
        tip: `유형: ${item.type || "phrase"}`,
      }))
    );

    // Add basic vocabulary if no content was generated
    if (legacyVocab.length === 0) {
      legacyVocab = [
        {
          word: "video",
          meaning: "비디오, 영상",
          examples: [
            "This is an educational video.",
            "Watch the video carefully.",
          ],
          cefr: "A2",
        },
        {
          word: "learn",
          meaning: "배우다, 학습하다",
          examples: [
            "We can learn from this video.",
            "Learning English is important.",
          ],
          cefr: "A2",
        },
      ];
    }

    if (legacyPatterns.length === 0) {
      legacyPatterns = [
        {
          pattern: "Let's learn about...",
          explanation: "...에 대해 배워봅시다",
          example: "Let's learn about English vocabulary.",
          tip: "유형: learning expression",
        },
      ];
    }

    // Create lesson record with YouTube video info and enhanced content
    const lesson = await prisma.lesson.create({
      data: {
        sourceId: source.id,
        userId: user.id,
        level: level || "B1",
        purpose: purpose || "CONVO",
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        summary: {
          kr: `${videoDurationMinutes.toFixed(
            0
          )}분 영상에서 추출된 학습 자료입니다. 예상 학습 시간: ${
            enhancedContent.estimatedStudyTime
          }`,
          en: `Learning materials extracted from a ${videoDurationMinutes.toFixed(
            0
          )}-minute video. Estimated study time: ${
            enhancedContent.estimatedStudyTime
          }`,
          sections: enhancedContent.sections.length,
          totalVocabulary: enhancedContent.totalVocabulary,
          totalPhrases: enhancedContent.totalPhrases,
          enhancedContent: enhancedContent as any, // Store full enhanced content
        },
        vocab: legacyVocab,
        patterns: legacyPatterns,
        script: transcript, // 실제 추출된 대본을 직접 저장
        quizzes: [],
        speaking: [],
      },
    });

    console.log("🎓 Lesson created:", lesson.id);

    // Skip old AI content generation for faster lesson creation
    console.log(
      "⚡ Enhanced content already generated, skipping old AI content for speed"
    );

    // Return lesson immediately with enhanced content
    return NextResponse.json({
      success: true,
      lessonId: lesson.id,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        thumbnail: lesson.thumbnail,
        duration: lesson.duration,
        summary: lesson.summary,
        vocab: lesson.vocab,
        patterns: lesson.patterns,
        script: lesson.script,
        quizzes: lesson.quizzes,
        speaking: lesson.speaking,
      },
    });
  } catch (err: any) {
    console.error("💥 Lesson generation failed:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
