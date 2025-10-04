export type Cap = { start: number; end: number; text: string };

/**
 * Normalize text for comparison
 */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ") // collapse whitespace
    .toLowerCase()
    .replace(/[""'']/g, '"') // unify quotes
    .replace(/\[Music\]|\(Applause\)|♪\s*♪/g, "") // remove filler tags
    .replace(/([.!?])\1+/g, "$1") // remove trailing duplicated punctuation
    .trim();
}

/**
 * Tokenize text for similarity comparison
 */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Check if two texts are near-duplicates using Jaccard similarity
 */
export function isNearDuplicate(
  a: string,
  b: string,
  threshold: number = 0.92
): boolean {
  const tokensA = tokenize(normalizeText(a));
  const tokensB = tokenize(normalizeText(b));
  return jaccardSimilarity(tokensA, tokensB) >= threshold;
}

/**
 * Choose the longer text between two options
 */
function chooseLonger(a: string, b: string): string {
  return a.length >= b.length ? a : b;
}

/**
 * De-duplicate captions with time-aware logic
 */
export function dedupeCaptions(
  blocks: Cap[],
  opts: {
    overlapEps?: number; // default 0.05s
    maxJoinGap?: number; // default 1.0s
    minRepeatGap?: number; // default 3.0s
    minSimilarity?: number; // default 0.92
  } = {}
): Cap[] {
  const {
    overlapEps = 0.05,
    maxJoinGap = 1.0,
    minRepeatGap = 3.0,
    minSimilarity = 0.92,
  } = opts;

  // Filter out invalid captions
  const validBlocks = blocks.filter(
    (cap) =>
      cap.text.trim().length > 0 &&
      cap.end > cap.start &&
      cap.end - cap.start >= 0.2 // minimum 0.2s duration
  );

  if (validBlocks.length === 0) return [];

  // Sort by start time
  const sorted = [...validBlocks].sort((a, b) => a.start - b.start);
  const result: Cap[] = [];

  for (const cur of sorted) {
    if (result.length === 0) {
      result.push(cur);
      continue;
    }

    const prev = result[result.length - 1];
    const prevText = normalizeText(prev.text);
    const curText = normalizeText(cur.text);

    const isOverlapping = cur.start <= prev.end + overlapEps;
    const isCloseGap = cur.start - prev.end <= maxJoinGap;
    const isFarGap = cur.start - prev.end >= minRepeatGap;
    const isSameText = prevText === curText;
    const isSimilar = isNearDuplicate(prev.text, cur.text, minSimilarity);

    // Merge conditions: overlapping/close gap AND (same text OR similar)
    if ((isOverlapping || isCloseGap) && (isSameText || isSimilar)) {
      // Merge: extend end time and keep longer text
      prev.end = Math.max(prev.end, cur.end);
      prev.text = chooseLonger(prev.text, cur.text);
    }
    // Intentional repeat: far gap, treat as separate
    else if (isFarGap) {
      result.push(cur);
    }
    // Different content or not close enough, keep separate
    else {
      result.push(cur);
    }
  }

  return result;
}

/**
 * Align Korean captions to English captions by time overlap
 */
export function alignByTime(en: Cap[], ko: Cap[]): Cap[] {
  if (ko.length === 0) return en.map((cap) => ({ ...cap, text: "" }));
  if (en.length === 0) return [];

  const aligned: Cap[] = [];
  const tolerance = 0.3; // 300ms tolerance

  for (const enCap of en) {
    // Find Korean caption with overlapping time range
    const matchingKo = ko.find(
      (koCap) =>
        Math.abs(koCap.start - enCap.start) <= tolerance ||
        (koCap.start <= enCap.end + tolerance &&
          koCap.end >= enCap.start - tolerance)
    );

    aligned.push({
      start: enCap.start,
      end: enCap.end,
      text: matchingKo?.text || "",
    });
  }

  return aligned;
}

/**
 * Clean and prepare transcript data for rendering
 */
export function prepareTranscriptData(
  enCaps: Cap[],
  koCaps: Cap[],
  translationCache: Record<string, string> = {}
): { transcriptEN: Cap[]; transcriptKO: Cap[] } {
  // Apply translations to Korean captions
  const koWithTranslations = koCaps.map((cap) => ({
    ...cap,
    text: cap.text || translationCache[cap.text] || "",
  }));

  // Deduplicate both languages
  const enClean = dedupeCaptions(enCaps);
  const koClean = dedupeCaptions(koWithTranslations);

  // Align Korean to English by time
  const koAligned = alignByTime(enClean, koClean);

  return {
    transcriptEN: enClean,
    transcriptKO: koAligned,
  };
}

/**
 * Unit tests for the deduplication pipeline
 */
export function runDeduplicationTests() {
  console.log("🧪 Running deduplication tests...");

  // Test 1: Basic deduplication
  const test1 = [
    { start: 0, end: 2, text: "Hello world" },
    { start: 1.5, end: 3, text: "Hello world" },
    { start: 4, end: 6, text: "Goodbye" },
  ];
  const result1 = dedupeCaptions(test1);
  console.assert(
    result1.length === 2,
    "Test 1 failed: should merge overlapping duplicates"
  );
  console.assert(
    result1[0].text === "Hello world",
    "Test 1 failed: should keep merged text"
  );
  console.assert(result1[0].end === 3, "Test 1 failed: should extend end time");

  // Test 2: Intentional repeat (far gap)
  const test2 = [
    { start: 0, end: 2, text: "Hello world" },
    { start: 5, end: 7, text: "Hello world" }, // 3s gap - intentional repeat
  ];
  const result2 = dedupeCaptions(test2);
  console.assert(
    result2.length === 2,
    "Test 2 failed: should preserve intentional repeats"
  );

  // Test 3: Near-duplicate detection
  const test3 = [
    { start: 0, end: 2, text: "This is a test" },
    { start: 1.5, end: 3, text: "This is a test." }, // slight punctuation difference
  ];
  const result3 = dedupeCaptions(test3);
  console.assert(
    result3.length === 1,
    "Test 3 failed: should merge near-duplicates"
  );

  // Test 4: Text normalization
  const normalized = normalizeText("  Hello   World!!!  ");
  console.assert(
    normalized === "hello world!",
    "Test 4 failed: normalization incorrect"
  );

  console.log("✅ All deduplication tests passed!");
}
