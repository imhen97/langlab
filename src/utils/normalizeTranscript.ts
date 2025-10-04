/**
 * Transcript normalization utility for YouTube captions and Whisper output
 * Handles timestamp conversion, text cleaning, and segment merging
 */

export interface RawTranscriptSegment {
  start: number | string;
  end: number | string;
  text: string;
  en?: string;
  ko?: string;
}

export interface NormalizedTranscriptSegment {
  start: number;
  end: number;
  en: string;
  ko: string; // Always present, empty string if no translation
}

export interface ChunkData {
  segments: RawTranscriptSegment[];
  chunkOffset: number; // Offset in seconds for this chunk
}

/**
 * Convert timestamp to seconds
 * Handles various formats: number, "HH:MM:SS.mmm", "MM:SS.mmm", etc.
 */
function timestampToSeconds(timestamp: number | string): number {
  if (typeof timestamp === "number") {
    return timestamp;
  }

  const str = timestamp.toString().trim();

  // Handle HH:MM:SS.mmm format
  const timeMatch = str.match(/(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1] || "0");
    const minutes = parseInt(timeMatch[2] || "0");
    const seconds = parseInt(timeMatch[3] || "0");
    const milliseconds = parseInt(
      (timeMatch[4] || "0").padEnd(3, "0").slice(0, 3)
    );

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  // Try to parse as float
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Clean transcript text by removing tags and normalizing whitespace
 */
function cleanTranscriptText(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove XML-like tags: <c>, </c>, <00:00:51.399>, etc.
      .replace(/<[^>]*>/g, "")
      // Remove timestamp patterns that might remain
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Check if two segments should be merged
 */
function shouldMergeSegments(
  segment1: NormalizedTranscriptSegment,
  segment2: NormalizedTranscriptSegment,
  maxGap: number = 0.25
): boolean {
  // Check time gap
  const gap = segment2.start - segment1.end;
  if (gap <= maxGap) {
    return true;
  }

  // Check if text is identical (after cleaning)
  const text1 = segment1.en.toLowerCase().trim();
  const text2 = segment2.en.toLowerCase().trim();
  if (text1 === text2 && text1.length > 0) {
    return true;
  }

  return false;
}

/**
 * Merge two segments into one
 */
function mergeSegments(
  segment1: NormalizedTranscriptSegment,
  segment2: NormalizedTranscriptSegment
): NormalizedTranscriptSegment {
  return {
    start: Math.min(segment1.start, segment2.start),
    end: Math.max(segment1.end, segment2.end),
    en:
      segment1.en === segment2.en
        ? segment1.en
        : `${segment1.en} ${segment2.en}`.trim(),
    ko:
      segment1.ko && segment2.ko
        ? segment1.ko === segment2.ko
          ? segment1.ko
          : `${segment1.ko} ${segment2.ko}`.trim()
        : segment1.ko || segment2.ko || "",
  };
}

/**
 * Align English and Korean segments by start time
 * Ensures both EN and KO are present throughout the video
 */
function alignEnglishKoreanSegments(
  englishSegments: NormalizedTranscriptSegment[],
  koreanSegments: NormalizedTranscriptSegment[] = []
): NormalizedTranscriptSegment[] {
  if (koreanSegments.length === 0) {
    // No Korean segments, return English with empty Korean
    return englishSegments.map((segment) => ({
      ...segment,
      ko: "",
    }));
  }

  console.log(
    `🔗 Aligning ${englishSegments.length} EN segments with ${koreanSegments.length} KO segments`
  );

  const alignedSegments: NormalizedTranscriptSegment[] = [];
  let koIndex = 0;

  for (const enSegment of englishSegments) {
    let bestMatch = "";
    let matchFound = false;

    // Find Korean segment with closest start time (within 0.5s)
    for (let i = koIndex; i < koreanSegments.length; i++) {
      const koSegment = koreanSegments[i];
      const timeDiff = Math.abs(enSegment.start - koSegment.start);

      if (timeDiff <= 0.5) {
        bestMatch = koSegment.ko || koSegment.en || "";
        koIndex = i + 1; // Move forward for next alignment
        matchFound = true;
        break;
      }

      // If we've passed the English segment's time, stop looking
      if (koSegment.start > enSegment.start + 0.5) {
        break;
      }
    }

    alignedSegments.push({
      start: enSegment.start,
      end: enSegment.end,
      en: enSegment.en,
      ko: bestMatch,
    });

    if (matchFound && alignedSegments.length <= 5) {
      console.log(
        `🔗 Aligned segment ${
          alignedSegments.length
        }: EN="${enSegment.en.substring(0, 30)}..." KO="${bestMatch.substring(
          0,
          30
        )}..."`
      );
    }
  }

  console.log(
    `✅ Aligned ${alignedSegments.length} segments, ${
      alignedSegments.filter((s) => s.ko).length
    } with Korean`
  );
  return alignedSegments;
}

/**
 * Normalize raw transcript segments
 */
export function normalizeTranscriptSegments(
  rawSegments: RawTranscriptSegment[],
  chunkOffset: number = 0
): NormalizedTranscriptSegment[] {
  if (!rawSegments || rawSegments.length === 0) {
    console.warn("⚠️ No segments to normalize");
    return [];
  }

  console.log(
    `🔄 Normalizing ${rawSegments.length} transcript segments (offset: ${chunkOffset}s)`
  );
  console.log("🔍 First few raw segments:", rawSegments.slice(0, 3));

  // Step 1: Convert and clean segments
  const cleanedSegments: NormalizedTranscriptSegment[] = rawSegments
    .map((segment, index) => {
      try {
        // Always apply chunkOffset for proper time alignment
        let start = timestampToSeconds(segment.start);
        let end = timestampToSeconds(segment.end);

        // Apply chunk offset (crucial for Whisper chunks)
        start += chunkOffset;
        end += chunkOffset;

        // Use 'en' field if available, otherwise use 'text'
        const englishText = cleanTranscriptText(segment.en || segment.text);

        // Skip empty segments
        if (!englishText) {
          console.warn(`⚠️ Empty text in segment ${index}:`, segment);
          return null;
        }

        // Ensure valid time bounds
        start = Math.max(0, start);
        end = Math.max(start + 0.1, end); // Minimum 0.1s duration

        const cleanedSegment = {
          start: parseFloat(start.toFixed(3)), // Ensure float precision
          end: parseFloat(end.toFixed(3)),
          en: englishText,
          ko: segment.ko ? cleanTranscriptText(segment.ko) : "", // Always include ko field
        };

        // Log first few segments for debugging
        if (index < 3) {
          console.log(`📝 Cleaned segment ${index}:`, cleanedSegment);
        }

        return cleanedSegment;
      } catch (error) {
        console.error(`❌ Error processing segment ${index}:`, error, segment);
        return null;
      }
    })
    .filter(
      (segment): segment is NormalizedTranscriptSegment => segment !== null
    );

  console.log(`🔄 After cleaning: ${cleanedSegments.length} valid segments`);

  // Step 2: Sort by start time
  cleanedSegments.sort((a, b) => a.start - b.start);

  // Step 3: Merge overlapping or very close segments
  const mergedSegments: NormalizedTranscriptSegment[] = [];
  let mergeCount = 0;

  for (const segment of cleanedSegments) {
    if (mergedSegments.length === 0) {
      mergedSegments.push(segment);
      continue;
    }

    const lastSegment = mergedSegments[mergedSegments.length - 1];

    if (shouldMergeSegments(lastSegment, segment)) {
      // Merge with previous segment
      const merged = mergeSegments(lastSegment, segment);
      mergedSegments[mergedSegments.length - 1] = merged;
      mergeCount++;

      if (mergeCount <= 3) {
        console.log(`🔄 Merged segment:`, {
          original1: lastSegment,
          original2: segment,
          merged: merged,
        });
      }
    } else {
      // Add as new segment
      mergedSegments.push(segment);
    }
  }

  console.log(
    `✅ Normalization complete: ${rawSegments.length} → ${cleanedSegments.length} → ${mergedSegments.length} segments (${mergeCount} merges)`
  );
  console.log("🔍 First few final segments:", mergedSegments.slice(0, 3));

  return mergedSegments;
}

/**
 * Normalize transcript from multiple chunks (for Whisper processing)
 */
export function normalizeTranscriptFromChunks(
  chunks: ChunkData[]
): NormalizedTranscriptSegment[] {
  const allSegments: NormalizedTranscriptSegment[] = [];

  // Process each chunk with its offset
  for (const chunk of chunks) {
    const normalizedChunk = normalizeTranscriptSegments(
      chunk.segments,
      chunk.chunkOffset
    );
    allSegments.push(...normalizedChunk);
  }

  // Sort all segments by start time and merge if necessary
  allSegments.sort((a, b) => a.start - b.start);

  // Final merge pass across all chunks
  const finalSegments: NormalizedTranscriptSegment[] = [];

  for (const segment of allSegments) {
    if (finalSegments.length === 0) {
      finalSegments.push(segment);
      continue;
    }

    const lastSegment = finalSegments[finalSegments.length - 1];

    if (shouldMergeSegments(lastSegment, segment)) {
      finalSegments[finalSegments.length - 1] = mergeSegments(
        lastSegment,
        segment
      );
    } else {
      finalSegments.push(segment);
    }
  }

  return finalSegments;
}

/**
 * Helper function to validate transcript segments
 */
export function validateTranscriptSegments(
  segments: NormalizedTranscriptSegment[]
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Check basic validity
    if (segment.start < 0) {
      errors.push(`Segment ${i}: negative start time (${segment.start})`);
    }

    if (segment.end <= segment.start) {
      errors.push(
        `Segment ${i}: end time (${segment.end}) <= start time (${segment.start})`
      );
    }

    if (!segment.en || segment.en.trim().length === 0) {
      errors.push(`Segment ${i}: empty English text`);
    }

    // Check ordering (should be sorted by start time)
    if (i > 0 && segment.start < segments[i - 1].start) {
      errors.push(`Segment ${i}: not sorted by start time`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Debug utility to log segment information
 */
export function debugTranscriptSegments(
  segments: NormalizedTranscriptSegment[],
  title: string = "Transcript Segments"
): void {
  console.group(`🎬 ${title}`);
  console.log(`Total segments: ${segments.length}`);

  if (segments.length > 0) {
    console.log(
      `Duration: ${segments[0].start}s - ${segments[segments.length - 1].end}s`
    );
    console.log("First 3 segments:");
    segments.slice(0, 3).forEach((segment, index) => {
      console.log(
        `  ${index + 1}. [${segment.start.toFixed(2)}s - ${segment.end.toFixed(
          2
        )}s] "${segment.en.slice(0, 50)}${segment.en.length > 50 ? "..." : ""}"`
      );
    });
  }

  const validation = validateTranscriptSegments(segments);
  if (!validation.isValid) {
    console.warn("Validation errors:", validation.errors);
  }

  console.groupEnd();
}
